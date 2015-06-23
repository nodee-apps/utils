'use strict';

var fs = require('fs'),
    path = require('path'),
    object = require('./object.js');

/*
 * Load Error extensions
 */
require('./error.js');

/*
 * Set of helpers for working with files
 */
module.exports = {
    resolve: resolve,
    existsOrCreate: existsOrCreate,
    existsOrCreateSync: existsOrCreateSync,
    copydirRecursive: copydirRecursive,
    rmdirRecursive: rmdirRecursive,
    requireAsync: requireAsync,
    requireSync: requireSync,
    checkExistsName: checkExistsName,
    writeFile: writeFile,
    readFile: readFile,
    walkdirRecursive: walk,
    getFileInfo: getFileInfo,
    watchRecursive: watchRecursive,
    unwatch: unwatch,
    unwatchAll: unwatchAll
};

/**
 * resolve paths and get path, dir, file, ext
 * @param {Array/String} paths string or array of paths to resolve
 * @returns {Object}  fullPath, dirName, fileName, extName
 */
function resolve(paths){
    paths = Array.isArray(paths) ? paths : [ paths ];
    var fullPath = path.resolve.apply(this, paths).replace(/\\/g, '/');
    
    return {
        fullPath: fullPath,
        dirName: path.dirname(fullPath),
        fileName: path.basename(fullPath),
        extName: path.extname(fullPath).replace('.','')
    };
}

/**
 * check if folder or file exists, if not create it
 * @param {String} filePath file path or array of paths to resolve
 * @param {Object} opts aditional options when creating file or directory (encoding, data, mode, replace, isFile) - use isFile when creating file with no extension, or folder with dot inside
 * @param {Function} cb callback(err) 
 */
function existsOrCreate(filePath, opts, cb){
    if(arguments.length===2){
        cb = arguments[1];
        opts = {};
    }
    opts.encoding = opts.encoding || 'utf8';
    opts.data = opts.data || opts.content || '';
    opts.mode = opts.mode || 777;
    
    var fp = resolve(filePath);
    var isFile = opts.hasOwnProperty('isFile') ? opts.isFile : !!fp.extName;
    
    fs.exists(fp.fullPath, function(exists){
        if(exists && !opts.replace) cb();
        else {
            
            // file doesn't exists, create folder first
            mkdirp((isFile ? fp.dirName : fp.fullPath), opts.mode, function(err) {
                if (err) cb(new Error('fsExt.existsOrCreate: creating folders failed').cause(err));
                else if(isFile || opts.replace){
                    
                    // folders are created, so create file
                    fs.writeFile(fp.fullPath, opts.data, opts.encoding, function(err){
                        if (err) cb(new Error('fsExt.existsOrCreate: creating file failed').cause(err));
                        else cb();
                    });
                }
                else cb();
            });
        }
    });
}

/**
 * sync version of existsOrCreate
 * @param {String} filePath
 * @param {Object} opts options
 */
function existsOrCreateSync(filePath, opts){
    opts = opts || {};
    opts.encoding = opts.encoding || 'utf8';
    opts.data = opts.data || opts.content || '';
    opts.mode = opts.mode || 777;
    
    var fp = resolve(filePath);
    var isFile = opts.hasOwnProperty('isFile') ? opts.isFile : !!fp.extName;
    
    if(!fs.existsSync(fp.fullPath) || opts.replace){
        mkdir((isFile ? fp.dirName : fp.fullPath));
        if(isFile || opts.replace) fs.writeFileSync(fp.fullPath, opts.data, opts.encoding);
    }
    
    function mkdir(fullPath){
        if(fs.existsSync(fullPath)) return;
        else {
            var parentPath = fullPath.split('/');
            parentPath.pop();
            mkdir(parentPath.join('/'));
            fs.mkdirSync(fullPath, opts.mode);
        }
    }
}

/**
 * _fileWatchers object, to disable duplicate watch
 * @type {Object}
 */
