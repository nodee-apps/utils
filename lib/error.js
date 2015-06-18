'use strict';

/*
 * Extends default Error prototype for better understanding on throw, usage:
 *
 * 1. use case
 * new Error('Mongodb driver: connection failed').details({ code:'CONNFAILED', anotherProp:'somethingElse', cause:err });
 *
 * 2. use case
 * new Error('Cms Document: read failed').cause(err);
 *
 * message on throw will looks like:
 * Error: Cms Document: update failed <-- Mongodb Repository: CRUDFAIL <-- Mongodb driver wrapper: update <-- Mongodb native driver error message
 * 
 */

/**
 * Helper for safe adding error properties in one line of code
 * @param {Object} detailsObj properties to copy to error
 * @returns {Error}  this
 */
Error.prototype.details = function(detailsObj){
    if(Object.prototype.toString.call(detailsObj) === '[object Object]'){
        for(var prop in detailsObj){
            if(prop === 'cause') this.cause(detailsObj[prop]);
            else this[prop] = this[prop] || detailsObj[prop];
        }
    }
    else throw new TypeError('Error.prototype.details( obj ) argument have to be object, and is "' +
                             Object.prototype.toString.call(detailsObj) +'"');
    
    return this;
}

/**
 * Helper for wrapping causedBy error (previous level error)
 * adds details to this error mesasge for better understanding whats going on when throw
 * @param {Error} causedBy Error object
 * @returns {Error}  this
 */
Error.prototype.cause = function(causedBy){
    if(causedBy instanceof Error) {
        for(var prop in causedBy){
            if(causedBy.hasOwnProperty(prop) && !this.hasOwnProperty(prop)) {
                this[prop] = causedBy[prop];
            }
        }
        
        // increment error.level
        this.errlevel = 1;
        this.errlevel += causedBy.errlevel || 1;
        
        // extend error message
        this.message += ' <-- ' + causedBy.message;
    }
    else throw new TypeError('Error.prototype.cause( error ) argument have to be Error instance, and is "' +
                             Object.prototype.toString.call(causedBy) + '"');
    
    return this;
};