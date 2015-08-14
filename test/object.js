var assert = require('assert'),
    object = require('../lib/object.js');

/*
 * run test
 */

isEmpty();
clone();
extend();
update();
toArray();
dateStringsToDates();

function isEmpty() {
    var testObject = {
        'asd':23,
        'deep':{
            'deepprop':'asd',
            'deeparr':['asd',{ asd:1 }]
        }
    };
    
    assert.strictEqual(false, object.isEmpty(testObject));
    assert.strictEqual(true, object.isEmpty({}));
    
    console.log('object.isEmpty - OK');
}


function clone(){
    
    var oldObject = {
        'asd':23,
        'deep':{
            'deepprop':'asd',
            'deeparr':['asd',{ asd:1 }]
        }
    };
    
    var oldArray = ['ads', { asd:2, dsa:'as' }];
    oldArray.deepprop = { asd:2, dsa:'as' };
    
    assert.notEqual(oldObject, object.clone(oldObject));
    assert.deepEqual(oldObject, object.clone(oldObject));
    assert.deepEqual(oldArray, object.clone(oldArray));
    
    console.log('object.clone - OK');
}


function extend() {
    
    function fnc(){}
    
    var testObject = {
        'asd':23,
        'deep':{
            'fnc': fnc,
            'deeporiginal':true,
            'deepprop':'asd',
            'deeparr':['asd',{ asd:1 }]
        }
    };
    
    var extObject = {
        'added':123,
        'deep':{
            'deepprop': undefined,
            'deeparr':['asd1',{ asd:2 }]
        }
    };
    
    var resultObj = {
        asd: 23,
        deep:{
            fnc: fnc,
            deeporiginal:true,
            deepprop: undefined,
            deeparr: [ 'asd1', { asd:2 } ] },
        added: 123  
    };
    
    var extended = {};
    object.extend(true, extended, testObject, extObject);
    //console.warn(extended);
    
    assert.deepEqual(resultObj, extended);
    console.log('object.extend - OK');
}

function update(){
    var testObject = {
        'min':1,
        'min_skip':-10,
        'max':1,
        'max_skip':10,
        'inc':1,
        'inc_skip':'23',
        //'inc_created':1,
        'simple': 'original',
        'deep':{
            'prop': 'original',
            'push': [ 1,2 ],
            'push_each':[ 1,2 ],
        },
        'pull':[ 1,2,3 ],
        'pullAll':[ 1,2,3 ]
    };
    
    var updateExpression = {
        willbeignored:'asd',
        $inc:{
            'inc':1,
            'inc_skip':1,
            'inc_created':1
        },
        $max:{
            'max':5,
            'max_skip':5
        },
        $min:{
            'min':0,
            'min_skip':0
        },
        $set:{
            'simple':'updated',
            'deep.prop':'updated',
        },
        'deep.prop2':'updated2',
        $push:{
            'deep.push':3,
            'deep.push_each':{ $each:[ 3,4 ] }
        },
        $pull:{
            'pull':2
        },
        $pullAll:{
            'pullAll':[ 2,3 ]
        }
    };
    
    var resultObj = {
        'min':0,
        'min_skip':-10,
        'max':5,
        'max_skip':10,
        'inc':2,
        'inc_skip':'23',
        'simple': 'updated',
        'deep':{
            'prop': 'updated',
            'push': [ 1,2,3 ],
            'push_each':[ 1,2,3,4 ]
        },
        'pull':[ 1,3 ],
        'pullAll':[ 1 ],
        'inc_created':1
    };
    
    var simpleTestObj = {
        'min':1,
        'simple': 'original',
        'deep':{
            'prop': 'original',
            'push': [ 1,2 ],
            'push_each':[ 1,2 ],
        },
        'pull':[ 1,2,3 ],
        'pullAll':[ 1,2,3 ]
    };
    
    var simpleUpdateExpression = {
        'min':2,
        'simple': 'modified',
        'deep':{
            'push': [ 1 ],
            'push_each':[ 2 ],
        },
        'deep.prop':'modified',
        'pull':[ 1 ]
    };
    
    var simpleResultObj = {
        min: 2,
        simple: 'modified',
        deep: { push: [ 1 ], push_each: [ 2 ], prop: 'modified' },
        pull: [ 1 ],
        pullAll: [ 1, 2, 3 ]
    };
    
    assert.deepEqual(resultObj, object.update(testObject, updateExpression));
    assert.deepEqual(simpleResultObj, object.update(simpleTestObj, simpleUpdateExpression));
    console.log('object.update - OK');
}

function toArray(){
    var testObject = {
        'min':1,
        'min_skip':-10,
        'max':1,
        'max_skip':10,
        'inc':1,
        'inc_skip':'23',
        //'inc_created':1,
        'simple': 'original',
        'deep':{
            'prop': 'original',
            'push': [ 1,2 ],
            'push_each':[ 1,2 ],
        },
        'pull':[ 1,2,3 ],
        'pullAll':[ 1,2,3 ]
    };
    
    var result = object.toArray(testObject, [ 'max', 'pull', 'deep.prop' ]);
    
    assert.deepEqual(result, [ 1, [ 1, 2, 3 ], 'original' ]);
    console.log('object.toArray - OK');
}

function dateStringsToDates(){
    var now = new Date();
    var nowString = JSON.stringify(now).replace(/"/g,'');
    
    var testObject = {
        'date': now,
        'dateString':nowString,
        'wrong1':2014,
        'wrong2':'2014-01-01T23:28:56',
        'wrong3':'2014',
        'deep':{
            'date': now,
            'dateString':nowString,
            'wrong1':2014,
            'wrong2':'2014-1-2',
            'wrong3':'2014'
        }
    };
    
    var resultObject = {
        'date': now,
        'dateString':now,
        'wrong1':2014,
        'wrong2':'2014-01-01T23:28:56',
        'wrong3':'2014',
        'deep':{
            'date': now,
            'dateString':now,
            'wrong1':2014,
            'wrong2':'2014-1-2',
            'wrong3':'2014'
        }
    };
    
    var result = object.dateStringsToDates(testObject);
    
    assert.deepEqual(result, resultObject);
    console.log('object.dateStringsToDates - OK');
}