
/*
 * Helpers for escaping new regexp
 */

function escapeRegExp(str) {
    return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&');
}

function unEscapeRegExp(str) {
    return str.replace(/\\(?!\\)/g,'');
}

// attach to RegExp constructor
RegExp.escape = escapeRegExp;

// attach to RegExp prototype as "escape()" method
RegExp.prototype.escape = function(){
    var flags = (this.global ? 'g' : '') + (this.ignoreCase ? 'i' : '') + (this.multiline ? 'm' : ''); // TODO: implement this.lastIndex
    return new RegExp(escapeRegExp(this.source), flags);
};

// attach to String prototype as "escape()" method
String.prototype.escape = function(){
    return escapeRegExp(this);
};

// attach to String prototype as "unescape()" method
String.prototype.unescape = function(){
    return unEscapeRegExp(this);
};
