'use strict';

var assert = require('assert'),
    async = require('../lib/async.js');

/*
 * run tests
 */
testSeries();
testSeriesProtection();
testSeriesPromise();
testParallel();
testParallelProtection();

/*
 * async Series exec queue
 */
function testSeries() {
    var varArg;
    var arg3 = 'arg3';
    var execOrder = [];
    var s = new async.Series();
    
    s.add(function(next){
        setTimeout(function(){
            execOrder.push('s1');
            varArg = 'changedin_s1';
            next(null);
        },200);
    })
    .add(['arg1', 'arg2'], arg3, function(args, arg3in, next){
        setTimeout(function(){
            execOrder.push('s2');
            assert.deepEqual(['arg1', 'arg2'], args);
            assert.deepEqual('arg3', arg3in);
            assert.deepEqual('changedin_s1', varArg);
            next();
        }, 50);
    })
    .add(function(next){
        setTimeout(function(){
            execOrder.push('s3');
            next(undefined);
        }, 10);
    });
    
    for(var i=4;i<6;i++){
        s.add(i, function(c, next){
            setTimeout(function(){
                execOrder.push('s' + c);
                next();
            }, 0);
        });
    }
    
    s.execute(function(){
        // check execution order
        assert.deepEqual(['s1', 's2', 's3', 's4', 's5'], execOrder);
        console.log('async.Series - OK');
    });
    
    // check if it is really async
    assert.deepEqual([], execOrder);
}

/*
 * test Series mistakes protections
 */
function testSeriesProtection(){
    
    var s1 = new async.Series(true); // run series as sync callbacks to catch error
    s1.add(function(next){
        next();
    });
    s1.add(function(next){
        next();
        next(); // will throw exteption, it is dangerous to run next twice
    });
    
    var executed = false;
    try {
        s1.execute(function(err){
            // will not run
            if(executed) throw new  Error('This shouldn\'t be executed more than one time');
            executed = true;
        });
    }
    catch(err){
        assert.ok(err.message === 'Async Series: cannot execute next() more than once per function');
    }
    
    var s2 = new async.Series();
    s2.add(function(next){
        next(new Error('local error'));
    });
    
    s2.add(function(next){
        throw new  Error('This shouldn\'t be executed');
        // will not run due to err param in first func
    });
    
    s2.execute(function(err){
        assert.ok(err.message === 'local error');
        console.log('async.Series mistakes protection - OK');
    });
}

/*
 * async Series promise
 */
function testSeriesPromise(){
    
    var fncOrder = [];
    var promise = async.Series.promise(function(promise){
        promise.fulfill('promise error', 'promised value');
    });
    
    assert.ok(promise.isPending);
    assert.ok(!promise.isFulfilled);
    assert.ok(!promise.error);
    assert.ok(!promise.value);
    
    promise.then(function(promise, next){
        fncOrder.push('then1');
        assert.ok(!promise.isPending);
        assert.ok(promise.isFulfilled);
        assert.ok(promise.error === 'promise error');
        assert.ok(promise.value === 'promised value');
        next();
    });
    
    promise.then(function(promise, next){
        fncOrder.push('then2');
        assert.ok(!promise.isPending);
        assert.ok(promise.isFulfilled);
        assert.ok(promise.error === 'promise error');
        assert.ok(promise.value === 'promised value');
        next();
    });
    
    promise.done(function(promise){
        fncOrder.push('done');
        assert.ok(!promise.isPending);
        assert.ok(promise.isFulfilled);
        assert.ok(promise.error === 'promise error');
        assert.ok(promise.value === 'promised value');
        
        assert.deepEqual(fncOrder, ['then1','then2','done']);
        console.log('async.Series.promise - OK');
    });
}

/*
 * async Parallel exec queue
 */
function testParallel() {
    var arg3 = 'arg3';
    var execOrder = [];
    var p = new async.Parallel();
    p.add(function(next){
        setTimeout(function(){
            execOrder.push('p1');
            next();
        },200);
    })
    .add(['arg1', 'arg2'], arg3, function(args, arg3in, next){
        setTimeout(function(){
            execOrder.push('p2');
            assert.deepEqual(['arg1', 'arg2'], args);
            assert.deepEqual('arg3', arg3in);
            next();
        }, 100);
    })
    .add(function(next){
        setTimeout(function(){
            execOrder.push('p3');
            next();
        }, 50);
    });
    
    for(var i=4;i<6;i++){
        p.add(i, function(c, next){
            setTimeout(function(){
                execOrder.push('p' + c);
                next();
            }, 20-2*c);
        });
    }
    
    p.execute(function(){
        // check execution order
        assert.deepEqual(['p5', 'p4', 'p3', 'p2', 'p1'], execOrder);
        console.log('async.Parallel - OK');
    });
    
    // check if it is really async
    assert.deepEqual([], execOrder);   
}

/*
 * test Parallel mistakes protections
 */
function testParallelProtection(){
    
    var p1 = new async.Parallel(true); // run series as sync callbacks to catch error
    p1.add(function(next){
        next();
    });
    p1.add(function(next){
        next();
        next(); // will throw exteption, it is dangerous to run next twice
    });
    
    var executed = false;
    try {
        p1.execute(function(err){
            // will not run
            if(executed) throw new  Error('This shouldn\'t be executed more than one time');
            executed = true;
        });
    }
    catch(err){
        assert.ok(err.message === 'Async Parallel: cannot execute next() more than once per function');
    }
    
    var p2 = new async.Parallel();
    p2.add(function(next){
        try {
            next(new Error('local error'));
        }
        catch(err){
            assert.ok(err.message === 'Async Parallel: next() callback do not accept any arguments,' +
                         ' because of parallel behaviour, it cannot stop executing on error argument in callback');
            
            console.log('async.Parallel mistakes protection - OK');
        }
    });
    
    p2.execute(function(){
        throw new  Error('This shouldn\'t be executed');
        // will not run due to param in first func
    });
}

