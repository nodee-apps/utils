'use strict';

var fs = require('fs'),
    CRLF = '\r\n';

module.exports = function(superagent){

    // add ability to send content type application/json
    superagent.Request.prototype.field = function(name, val){
        var formData = this._getFormData();
        var opts = {};

        if(val && typeof val === 'object'){
            opts.header = CRLF + '--' + formData.getBoundary() + CRLF + 'Content-Disposition: form-data; name="' + name + '"' + CRLF + 'Content-Type: application/json' + CRLF + CRLF;
            val = JSON.stringify(val);
        }

        formData.append(name, val, opts);
        return this;
    };

    // handle ENOENT
    superagent.Request.prototype.attach = function(field, file, filename){
        var req = this;

        var formData = this._getFormData();
        if ('string' == typeof file) {
            if (!filename) filename = file;
            file = fs.createReadStream(file);

            // if reading file error, end reading and callback error
            file.on('error', function(err){
                req._formData.end();
                req.abort();
                req.callback(err);
            });

        } else if(!filename && file.path) {
            filename = file.path;
        }
        formData.append(field, file, { filename: filename });

        return this;
    };
};