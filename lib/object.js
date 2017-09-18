'use strict';

/*
 * Helper for extending, cloning, ... objects,
 * extends always even if null or undefined
 */

module.exports = {
    extendReservedInstances: [Buffer, ArrayBuffer],
    extend: extend,
    merge: extend,
    isPlainObject: isPlainObject,
    isObject: isObject,
    isEmpty: isEmpty,
    clone: cloneObj,
    copy: cloneObj,
    deepHasProperty: deepHasProperty,
    getValue: deepGet,
    deepGet: deepGet,
    setValue: deepSet,
    deepSet: deepSet,
    deepReplace: deepReplace,
    toArray: toArray,
    fromArray: fromArray,
    dateStringsToDates: dateStringsToDates,
    update: update,

    // lists of global objects
    globalsList:{
        js:['Promise','Generator','GeneratorFunction','Function','Buffer','ArrayBuffer','Reflect','Proxy','eval'],
        node:['setTimeout','clearTimeout','setInterval','clearInterval','setImmediate','clearImmediate','global','GLOBAL','require','process','__dirname','__filename','console','exports','module']
    }
};

function cloneObj(obj){
    var newObj = Object.prototype.toString.call(obj) === '[object Array]' ? [] : {};
    for(var propName in obj) {
        if(typeof obj[propName] === 'object'){
            newObj[propName] = cloneObj(obj[propName]);
        }
        else {
            newObj[propName] = obj[propName];
        }
    }
    return newObj;
}

function isEmpty(obj){
    for(var propName in obj) {
        return false;
    }
    return true;
}

function isObject(value){
    return Object.prototype.toString.call(value) === '[object Object]';
}

function toArray(obj, fields, transfornFnc){
    if(arguments.length===2 && typeof arguments[1] === 'function'){
        transfornFnc = arguments[1];
        fields = null;
    }
    
    if(!isObject(obj)) throw new Error('Wrong arguments');
    var index, array = [];
    transfornFnc = typeof transfornFnc === 'function' ? transfornFnc : function(key, value){ return value; };
    
    if(Array.isArray(fields)) for(var i=0;i<fields.length;i++){
        array[i] = transfornFnc(key, deepGet(obj, fields[i]));
    }
    else for(var key in obj){
        if(obj.hasOwnProperty(key)){
            array.push( transfornFnc(key, obj[key]) );
        }
    }
    
    return array;
}

function fromArray(array, transfornFnc){
    if(!Array.isArray(array)) throw new Error('Wrong arguments');
    var obj = {};
    transfornFnc = typeof transfornFnc === 'function' ? transfornFnc : function(element, i){ return { key:i, value:element }; };
    
    var keyValue = {};
    for(var i=0;i<array.length;i++) {
        keyValue = transfornFnc(array[i],i);
        obj[ keyValue.key ] = keyValue.value;
    }
    
    return obj;
}

function isPlainObject(obj) {
    if (!obj || Object.prototype.toString.call(obj) !== '[object Object]' || obj.nodeType || obj.setInterval) return false;

    var has_own_constructor = hasOwnProperty.call(obj, 'constructor');
    var has_is_property_of_method = hasOwnProperty.call(obj.constructor.prototype, 'isPrototypeOf');

    // Not own constructor property must be Object
    if (obj.constructor && !has_own_constructor && !has_is_property_of_method) return false;

    // Own properties are enumerated firstly, so to speed up,
    // if last one is own, then all properties are own.
    var key;
    for ( key in obj ) {}
    return key === undefined || Object.prototype.hasOwnProperty.call( obj, key );
}

