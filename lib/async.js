'use strict';


module.exports = {
    Series: Series,
    Parallel: Parallel
};

/*
 * helper for getting asyncFncWrapper
 * @param {Object} asyncFncWrapper Description
 * @returns {Object}  Description
 */
function getAsyncFncWrapper(asyncFncWrapper){
    if(!asyncFncWrapper) return setImmediate;
    else if(asyncFncWrapper === true) return function(cb){ cb(); };
    else if(!(asyncFncWrapper === setImmediate ||
              asyncFncWrapper === setTimeout ||
              typeof asyncFncWrapper === 'function')){
        
        throw new Error('Wrong argument "asyncFncWrapper", it have to be function, setImmediate, setTimeout, ' +
                        'or true when use default function, or undefined to use setImmediate');
    }
    
    return asyncFncWrapper;
}

/**
 * async Series queue constructor 
 * @param {Object} asyncFncWrapper (optional) by default is setImmediate, but can be setTimeout, or any custom function
 * @returns {Object}  series queue
 */
function Series(asyncFncWrapper) {
    asyncFncWrapper = getAsyncFncWrapper(asyncFncWrapper);
    
    this.add = function() {       
        var fnc, args;
        if(arguments.length===1) {
            fnc=arguments[0];
        }
        else if(arguments.length > 1) {
            fnc=arguments[arguments.length - 1];
            args = [];
            for(var i=0;i<arguments.length-1;i++){
                args.push(arguments[i]);
            }
        }
        
        if(typeof fnc!=='function')
            throw new Error('Async Series: Last argument have to be function(arg1, arg2, ..., next).');
        
        this._fncQueue = this._fncQueue || [];
        this._fncQueue.push({ args:args, fnc:fnc });
        
        this.execute = function(finalFnc){
            var fncQueue = this._fncQueue;
            fncQueue.current = 0;
            fncQueue.scheduled = 0;
            
            function run(itm) {
                asyncFncWrapper(function(){
                    fncQueue.scheduled = fncQueue.current;
                    
                    if(itm.args) {
                        itm.args.push(next);
                        itm.fnc.apply(itm, itm.args);
                    }
                    else itm.fnc(next);
                });
            }
            
            function next(){
                if(!fncQueue || fncQueue.scheduled !== fncQueue.current)
                    throw new Error('Async Series: cannot execute next() more than once per function');
                
                // if(arguments.length > 0) {
                if(arguments.length > 0 && (arguments[0] !== null && typeof arguments[0] !== 'undefined')) {
                    var args = Array.prototype.slice.call(arguments);
                    fncQueue = null;
                    if(typeof finalFnc==='function')
                        asyncFncWrapper(function(){ finalFnc.apply(this, args); });
                }
                else if(fncQueue.current + 1 < fncQueue.length) {
                    fncQueue.current+=1;
                    run(fncQueue[fncQueue.current]);
                }
                else {
                    fncQueue = null;
                    if(typeof finalFnc==='function')
                        asyncFncWrapper(finalFnc);
                }
            }
            
            if(fncQueue && fncQueue.length>0)
                run(fncQueue[fncQueue.current]);
        };
        return this;
    };
    
    this.execute = function(fnc){ if(typeof fnc==='function') asyncFncWrapper(fnc); };
}

/**
 * Helper for async series iterating array or object
 * @param {Object} asyncFncWrapper - optional
 * @param {Object} object object or array - items to iterate
 * @param {Function} fnc iterator fnc(index, next)
 * @param {Function} callback on complete or error callback(err)
 */
Series.each = function(asyncFncWrapper, object, fnc, callback){  // fnc(o, next)
    if(arguments.length <= 3){
        object = arguments[0];
        fnc = arguments[1];
        callback = arguments[2];
        asyncFncWrapper = null;
    }
    
    var s = new Series(asyncFncWrapper);
    
    if(Object.prototype.toString.call(object)==='[object Array]'){
        for(var i=0;i<object.length;i++) {
            (function(i){
                s.add(i, fnc);
            })(i);
        }
    }
    else if(Object.prototype.toString.call(object)==='[object Object]') {
        for(var o in object) {
            (function(o){
                s.add(o, fnc);
            })(o);
        }
    }
    else throw new Error('Async Series Each: Wrong arguments, need object or array');
    
    s.execute(callback);
};

/**
 * Series promise
 * @param {Object} asyncFncWrapper - optional
 * @param {Function} fnc promise function - will handle promise fulfilling
 * @returns {Object}  promise
 *
 * @example:
 * promise(function(promise){
 *       // do something...
 *       promise.fulfill(err, value);
 *   })
 *   .then(function(promise, next){
 *       // promise.isFulfilled === true;
 *       // promise.isPending === false;
 *       if(promise.error) - do something to handle it
 *       promise.value - promised value
 *       
 *       next(); - always run, because this is Series.promise
 *   })
 *   .done(function(promise){
 *       // will be executed after all above functions
 *   });
 */
