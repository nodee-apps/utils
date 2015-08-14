require('../lib/error.js');
var assert = require('assert');

/*
 * run test
 */
errorExt();

/*
 * test Error.details, cause
 */
function errorExt(){
    var err1 = new Error('FS: read file failed').details({ code:'SOMECODE', errno:34 });
    var err2 = new Error('Mongodb driver: CONNFAIL').details({ code:'CONNFAIL', cause:err1 });
    var err3 = new Error('Product: reading fail').cause(err2);
    
    assert.ok(err3.message === 'Product: reading fail <-- Mongodb driver: CONNFAIL <-- FS: read file failed');
    assert.ok(err3.code === 'CONNFAIL');
    assert.ok(err3.errno === 34);
    assert.ok(err3.errlevel === 3);
    
    console.log('Error details, cause - OK');
}