function extend() {
    var options, name, src, copy, copyIsArray, clone,
        reservedInstances = this.extendReservedInstances || [],
        object = this,
        target = arguments[0] || {},
        i = 1,
        length = arguments.length,
        deep = false;
    // Handle a deep copy situation
    if ( typeof target === 'boolean' || target === 'data' ) {
        deep = target;
        target = arguments[1] || {};
        // skip the boolean and the target
        i = 2;
    }
    // Handle case when target is a string or something (possible in deep copy)
    if ( typeof target !== 'object' && typeof target !== 'function') {
        target = {};
    }
    for ( ; i < length; i++ ) {
        options = arguments[ i ];
        
        if(isReservedInstance(options, reservedInstances)){
            target = options;
            return target;
        }
        
        // Only deal with non-null/undefined values
        else if ( options !== null ) {
            // Extend the base object
            for ( name in options ) {
                src = target[ name ];
                copy = options[ name ];
                
                // prevent modifying reserved instances
                if ( isReservedInstance(copy, reservedInstances) ){
                    target[ name ] = copy;
                    continue;
                }
                
                // Prevent never-ending loop
                if ( target === copy ) {
                    continue;
                }
                // Recurse if we're merging plain objects or arrays
                if ( deep && copy && ( isPlainObject(copy) || (copyIsArray = Array.isArray(copy)) ) ) {
                    if ( copyIsArray ) {
                        copyIsArray = false;
                        if(deep === 'data') {
                            // if data mode, do not merge arrays, just copy
                            target[ name ] = copy.slice(0);
                            continue;
                        }
                        clone = src && Array.isArray(src) ? src : [];
                    } else {
                        clone = src && isPlainObject(src) ? src : {};
                    }  
                    // Never move original objects, clone them
                    target[ name ] = object.extend( deep, clone, copy );
                } 
                // copy all include undefined props - helpful in query builder
                else { // if (copy !== undefined){ // Don't bring in undefined values
                    target[name] = copy;
                }
            }
        }
    }
    // Return the modified object
    return target;
}

function isReservedInstance(value, reservedInstances){
    for(var i=0;i<reservedInstances.length;i++){
        if(value instanceof reservedInstances[i]) return true;
    }
    return false;
}

/**
 * Define cascading props in objects in namespace separated by dot,
 * if props are on lower level, it will create empty object
 * @param {Object} parent base object where you want add props
 * @param {String} namespace dot separated
 * @param {Object} value value to add to object prop
 * @param {String} mode if "push", it will add value to array
 * @returns {Object}  parent object after properties are added
 */
function deepSet(parent, key, value, mode) {
    // if(typeof value==='string') value = value.replace(/(\r\n|\r|\n)\s*$/, ''); // replace line endings and white spaces
    var parts = key.split('.');
    var current = parent;
    if(key==='this') {
        if(mode==='push') parent.push(value);
        else parent = value.toString();
    }
    else {
        for(var i=0; i<parts.length; i++) {
            if(i >= parts.length-1) {
                if(mode==='push') current[parts[i]].push(value);
                else current[parts[i]] = value;
            }
            else current[parts[i]] = current[parts[i]] || {};    
            current = current[parts[i]];
        }
    }
    return parent;
}

function deepHasProperty(parent, key) {
    if(key==='this') return true;
    if(parent === null || parent === undefined || typeof parent === 'function') return false;
    
    var parts = key.split('.');
    var current = parent;
    
    for(var i=0; i<parts.length; i++) {
        if( current[parts[i]] ) current = current[parts[i]];
        else if( i === parts.length-1 && current.hasOwnProperty && current.hasOwnProperty(parts[i]) ) return true;
        else return false;
    }
    
    return true;
}

function deepGet(parent, key) {
    if(key==='this') return parent;
    if(parent === null || parent === undefined || typeof parent === 'function') return undefined;
    
    var parts = key.split('.');
    var current = parent;
    
    for(var i=0; i<parts.length; i++) {
        if((current[parts[i]] === null && i<parts.length-1) || current[parts[i]] === undefined) return undefined;
        else current = current[parts[i]];
    }
    
    // function as value is not allowed
    if(typeof current === 'function') return undefined;
    return current;
}

