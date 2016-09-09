'use strict';

var fs = require('fs'),
    parse = require('url').parse,
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
    
    superagent.Request.prototype.rejectUnauthorized = function(reject){
        this._rejectUnauthorized = reject;
        return this;
    };
    
    // added rejectUnauthorized
    superagent.Request.prototype.request = function(){
        if (this.req) return this.req;

        var self = this;
        var options = {};
        var data = this._data;
        var url = this.url;

        // default to http://
        if (0 !== url.indexOf('http')) url = 'http://' + url;
        url = parse(url);

        // options
        options.method = this.method;
        options.port = url.port;
        options.path = url.pathname;
        options.host = url.hostname;
        options.ca = this._ca;
        options.key = this._key;
        options.cert = this._cert;
        options.agent = this._agent;
        options.rejectUnauthorized = this._rejectUnauthorized === false ? false : true;

        // initiate request
        var mod = superagent.protocols[url.protocol];

        // request
        var req = this.req = mod.request(options);
        if ('HEAD' != options.method) req.setHeader('Accept-Encoding', 'gzip, deflate');
        this.protocol = url.protocol;
        this.host = url.host;

        // expose events
        req.on('drain', function(){ self.emit('drain'); });

        req.on('error', function(err){
            // flag abortion here for out timeouts
            // because node will emit a faux-error "socket hang up"
            // when request is aborted before a connection is made
            if (self._aborted) return;
            // if we've recieved a response then we don't want to let
            // an error in the request blow up the response
            if (self.response) return;
            self.callback(err);
        });

        // auth
        if (url.auth) {
            var auth = url.auth.split(':');
            this.auth(auth[0], auth[1]);
        }

        // query
        if (url.search)
            this.query(url.search.substr(1));

        // add cookies
        if (this.cookies) req.setHeader('Cookie', this.cookies);

        for (var key in this.header) {
            req.setHeader(key, this.header[key]);
        }

        return req;
    };
};