var _fileWatchers = {};

/**
 * Unwatching file
 * @param {String} filePath
 */
function unwatch(filePath){
    filePath = path.resolve(filePath);
    if(_fileWatchers[filePath]) _fileWatchers[filePath].close();
    delete _fileWatchers[filePath];
}

/**
 * Unwatching all files and folders
 */
function unwatchAll(){
    for(var filePath in _fileWatchers) {
        if(_fileWatchers[filePath]) _fileWatchers[filePath].close();
        delete _fileWatchers[filePath];
    }
    
    for(var dirPath in _dirWatchers) {
        if(_dirWatchers[dirPath]) _dirWatchers[dirPath].close();
        delete _dirWatchers[dirPath];
    }
}

/**
 * async required modules cache 
 * @type {Object}
 */
var _modules = {};

/**
 * async alternative to nodejs require, if opts.watch===true resolve module cache on file change
 * @param {String} filePath path
 * @param {Object} opts
 * @param {Function} callback (err, module)
 */
function requireAsync(filePath, opts, cb) {
    if(arguments.length === 2){
        cb = arguments[1];
        opts = {};
    }
    filePath = path.resolve(filePath);
    opts.encoding = opts.encoding || 'utf8';
    // opts.watch - if true, watcher will be set
    // opts.isJson - if true, use json parse, instead of eval
    // opts.jsonParse - custom json parse function
    
    // set watch, if requireWatch is run first time
    if(!_fileWatchers[filePath] && opts.watch) {
        try {
            _fileWatchers[filePath] = fs.watch(filePath)
            .on('change', function(){
                // delete require.cache[require.resolve(filePath)];
                delete _modules[filePath];
            }).on('error', function(){
                this.close();
                _fileWatchers[filePath] = null;
            });
        }
        catch(err){
            return cb(new Error('fsExt.requireAsync: setup file watch failed').details({ filePath:filePath, cause:err }));
        }
    }
    
    if(!_modules[filePath]){
        fs.readFile(filePath, { encoding: opts.encoding }, function(err, data) {
            var loadingModule = {
                exports: {},
                module:{ exports:{} }
            };
            
            if(err) return cb(new Error('fsExt.requireAsync: reading file failed').details({ filePath:filePath, cause:err }));
            else if(opts.isJson){
                try {
                    loadingModule.exports = JSON.parse(data, opts.jsonParse);
                }
                catch(err){
                    return cb(new Error('fsExt.requireAsync: parsing json data failed').details({ filePath:filePath, cause:err }));
                }
            }
            else {
                var code = '(function (module) {' + data + '})(loadingModule);';
                try {
                    eval(code);
                }
                catch(err) {
                    return cb(new Error('fsExt.requireAsync: eval data failed').details({ filePath:filePath, cause:err }));
                }
            }
            
            _modules[filePath] = loadingModule.exports || loadingModule.module.exports;
            return cb(null, _modules[filePath]);
        });
        
    }
    else cb(null, _modules[filePath]);
}

/**
 * nodejs require, if opts.watch===true resolve module cache on file change
 * @param {String} filePath path
 * @param {Object} opts
 */
