'use strict';

var FormData = require('form-data'),
    CRLF = '\r\n';

module.exports = function(superagent){

    // add ability to send content type application/json
    superagent.Request.prototype.field = function(name, val){
        if (!this._formData) this._formData = new FormData();
        var opts = {};

        if(val && typeof val === 'object'){
            opts.header = CRLF + '--' + this._formData.getBoundary() + CRLF + 'Content-Disposition: form-data; name="' + name + '"' + CRLF + 'Content-Type: application/json' + CRLF + CRLF;
            val = JSON.stringify(val);
        }

        this._formData.append(name, val, opts);
        return this;
    };
};