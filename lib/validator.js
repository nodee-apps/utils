'use strict';
    
// using bundled module https://github.com/chriso/validator.js
var validator = module.exports = require('validator');
var deepGet = require('./object.js').deepGet; // init string extensions
require('./string.js'); // init string extensions

/*
 * Custom validators - returns true/false, but also can modify value
 */

// alias
validator.isInteger = validator.isInt;

validator.isNumber = function(value) {
    return typeof value === 'number';
};

// value have to be defined, empty string, or zero is valid
validator.isDefined = function(value) {
    return !(value === null || value === undefined);
};

validator.isString = function(value) {
    return typeof value === 'string';
};

validator.isArray = function(value) {
    return Array.isArray(value);
};

validator.isObject = function(value) {
    return Object.prototype.toString.call(value) === '[object Object]';
};

validator.isBoolean = function(value) {
    return typeof value === 'boolean';
};

validator.minLength = function(value, minLength){
    if((typeof value === 'string' || Array.isArray(value)) && value.length >= minLength) return true;
    else return false;
};

validator.maxLength = function(value, maxLength){
    if((typeof value === 'string' || Array.isArray(value)) && value.length <= maxLength) return true;
    else return false;
};

// math round
validator.round = function(value, digits){
    var koef = Math.pow(10, parseInt(digits || 0, 10) || 0);
    
    if(typeof value !== 'number') return false;
    this.value = Math.round(koef*(parseFloat(value || 0, 10) || 0))/koef;
    return true;
};

validator.parseBuffer =
validator.toBuffer =
validator.buffer = function(value, encoding) {
    encoding = encoding || 'binary';
    if([true,'ascii','utf8','utf16le','ucs2','base64','binary','hex'].indexOf(encoding) === -1) throw new Error('Invalid buffer encoding');
    
    if(Buffer.isBuffer(value)) return true; // this is already buffer
    if(Array.isArray(value)) {
        this.value = new Buffer(value, encoding===true ? 'binary' : encoding);
        return true;
    }
    if(typeof value !== 'string') return false;

    if(encoding === true){ // auto detect string
        // autodetect base64
        var notBase64 = /[^A-Z0-9+\/=]/i;
        var len = value.length;
        var firstPaddingChar = value.indexOf('=');
        if(!len || len % 4 !== 0 || notBase64.test(value)) encoding = 'binary';
        else if(firstPaddingChar === -1 || firstPaddingChar === len - 1 || firstPaddingChar === len - 2 && value[len - 1] === '='){
            this.value = new Buffer(value,'base64');
            return true;
        }
        else encoding = 'binary';
    }
    
    this.value = new Buffer(value, encoding);
    return true;
};


// parsing date
validator.parseDate =
validator.toDate =
validator.date = function(value, formatString){
    
    // if object is already a Date, return
    if(Object.prototype.toString.call(value) === '[object Date]') return true;
    else if(typeof value !== 'string') return false;
    
    // '2014-10-18T22:00:20' (date) - 'yyyy-MM-ddTHH:mm:ss' (formatString)
    // if no format string use native Date.parse
    if(typeof formatString!=='string') {
        value = new Date(Date.parse(value));
        if(value) {
            this.value = value;
            return true;
        }
        else return false;
    }
    
    // use custom format fucntion
    value = Date.parseFormat(value, formatString);
    
    if(value.getTime() === 0) return false;
    else {
        this.value = new Date(value);
        return true;
    }
};

// format date
validator.toDateString = function(value, formatString){
    if(Object.prototype.toString.call(value) !== '[object Date]') return false;
    
    // '2014-10-18T22:00:20' (date) - 'yyyy-MM-ddTHH:mm:ss' (formatString)
    // if no format string use native Date.toString()
    if(typeof formatString!=='string') this.value = value.toString();
    else this.value = value.toFormatString(formatString);
    
    return true;
};

// custom validation function
validator.customValidation = function(value, func){
    if(typeof func !== 'function') throw new Error('Cannot validate, second argument have to be function');
    return func.call(this, value);
};

// modify object keys
validator.keyNames = function(value, fnc){

    if(Object.prototype.toString.call(value) !== '[object Object]' ||
       typeof fnc !== 'function') {
        
        return false;
    }
    
    var newKey;
    for(var key in value){
        newKey = fnc(key);
        this.value[ newKey ] = this.value[ key ];
        if(key!==newKey) delete this.value[ key ];
    }
    return true;
};

validator.isIn = function(value, elm1, elm2, elmX) {
    for(var i=1;i<arguments.length;i++) if(arguments[i]===value) return true;
    return false;
};

validator.isPositiveNumber = function(value) {
    return typeof value === 'number' && value > 0;
};

validator.isNegativeNumber = function(value) {
    return typeof value === 'number' && value < 0;
};

validator.isNonPositiveNumber = function(value) {
    return typeof value === 'number' && value <= 0;
};

validator.isNonNegativeNumber = function(value) {
    return typeof value === 'number' && value >= 0;
};

validator.isGreaterThan = function(value, min) {
    return value > min;
};

validator.isGreaterOrEqualTo = function(value, min) {
    return value >= min;
};

validator.isLowerThan = function(value, max) {
    return value < max;
};

validator.isLowerOrEqualTo = function(value, max) {
    return value <= max;
};

    
/*
 * Custom sanitizers - returns modified value
 */

// always sets this value
validator.setValue = function(value, setValue) {
    return setValue;
};

// sets value if it's null or undefined or empty string
validator.defaultValue = function(value, defaultValue) {
    return (typeof value === 'undefined' || value === null || value === '') ? defaultValue : value;
};

// copy value from another model property, if it is used as model sanitizer
validator.valueFrom = function(value, modelPropName) {
    if(typeof modelPropName === 'string' && this.model) {
        value = deepGet( this.model, modelPropName );
        return value;
    }
};

// custom modify function
validator.customSanitization = function(value, func){
    if(typeof func !== 'function') throw new Error('Cannot sanitize, second argument have to be function');
    return func(value);
};
    
// remove not allowed characters from url
validator.cleanUrl = function(value){
    value = validator.toString(value);
    
    // '/' is reserved symbol for root domain path
    if(value !== '/') {
        value = value.removeDiacritics();
        value = value.replace(/[ ]+/g,'-').replace(/[^a-z0-9\-_\.]+/g,'');
    }
    
    return value;
};

// generate fulltext array
validator.fullText = function(value){
    if(value === undefined) return undefined;
    value = validator.toString(value)
                     .removeDiacritics()
                     .replace(/[^a-z0-9_]+/g,' ')
                     .replace(/[\s]{2,}/g,' ')
                     .replace(/^\s+/,'')
                     .replace(/\s+$/,'')
                     .replace(/[y]+/g,'i');
    
    return value.split(' ');
};

validator.toInt = validator.toInteger = function(str, radix) {
    return parseInt(str, radix===true ? 10 : radix || 10);
};