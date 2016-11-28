'use strict';

/*
 * Load Error extensions
 */
require('./lib/error.js');

/*
 * Expose all helpers
 */
module.exports.async = require('./lib/async.js');
module.exports.object = require('./lib/number.js');
module.exports.object = require('./lib/object.js');
module.exports.buffer = require('./lib/buffer.js');
module.exports.template = require('./lib/template.js');
module.exports.fsExt = require('./lib/fsExt.js');
module.exports.password = require('./lib/password.js');
module.exports.guid = require('./lib/guid.js');
module.exports.validator = require('./lib/validator.js');
module.exports.query = require('./lib/query.js');

/*
 * Expose bundled 3-rd party modules
 */
module.exports.shortId = module.exports.shortid = require('shortid');
module.exports.request = require('superagent');
Object.defineProperty(module.exports, 'sift', {
    get: function(){
        console.warn('nodee-utils: sift is deprecated, use query instead');
        return require('sift');
    }
});

/*
 * Extend superagent.Request prototype
 */
require('superagent-retry')(module.exports.request);
require('./lib/request.js')(module.exports.request);

/*
 * Extend Date prototype
 */
require('./lib/date.js');

/*
 * Extend RegExp prototype
 */
require('./lib/regexp.js');

/*
 * Extend String prototype
 */
require('./lib/string.js');

/*
 * Extend Array prototype
 */
require('./lib/array.js');