function requireSync(filePath, opts) {
    filePath = path.resolve(filePath);
    opts.encoding = opts.encoding || 'utf8';
    // opts.watch - if true, watcher will be set
    // opts.isJson - if true, use json parse, instead of eval
    // opts.jsonParse - custom json parse function
    
    // set watch, if requireWatch is run first time
    if(!_fileWatchers[filePath] && opts.watch) {
        try {
            _fileWatchers[filePath] = fs.watch(filePath)
            .on('change', function(){
                // delete require.cache[require.resolve(filePath)];
                delete _modules[filePath];
            }).on('error', function(){
                this.close();
                _fileWatchers[filePath] = null;
            });
        }
        catch(err){
            throw new Error('fsExt.requireAsync: setup file watch failed').details({ filePath:filePath, cause:err });
        }
    }
    
    if(!_modules[filePath]){
        var data;
        var loadingModule = {
            exports: {},
            module:{ exports:{} }
        };
        
        try {
            data = fs.readFileSync(filePath, opts.encoding);
        }
        catch(err){
            throw new Error('fsExt.requireSync: reading file failed').details({ filePath:filePath, cause:err });
        }
        
        if(opts.isJson){
            try {
                loadingModule.exports = JSON.parse(data, opts.jsonParse);
            }
            catch(err){
                throw new Error('fsExt.requireSync: parsing json data failed').details({ filePath:filePath, cause:err });
            }
        }
        else {
            var code = '(function (module) {' + data + '})(loadingModule);';
            try {
                eval(code);
            }
            catch(err) {
                throw new Error('fsExt.requireSync: eval data failed').details({ filePath:filePath, cause:err });
            }
        }
        
        _modules[filePath] = loadingModule.exports || loadingModule.module.exports;
        return _modules[filePath];
    }
    else return _modules[filePath];
}

/**
 * check if file or path already exists, and append number "_(1)"
 * @param {String} filePath full path
 * @param {Boolean} isDir
 * @param {Function} callback
 * @param {Number} count
 */
function checkExistsName(filePath, isDir, callback, count){ // callback(err, fullPath)
    if(typeof callback !== 'function') throw new Error('Wrong arguments');
    var pathInfo = resolve(filePath), newFullPath, oldName;
    count = count || 1;
    
    fs.exists(pathInfo.fullPath, function(exists){
        if(!exists) callback(null, pathInfo.fullPath);
        else { // generate new file or dir name, and try again
            oldName = count>1 ? '('+(count-1)+')' : '';
            if(isDir) {
                newFullPath = pathInfo.fullPath.replace(new RegExp(oldName.escape()+'$'),'') + '(' +count+ ')';
            }
            else {
                oldName = oldName + '.' + pathInfo.extName;
                newFullPath = pathInfo.fullPath.replace(new RegExp(oldName.escape()+'$'), '(' +count+ ').' + pathInfo.extName);
            }
            checkExistsName(newFullPath, isDir, callback, count+1);
        }
    });
}

/**
 * very simple write repeater, when gets error, try repeat after 500ms, but max 5 times
 * @param {String} filePath
 * @param {String} data to write to file
 * @param {Function} callback(err)
 */
function writeFile(filePath, data, callback, count){ // callback(err)
    if(typeof callback !== 'function') throw new Error('Wrong arguments');
    filePath = path.resolve(filePath);
    
    count = count || 0;
    var maxLimit = 5; // 5 * 500ms = 2,5s
    
    fs.writeFile(filePath, data, function(err) {
        if(err) {
            if(count >= maxLimit) callback(new Error('fsExt.writeFile: max repeat limit reached').cause(err)); // repeat limit reached
            else setTimeout(function(){
                writeFile(filePath, data, callback, count + 1);
            }, 500);
        }
        else callback();
    });
}

/**
 * very simple read repeater, when gets error, try repeat after 500ms, but max 5 times
 * @param {String} filePath
 * @param {Function} callback(err, data)
 */
function readFile(filePath, opts, callback, count){ // callback(err)
    if(arguments.length===2){
        callback = arguments[1];
        opts = null;
    }
    if(typeof callback !== 'function') throw new Error('Wrong arguments');
    
    filePath = path.resolve(filePath);
    count = count || 0;
    var maxLimit = 5; // 5 * 500ms = 2,5s
    
    fs.readFile(filePath, opts, function(err, data) {
        if(err) {
            if(count >= maxLimit) callback(new Error('fsExt.readFie: max repeat limit reached').cause(err)); // repeat limit reached
            else setTimeout(function(){
                readFile(filePath, opts, callback, count + 1);
            }, 500);
        }
        else callback(null, data);
    });
}

