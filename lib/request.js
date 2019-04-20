'use strict';

var fs = require('fs');

module.exports = function(superagent){

    // handle ENOENT
    superagent.Request.prototype.attach = function(field, file, options) {
        var req = this;

        if (file) {
            if (this._data) {
                throw new Error("superagent can't mix .send() and .attach()");
            }
      
            let o = options || {};
            if (typeof options === 'string') {
                o = { filename: options };
            }
      
            if (typeof file === 'string') {
                if (!o.filename) o.filename = file;
                file = fs.createReadStream(file);
                
                // if reading file error, end reading and callback error
                file.on('error', function(err){
                    req._formData.end();
                    req.abort();
                    req.callback(err);
                });

            } else if (!o.filename && file.path) {
                o.filename = file.path;
            }
      
            this._getFormData().append(field, file, o);
        }
      
        return this;
    };
    
    // TODO: decide if reject unauthorized connections are needed, if so, implement and test it due to nodejs deprecation
    // and modify superagent request constructor to pass rejectUnauthorized flag when request instance is created
    // superagent.Request.prototype.rejectUnauthorized = function(reject){
    //     this._rejectUnauthorized = reject;
    //     return this;
    // };
};