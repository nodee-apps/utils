var assert = require('assert'),
    template = require('../lib/template.js');

/*
 * run test
 */

replace();

function replace() {
    var testObject = {
        'asd':23,
        'deep':{
            'deepprop':'asd',
            'deeparr':['asd',{ asd:1 }]
        }
    };
    
    var text = ' asdasd [[asd]] asdad asd asdas asd [[deep.deeparr.0]]';
    var result = template.render(text, testObject);
    assert.strictEqual(result, ' asdasd 23 asdad asd asdas asd asd');
    
    text = ' asdasd ${asd} asdad asd asdas asd ${ deep.deeparr.0 }';
    result = template.replacer('${','}')(text, testObject);
    assert.strictEqual(result, ' asdasd 23 asdad asd asdas asd asd');
    
    console.log('template.render - OK');
}