/*
 * borrowed from: https://github.com/ryanmcgrath/wrench-js/blob/master/lib/wrench.js
 * wrench.rmdirRecursive("directory_path", callback);
 *
 * Recursively dives through directories and obliterates everything about it.
 */
function rmdirRecursive(dir, clbk){
    dir = resolve(dir).fullPath;
    
    if(clbk === null || typeof clbk === 'undefined') clbk = function(err) {};
    fs.readdir(dir, function(err, files) {
        if(err) return clbk(err);
        if(!files) return clbk(new Error('fsExt.rmdirRecursive: removing folders failed, folder not exists'));
        
        (function rmFile(err){
            if(err) return clbk(err);
            var filename = files.shift();
            if(filename === null || typeof filename === 'undefined') return fs.rmdir(dir, clbk);
            var file = dir+'/'+filename;
            
            fs.lstat(file, function(err, stat){
                if(err) return clbk(err);
                if(stat.isDirectory()) rmdirRecursive(file, rmFile);
                else fs.unlink(file, rmFile);
            });
        })();
    });
}

/*
 * borrowed from: https://github.com/ryanmcgrath/wrench-js/blob/master/lib/wrench.js
 * wrench.copyDirRecursive("directory_to_copy", "new_location", {forceDelete: bool}, callback);
 *
 * Recursively dives through a directory and moves all its files to a new
 * location. Specify forceDelete to force directory overwrite.
 *
 * Note: Directories should be passed to this function without a trailing slash.
 */
function copydirRecursive(srcDir, newDir, opts, clbk) {
    var originalArguments = Array.prototype.slice.apply(arguments);
    srcDir = resolve(srcDir).fullPath;
    newDir = resolve(newDir).fullPath;
    
    if(typeof arguments[ arguments.length-1 ] !== 'function' || arguments.length < 3) throw new Error('Wrong arguments');
    else if(arguments.length===3){
        clbk = arguments[2];
        opts = {};
    }
    
    fs.stat(newDir, function(err, newDirStat) {
        if(!err) {
            if(opts.forceDelete)
                return exports.rmdirRecursive(newDir, function(err) {
                    copydirRecursive.apply(this, originalArguments);
                });
            else
                return clbk(new Error('You are trying to delete a directory that already exists. Specify forceDelete in an options object to override this.'));
        }
        
        fs.stat(srcDir, function(err, srcDirStat){
            if (err) return clbk(err);
            fs.mkdir(newDir, srcDirStat.mode, function(err){
                if (err) return clbk(err);
                fs.readdir(srcDir, function(err, files){
                    if (err) return clbk(err);
                    (function copyFiles(err){
                        if (err) return clbk(err);
                        var filename = files.shift();
                        if (filename === null || typeof filename === 'undefined') return clbk(null);
                        
                        var file = srcDir+'/'+filename,
                        newFile = newDir+'/'+filename;
                        fs.stat(file, function(err, fileStat){
                            if (err) return clbk(err);
                            if (fileStat.isDirectory()) copydirRecursive(file, newFile, copyFiles, clbk);
                            else if (fileStat.isSymbolicLink()) fs.readlink(file, function(err, link){
                                if (err) return clbk(err);
                                fs.symlink(link, newFile, copyFiles);
                            });
                            else fs.readFile(file, function(err, data){
                                if (err) return clbk(err);
                                fs.writeFile(newFile, data, copyFiles);
                            });
                        });
                    })();
                });
            });
        });
    });
}

/*
 * borrowed from https://github.com/substack/node-mkdirp
 *
 * @example:
 * mkdirp('/tmp/foo/bar/baz', function (err) {
 *      if (err) console.error(err)
 *       else console.log('pow!')
 *   });
 */