Series.promise = function(asyncFncWrapper, fnc){
    if(arguments.length === 1){
        fnc = arguments[0];
        asyncFncWrapper = null;
    }
    if(typeof fnc !== 'function') throw new Error('Wrong arguments');
    
    var promise = new Series(asyncFncWrapper);
    promise.isFulfilled = false;
    promise.isPending = true;
    
    promise.fulfill = function(err, value){
        var promise = this;
        
        setImmediate(function(){
            promise.isFulfilled = true;
            promise.isPending = false;
            promise.error = err;
            promise.value = value;
            
            promise.execute(function(){
                if(typeof promise._done === 'function') promise._done(promise);
            });
        });
        return promise;
    };
    
    promise.then = function(cb){ // cb(promise, next)
        if(typeof cb !== 'function') throw new Error('Wrong arguments');
        var promise = this;
        
        promise.add(function(next){
            cb(promise, function(){ next(); }); // ignore errors, all scheduled functions have to be executed
        });
        return promise;
    };
    
    promise.done = function(cb){ // cb(promise)
        if(typeof cb !== 'function') throw new Error('Wrong arguments');
        this._done = cb;
    };
    
    fnc(promise);
    return promise;
};


/**
 * async Parallel queue constructor 
 * @param {Object} asyncFncWrapper (optional) by default is setImmediate, but can be setTimeout, or any custom function
 * @returns {Object}  parallel queue
 */
function Parallel(asyncFncWrapper) {
    asyncFncWrapper = getAsyncFncWrapper(asyncFncWrapper);
    
    this.add = function() {
        var fnc, args;
        if(arguments.length===1) {
            fnc=arguments[0];
        }
        else if(arguments.length > 1) {
            fnc=arguments[arguments.length - 1];
            args = [];
            for(var i=0;i<arguments.length-1;i++){
                args.push(arguments[i]);
            }
        }
        
        if(typeof fnc!=='function')
            throw new Error('Async Parallel: Last argument have to be function(arg1, arg2, ..., next).');
        
        this._fncQueue = this._fncQueue || [];
        this._fncQueue.push({ args:args, fnc:fnc });
        
        this.execute = function(finalFnc){
            var fncQueue = this._fncQueue;
            fncQueue.finished = 0;
            
            function run(itm) {
                asyncFncWrapper(function(){
                    if(itm.args) {
                        itm.args.push(next);
                        itm.fnc.apply(itm, itm.args);
                    }
                    else itm.fnc(next);
                });
            }
            
            function next(){
                if(arguments.length > 0)
                    throw new Error('Async Parallel: next() callback do not accept any arguments, ' +
                                    'because of parallel behaviour, it cannot stop executing on error argument in callback');
                
                else if(!fncQueue) // TODO: implement trackign finished queue items // (fncQueue.scheduled !== fncQueue.current)
                    throw new Error('Async Parallel: cannot execute next() more than once per function');
                
                else if(fncQueue.finished + 1 < fncQueue.length) {
                    fncQueue.finished+=1;
                }
                else {
                    fncQueue = null;
                    if(typeof finalFnc==='function')
                        asyncFncWrapper(finalFnc);
                }
            }
            
            for(var i=0; i< (fncQueue || []).length; i++) {
                run(fncQueue[i]);
            }
        };
        return this;
    };
    
    this.execute = function(fnc){ if(typeof fnc==='function') asyncFncWrapper(fnc); };
}


/**
 * Helper for async parallel iterating array or object
 * @param {Object} asyncFncWrapper - optional
 * @param {Object} object object or array - items to iterate
 * @param {Function} fnc iterator fnc(index, next)
 * @param {Function} callback on complete or error callback(err)
 */
Parallel.each = function(asyncFncWrapper, object, fnc, callback){  // fnc(o, next)
    if(arguments.length <= 3){
        object = arguments[0];
        fnc = arguments[1];
        callback = arguments[2];
        asyncFncWrapper = null;
    }
    
    var p = new Parallel(asyncFncWrapper);
    
    if(Object.prototype.toString.call(object)==='[object Array]'){
        for(var i=0;i<object.length;i++) {
            (function(i){
                p.add(i, fnc);
            })(i);
        }
    }
    else if(Object.prototype.toString.call(object)==='[object Object]') {
        for(var o in object) {
            (function(o){
                p.add(o, fnc);
            })(o);
        }
    }
    else throw new Error('Async Parallel Each: Wrong arguments, need object or array');
    
    p.execute(callback);
};