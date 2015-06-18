'use strict';

var assert = require('assert'),
    async = require('../../lib/async.js'),
    fs = require('fs'),
    path = require('path'),
    fsExt = require('../../lib/fsExt.js');
    
/*
 * run tests
 */
testWatchers(testFsExt);



/*
 * test fsExt walkdirRecursive, writeFile, readFile, watchRecursive
 */
function testWatchers(cb){
    
    fsExt.walkdirRecursive('./test_folder', function(err, data){
        if(err) throw err;
        
        assert.ok(!!data['test_walk']);
        assert.deepEqual(data['test_walk'].ancestors, []);
        
        assert.ok(!!data['test_walk/file.txt']);
        assert.deepEqual(data['test_walk/file.txt'].ancestors, [ 'test_walk' ]);
        
        assert.ok(!!data['test_walk/sub_test_walk']);
        assert.deepEqual(data['test_walk/sub_test_walk'].ancestors, [ 'test_walk' ]);
        
        assert.ok(!!data['test_walk/sub_test_walk/sub_file.txt']);
        assert.deepEqual(data['test_walk/sub_test_walk/sub_file.txt'].ancestors, [ 'test_walk', 'test_walk/sub_test_walk' ]);
        
        var change_event;
        
        function onChange(err, changes){
            if(err) throw err;
            
            // TODO: test changes
            //console.warn(changes);
        }
        
        fsExt.watchRecursive('./test_folder', onChange, function(err, files){
            if(err) throw err;
            
            //console.warn(files);
            cb();
        });
        
    });
}

/*
 * test remaining fsExt methods
 */
function testFsExt(){
    
    // create recursive
    fsExt.existsOrCreate('./test_folder/subfolder/file.json', { data:'[]', replace:false }, function(err){
        if(err) throw err;
        
        fsExt.copydirRecursive('./test_folder/subfolder', './test_folder/subfolder_copy', function(err){
            if(err) throw err;
            
            // copy folder and file should exists
            assert.ok(fs.existsSync('./test_folder/subfolder_copy'));
            assert.ok(fs.existsSync('./test_folder/subfolder_copy/file.json'));
            
            fsExt.rmdirRecursive('./test_folder/subfolder_copy', function(err){
                if(err) throw err;
                
                // copy folder should'not exists any more
                assert.ok(!fs.existsSync('./test_folder/subfolder_copy'));
                
                // watch require json file
                fsExt.requireAsync('./test_folder/subfolder/file.json', { watch:true, isJson:true }, function(err, data){
                    if(err) throw err;
                    assert.deepEqual(data, []);
                    
                    // update json file
                    fsExt.existsOrCreate('./test_folder/subfolder/file.json', { data:'["updated"]', replace:true }, function(err){
                        if(err) throw err;
                        
                        fsExt.writeFile('./test_folder/subfolder/file2.json', '{some data}', function(err){
                            if(err) throw err;
                            
                            setTimeout(function(){
                                fsExt.requireAsync('./test_folder/subfolder/file.json', { watch:true, isJson:true }, function(err, data){
                                    if(err) throw err;
                                    assert.deepEqual(data, ['updated']);
                                    
                                    // remove folder
                                    fsExt.rmdirRecursive('./test_folder/subfolder', function(err){
                                        if(err) throw err;
                                        
                                        setTimeout(function(){
                                            fsExt.requireAsync('./test_folder/subfolder/file.json', { watch:true, isJson:true }, function(err, data){
                                                assert.ok(err.code === 'ENOENT');
                                                
                                                // folder should'not exists any more
                                                assert.ok(!fs.existsSync('./test_folder/subfolder'));
                                                
                                                console.log('fsExt - OK');
                                            });
                                        }, 100);
                                    });
                                });
                            }, 100);
                        });
                    });
                
                });
            });
        });
    });
}