function deepReplace(parentObj, cb, keyPath){ // cb(keyPath, key, value, obj)
    if(!isObject(parentObj)) return;
    keyPath = keyPath || '';
    var value;
    for(var key in parentObj){
        if(isObject(parentObj[key])) deepReplace(parentObj[key], cb, (keyPath==='' ? key : keyPath + '.' + key));
        value = cb((keyPath==='' ? key : keyPath + '.' + key), key, parentObj[key], parentObj);
        if(!value) delete parentObj[key];
        else parentObj[key] = value;
    }
}


// helper - auto parse dates
var regexIso8601 = /^(\d{4}|\+\d{6})(?:-(\d{2})(?:-(\d{2})(?:T(\d{2}):(\d{2}):(\d{2})\.(\d{1,})(Z|([\-+])(\d{2}):(\d{2}))?)?)?)?$/;
var regexIsoJson = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}(?:\.\d*))(?:Z|(\+|-)([\d|:]*))?$/;

function dateStringsToDates(input, useIso8601) {
    var value, match;
    
    // try to parse if input is string
    if(typeof input === 'string' && (match = input.match(useIso8601 ? regexIso8601 : regexIsoJson))) {
        var milliseconds = Date.parse(match[0]);
        if (!isNaN(milliseconds)) {
            input = new Date(milliseconds);
        }
        return input;
    }
    
    // Ignore things that aren't objects
    else if(typeof input !== 'object') return input;
    
    for(var key in input){
        value = input[key];
        
        // Check for string properties which look like dates.
        if(typeof value === 'string' && (match = value.match(useIso8601 ? regexIso8601 : regexIsoJson))) {
            var milliseconds = Date.parse(match[0]);
            if (!isNaN(milliseconds)) {
                input[key] = new Date(milliseconds);
            }
        }
        else if (typeof value === 'object') {
            // Recurse into object
            dateStringsToDates(value, useIso8601);
        }
    }
    
    return input;
}

/*
 * Update object using mongodb update query
 * implemented: $set, $inc, $max, $min
 */
function update(obj, expression){
    if(isObject(expression)) for(var key in expression){
        if(isObject(expression[key])){
            
            if(key==='$set') obj = update(obj, expression[key]);
            
            else if(key==='$inc') for(var prop in expression[key]){
                if(typeof expression[key][prop] === 'number'){
                    var orig = deepGet(obj, prop);
                    if(orig === undefined) obj = deepSet(obj, prop, expression[key][prop]);
                    else if(typeof orig === 'number') obj = deepSet(obj, prop, orig+expression[key][prop]);
                }
            }
            
            else if(key==='$max' || key==='$min') for(var prop in expression[key]){
                if(typeof expression[key][prop] === 'number'){
                    var orig = deepGet(obj, prop);
                    if(key==='$max' && orig < expression[key][prop]) obj = deepSet(obj, prop, expression[key][prop]);
                    else if(key==='$min' && orig > expression[key][prop]) obj = deepSet(obj, prop, expression[key][prop]);
                }
                
            }
            
            else if(key==='$pull' || key==='$pullAll') for(var prop in expression[key]){
                var orig = deepGet(obj, prop), value = expression[key][prop];
                if(Array.isArray(orig)){
                    if(!Array.isArray(value)) value = [value];
                    for(var i=0;i<value.length;i++){
                        var index = orig.indexOf( value[i] );
                        if(index!==-1) orig.splice(index, 1);
                    }
                    obj = deepSet(obj, prop, orig);
                }
            }
            
            else if(key==='$push') for(var prop in expression[key]){
                var orig = deepGet(obj, prop), value = expression[key][prop];
                if(value.$each) value = value.$each;
                if(Array.isArray(orig)){
                    if(!Array.isArray(value)) value = [value];
                    for(var i=0;i<value.length;i++){
                        orig.push(value[i]);
                    }
                    obj = deepSet(obj, prop, orig);
                }
            }
            
            else if(key[0]==='$') continue; // skip not recognized keys
            
            else obj = deepSet(obj, key, expression[key]); // key is simple property
        }
        
        // if expression.$set, ignore data properties outside it
        else if(!expression.$set) obj = deepSet(obj, key, expression[key]);
    }
    return obj;
}