function mkdirp(p, opts, f, made) {
    if (typeof opts === 'function') {
        f = opts;
        opts = {};
    }
    else if (!opts || typeof opts !== 'object') {
        opts = { mode: opts };
    }
    var mode = opts.mode;
    var xfs = opts.fs || fs;
    if (mode === undefined) {
        mode = 777 & (~process.umask());
    }
    if (!made) made = null;
    var cb = f || function () {};
    p = path.resolve(p);
    xfs.mkdir(p, mode, function (er) {
        if (!er) {
            made = made || p;
            return cb(null, made);
        }
        switch (er.code) {
            case 'ENOENT':
                mkdirp(path.dirname(p), opts, function (er, made) {
                    if (er) cb(er, made);
                    else mkdirp(p, opts, cb, made);
                });
                break;
            
            // In the case of any other error, just see if there's a dir
            // there already. If so, then hooray! If not, then something
            // is borked.
            default:
                xfs.stat(p, function (er2, stat) {
                    // if the stat fails, then that's super weird.
                    // let the original error be the failure reason.
                    if (er2 || !stat.isDirectory()) cb(er, made)
                    else cb(null, made);
                });
                break;
        }
    });
}

/**
 * recursive walk folder
 * @param {String} dir directory
 * @param {Object} opts walk options - include/exclude file extensions
 * @param {Function} done callback(err, array)
 * @param {String} rootDir used when walking recursively, do not use this argument
 * @param {Integer} level actual level in tree
 * @returns {String} resolved dir
 */
function walk(dir, opts, done, rootDir, level) { // done(err, result)
    if(arguments.length === 2) {
        done = arguments[1];
        opts = { levels: null };
    }
    
    if(typeof done !== 'function') throw new Error('Wrong arguments');
    if(!rootDir) dir = resolve(dir).fullPath;
    level = level || 1;
    
    var maxRepeat = opts.maxRepeat || 5;
    var repeatInterval = opts.repeatInterval || 200;
    
    //if(dir.substring(dir.length-1, dir.length) === '/')
    //    dir = dir.substring(0, dir.length-1); // remove last '/'
    
    var include = opts.include || [];
    //var exclude = opts.exclude || []; - not implemented
    
    var results = {};
    var pending = 0;
    
    fs.readdir(dir, function(err, list) {
        if(err && err.code === 'ENOENT') return {}; // directory removed, just return empty result 
        else if(err) return done(new Error('fsExt.walkdirRecursive: readdir failed').cause(err));
        
        if(!rootDir && opts.includeRootDir) { // undefined rootDir means this is parent dir
            list.unshift(dir);
        }
        pending = list.length;
        if (!pending) return done(null, results);
        
        rootDir = rootDir || dir;
        
        if(list.length===0) done(null, results);
        else list.forEach(function(file) {
            if(file!==rootDir){
                file = dir + '/' + file;
                file = file.replace(/\\/g, '/');
            }
            
            var baseDir = rootDir;
            if(opts.includeRootDir) { 
                baseDir = baseDir.split('/');
                baseDir.pop();
                baseDir = baseDir.join('/');
            }
            var fileId = file.replace(baseDir + '/', '');
            getStats(file, fileId, done);
        });
    });
    
    function getStats(file, fileId, done, repeated){
        repeated = repeated || 0;
        fs.stat(file, function(err, stat) {
            if(err && err.code === 'ENOENT') { // directory or file removed, just skip it
                if(!--pending) done(null, results);
            }
            else if(err && repeated >= maxRepeat) {
                pending = 0;
                return done(err);
            }
            else if(err) return setTimeout(function(){
                getStats(file, fileId, done, repeated++);
            }, repeatInterval);
            
            if(!stat){
                if(!--pending) done(null, results);
            }
            else if(stat.isDirectory()) {
                results[fileId] = getFileItem(fileId, stat, file);
                if(file!==rootDir && (!opts.levels || opts.levels>=level+1)) walk(file, opts, function(err, res) {
                    if(err) return done(err);
                    
                    for(var key in res) {
                        results[key] = res[key];
                    }
                    if (!--pending) done(null, results);
                }, rootDir, level+1);
                else if(!--pending) done(null, results); 
            }
            else {
                var fileExt = getExt(fileId);
                if(include.length > 0 && include.indexOf(fileExt) !== -1)
                    results[fileId] = getFileItem(fileId, stat, file);
                else if(include.length === 0)
                    results[fileId] = getFileItem(fileId, stat, file);
                if(!--pending) done(null, results);
            }
            
        });
    }
    
    return dir;
}

/**
 * get resolved file info & stats
 * @param {String} fileId
 * @param {String} fullPath
 * @param {Function} cb
 * @param {Integer} repeated
 */
function getFileInfo(fileId, filePath, cb, repeated){ // cb(err, fileInfo)
    repeated = repeated || 0;
    var fullPath = resolve(filePath).fullPath;
    
    fs.exists(fullPath, function(exists){
        if(!exists) cb();
        else fs.stat(fullPath, function(err, stat){
            if(err && err.code === 'ENOENT') { // directory or file removed, just skip it
                cb();
            }
            else if(err && repeated < 5) setTimeout(function(){
                getFileInfo(fileId, fullPath, cb, repeated+1);
            }, 200);
            else if(err) cb(err);
            else cb(null, getFileItem(fileId, stat, fullPath));
        });
    });
}


/**
 * helper - create ancestors list from path
 * @param {String} filename
 * @returns {Array}  ancestors list
 */
function getPathAncestors(filename){
    var tree = filename.split('/');
    tree.pop(); // remove last
    
    var treePath = [];
    for(var i=0;i<tree.length;i++){
        treePath.push(createId(tree, i));
    }
    
    function createId(tree, count){
        var id = '';
        for(var i=0;i<=count;i++){
            id += (i>0 ? '/' : '') + tree[i];
        }
        return id;
    }
    
    return treePath;
}

/**
 * helper - extract name from fileId
 * @param {String} fileId
 * @param {Boolean} isFile
 * @returns {String}  file name
 */
function getName(fileId, isFile){
    var splitted = fileId.split('/'); // get filename
    var filename = splitted[splitted.length - 1]; // get file name
    if(!isFile) return filename;
    
    filename = filename.split('.');
    if(filename.length === 1) return filename[0]; // file has no extension
    filename.pop(); // remove extension if it has one
    return filename.join('.');
}

/**
 * helper - extract file extension from file name
 * @param {String} filename
 * @returns {String}  file extension
 */
function getExt(filename){
    var splitted = filename.split('.');
    if(splitted.length === 1) return ''; // file has no extension
    return splitted[splitted.length - 1]; // get file extension
}

/**
 * helper - sumarize file info
 * @param {String} fileId
 * @param {Object} stat fsStat object
 * @param {String} filePath
 * @returns {Object}  file info object
 */
function getFileItem(fileId, stat, filePath){
    return {
        id:fileId,
        fullPath: filePath,
        name: getName(fileId, !stat.isDirectory()),
        ancestors: getPathAncestors(fileId),
        isDir:stat.isDirectory(),
        isFile:!stat.isDirectory(),
        ext:!stat.isDirectory() ? getExt(fileId) : null,
        modifiedDT: stat.mtime,
        createdDT: stat.ctime,
        size: stat.size
    };
}

/**
 * _dirWatchers object, to disable duplicate watch
 * @type {Object}
 */
var _dirWatchers = {};

/**
 * watching directory recursive
 * @param {String} dir root dir to watch
 * @param {Object} opts watch / walk options
 * @param {Function} onChange fired when change
 * @param {Function} cb executed when all watchers are set
 */
function watchRecursive(dir, opts, onChange, cb, repeated){ // cb(err, files)
    if(arguments.length === 3) {
        cb = arguments[2];
        onChange = arguments[1];
        opts = {};
    }
    opts = object.extend({}, opts || {}, { includeRootDir:true });
    if(typeof cb !== 'function') throw new Error('Wrong arguments');
    
    var maxRepeats = 5;
    repeated = repeated || 0;
    
    // walk dir and setup watchers
    dir = walk(dir, opts, function(err, items){
        // sometimes, when setuping watch right after moving, or renaming "EPERM" error may occur, just wait and try again
        if(err && err.code === 'EPERM'){
            if(repeated < maxRepeats) setTimeout(function(){
                watchRecursive(dir, opts, onChange, cb, repeated+1);
            }, 100);
            else cb(new Error('fsExt.watchRecursive: exploring folder failed').cause(err));
        }
        else if(err) {
            cb(new Error('fsExt.watchRecursive: exploring folder failed').cause(err));
        }
        else {
            watchDir(dir, items, cb);
        }
    }, opts.rootDir);
    
    function watchDir(dir, items, done){
        for(var key in items){
            if(items[key].isDir && !_dirWatchers[ items[key].fullPath ]) { // avoid duplicite watchers
                // set dir watch
                try {
                    var item = items[key];
                    
                    _dirWatchers[ item.fullPath ] = fs.watch(item.fullPath)
                    .on('change', function(op, fileName){
                        var onChangeOpts = object.extend({}, opts, { rootDir: opts.rootDir||dir }),
                            watcher = this;
                            
                        watchRecursive(watcher.fullPath, onChangeOpts, onChange, function(err, descendants){
                            if(err && err.code==='ENOENT') return;
                            else if(err) onChange(new Error('fsExt.watchRecursive onChange: setup nested watch failed').cause(err));
                            else {
                                var changes = compareDirFiles(watcher.id, watcher.children, descendants);
                                
                                // remove watchers if whole folder is removed
                                for(var i=0;i<changes.length;i++){
                                    if(changes[i].event === 'removed' && changes[i].file.isDir){
                                        delete _dirWatchers[changes[i].file.fullPath];
                                    }
                                }
                                
                                if(changes.length) onChange(null, changes);
                            }
                        });
                        
                    }).on('error', function(err){
                        this.close();
                        _dirWatchers[ this.fullPath ] = null;
                    });
                    
                    object.extend(_dirWatchers[ item.fullPath ], { children: getDirChildren(item.id, items) }, item);
                }
                catch(err){
                    return done(new Error('fsExt.watchRecursive: setup watcher failed').cause(err));
                }
            }
        }
        done(null, items);
    }
}


/**
 * helper - get only direct children of directory
 * @param {String} parentId directory id
 * @param {Object} items files
 * @returns {Object}  children
 */
function getDirChildren(parentId, items){
    var children = {};
    for(var id in items){
        if(items[id].ancestors[ items[id].ancestors.length-1 ] === parentId)
            children[id] = items[id];
    }
    return children;
}

/**
 * comparing old dir children and new dir children - executed on change event
 * @param {String} parentId directory id
 * @param {Object} old_children old directory children
 * @param {Object} descendants directory descendants
 * @returns {Array}  recognized changes
 */
function compareDirFiles(parentId, old_children, descendants){
    var changes = [],
        not_found = object.extend({}, old_children);
    
    for(var id in descendants) {
        if(descendants[id].ancestors[ descendants[id].ancestors.length-1 ] === parentId) { // compare only direct children
            
            if(!old_children[id]) { // not found in current children - created
                changes.push({ event:'created', file:descendants[id] });
                old_children[id] = descendants[id];
            }
            else if(old_children[id].modifiedDT < descendants[id].modifiedDT) { // found and updated
                changes.push({ event:'updated', file:descendants[id] });
                old_children[id] = descendants[id];
                delete not_found[id];
            }
            else { // file found, not not updated
                delete not_found[id];
            }
        }
    }
    
    // removed files
    for(var id in not_found) {
        changes.push({ event:'removed', file:not_found[id] });
        delete old_children[id];
    }
    
    return changes;
}