var assert = require('assert'),
    query = require('../lib/query.js');

function it(description, fnc){
    try {
        fnc();
    }
    catch(err){
        console.warn(description);
        throw err;
    }
}

/*
 * Operators test
 */

[
    // $eq
    [{$this:{$eq:5}}, [5,'5', 6], [5]],
    [{$this:'5'}, [5,'5', 6], ['5']],
    [{$this:false}, [false,'false', true], [false]],
    [{$this:true}, [1, true], [true]],
    [{$this:0}, [0,'0'], [0]],
    [{$this:null}, [null], [null]],
    [{$this:void 0}, [void 0, null], [void 0]],
    [{$this:1}, [2,3,4,5], []],
    [{$this:1}, [[1]], [[1]]],
    [{$this:new Date(1)}, [new Date(), new Date(1), new Date(2), new Date(3)], [new Date(1)]],
    [{$this:/^a/}, ['a','ab','abc','b','bc'], ['a','ab','abc']],

    // $ne
    [{$this:{$ne:5}}, [5, '5', 6], ['5', 6]],
    [{$this:{$ne:'5'}}, ['5', 6], [6]],
    [{$this:{$ne:false}}, [false], []],
    [{$this:{$ne:void 0}}, [false, 0, '0', void 0], [false, 0, '0']],
    [{$this:{$ne:/^a/}}, ['a','ab','abc','b','bc'], ['b','bc']],
    [{$this:{$ne:1}}, [[2],[1]], [[2]]],
    [{groups:{$ne:111}}, [{groups:[111,222,333,444]},{groups:[222,333,444]}],[{groups:[222,333,444]}]],

    // $lt
    [{$this:{$lt:5}}, [3,4,5,6],[3,4]],
    [{$this:{$lt:'c'}}, ['a','b','c'],['a','b']],
    [{$this:{$lt:null}}, [-3,-4], []],
    [{$this:{$lt:new Date(3)}}, [new Date(1), new Date(2), new Date(3)],[new Date(1), new Date(2)]],

    // $lte
    [{$this:{$lte:5}}, [3,4,5,6],[3,4,5]],
    [{groups:{$lt:5}}, [{groups:[1,2,3,4]}, {groups:[7,8]}], [{groups:[1,2,3,4]}]],

    // $gt
    [{$this:{$gt:5}}, [3,4,5,6],[6]],
    [{$this:{$gt:null}}, [3,4], []],
    [{groups:{$gt:5}}, [{groups:[1,2,3,4]}, {groups:[7,8]}], [{groups:[7,8]}]],

    // $gte
    [{$this:{$gte:5}}, [3,4,5,6],[5, 6]],
    [{groups:{$gte:5}}, [{groups:[1,2,3,4]}, {groups:[7,8]}], [{groups:[7,8]}]],

    // $mod
    [{$this:{$mod:[2,1]}}, [1,2,3,4,5,6],[1,3,5]],
    [{groups:{$mod:[2,0]}}, [{groups:[1,2,3,4]}, {groups:[7,9]}], [{groups:[1,2,3,4]}]],

    // $exists
    [{$this:{$exists:false}}, [0,false,null,undefined],[undefined]],
    [{$this:{$exists:true}}, [0,false,void 0, 1, {}],[0, false, 1, {}]],

    // $in
    [{$this:{$in:[0,false,1,'1']}},[0,1,2,3,4,false],[0,1,false]],
    [{$this:{$in:[1,'1','2']}},['1','2','3'],['1','2']],
    [{$this:{$in:[new Date(1)]}},[new Date(1), new Date(2)],[new Date(1)]],
    [{'a.b.status':{'$in': [0]}}, [{'a':{'b':[{'status':0}]}},{'a':{'b':[{'status':2}]}}],[{'a':{'b':[{'status':0}]}}]],
    [{'a.b.status':{'$in': [0, 2]}}, [{'a':{'b':[{'status':0}]}},{'a':{'b':[{'status':2}]}}], [{'a':{'b':[{'status':0}]}},{'a':{'b':[{'status':2}]}}]],

    // $nin
    [{$this:{$nin:[0,false,1,'1']}},[0,1,2,3,4,false],[2,3,4]],
    [{$this:{$nin:[1,'1','2']}},['1','2','3'],['3']],
    [{$this:{$nin:[new Date(1)]}},[new Date(1), new Date(2)],[new Date(2)]],

    // $not
    [{a:{$not:{$in:[1,2,3]}}},[{a:[1,2,3,4,5,6]},{a:[4,5,6]}],[{a:[4,5,6]}]], // with expressions

    // $type
    //[{$type:Date}, [0,new Date(1)],[new Date(1)]],
    //[{$type:Number}, [0,false,1],[0,1]],
    //[{$type:Boolean}, [0,false, void 0],[false]],
    //[{$type:String}, ['1',1,false],['1']],

    // $all
    [{a:{$all:[1,2,3]}},[{a:[1,2,3,4]},{a:[1,2,4]}],[{a:[1,2,3,4]}]],
    [{a:{$all:[0,false]}},[{a:[0,1,2]},{a:[0,false]},{a:['0','false']},{a:void 0}],[{a:[0,false]}]],
    [{a:{$all:['1']}},[{a:[1]}],[]],
    [{a:{$all:[new Date(1),new Date(2)]}},[{a:[new Date(1), new Date(2)]},{a:[new Date(1)]}],[{a:[new Date(1), new Date(2)]}]],

    // $size
    [{$this:{$size:3}},['123',[1,2,3],'1'],['123',[1,2,3]]],
    [{$this:{$size:1}},['123',[1,2,3],'1', void 0],['1']],

    // $or
    [{$or:[{$this:1},{$this:2},{$this:3}]},[1,2,3,4],[1,2,3]],
    [{$or:[{$this:{$ne:1}},2]},[1,2,3,4,5,6],[2,3,4,5,6]],

    // $nor
    [{$nor:[{$this:1},{$this:2},{$this:3}]},[1,2,3,4],[4]],
    [{$nor:[{$this:{$ne:1}},{$this:2}]},[1,2,3,4,5,6],[1]],

    // $and
    [{$and:[{$this:{$gt:1}},{$this:{$lt:4}}]},[1,2,3,4],[2,3]],

    // $regex
    [{$this:{$regex:'^a'}},['a','ab','abc','bc','bcd'],['a','ab','abc']],
    [{a:{$regex:'b|c'}}, [{a:['b']},{a:['c']},{a:'c'},{a:'d'}], [{a:['b']},{a:['c']},{a:'c'}]],
    [{ folder: { $regex:'^[0-9]{4}$' }}, [{ folder:['1234','3212'] }], [{ folder:['1234','3212'] }]],

    // $options
    [{$this:{$regex:'^a', $options: 'i'}},['a','Ab','abc','bc','bcd'],['a','Ab','abc']],
    [{'text':{'$regex':'.*lis.*','$options':'i'}}, [{text:['Bob','Melissa','Joe','Sherry']}], [{text:['Bob','Melissa','Joe','Sherry']}]],

    // undefined
    [{$this:{$regex:'a'}},[undefined, null, true, false, 0, 'aa'],['aa']],
    [{$this:/a/},[undefined, null, true, false, 0, 'aa'],['aa']],
    [{$this:/.+/},[undefined, null, true, false, 0, 'aa', {}],['aa']],

    // $where
    //[{$where:function () { return this.v === 1 }}, [{v:1},{v:2}],[{v:1}]],
    //[{$where:'this.v === 1'}, [{v:1},{v:2}],[{v:1}]],
    //[{$where:'obj.v === 1'}, [{v:1},{v:2}],[{v:1}]],

    // $elemMatch
    //{'person': {'$elemMatch': {'gender': 'male', 'age': {'$lt': 30}}}}
    [
        {v:{$elemMatch:{'a.b':1,'a.c':{$gt:2}}}},
        [{v:[{a:{b:2,c:2}},{a:[{b:1,c:1,d:3}]},{a:{b:2,c:3}}]}, {v:[{a:{b:1,c:3}},{a:[{b:1,c:2,d:3}]},{a:{b:2,c:3}}]}], 
        [{v:[{a:{b:1,c:3}},{a:[{b:1,c:2,d:3}]},{a:{b:2,c:3}}]}]
    ],
].forEach(function (operation, i) {

    var filter = operation[0];
    var array = operation[1];
    var matchArray = operation[2];
    
    it(i + ': ' + JSON.stringify(filter), function() {
        assert.equal(JSON.stringify(array.filter(query.compile(filter))), JSON.stringify(matchArray));
    });
});


/*
 * Basic test
 */

it("doesn't sort arrays", function () {
    var values = [9,8,7,6,5,4,3,2,1].filter(query.compile({
        $or: [3, 2, 1]
    }));

    assert.equal(values.length, 3);
    assert.equal(values[0], 3);
    assert.equal(values[1], 2);
    assert.equal(values[2], 1);
});

it("throws an error if the operation is invalid", function () {

    var err;
    try {
        query.compile({$aaa:1})("b");
    } catch (e) {
        err = e;
    }

    assert.equal(err.message, "Operator \"$aaa\" not recognized");
});

it("can match empty arrays", function () {
    var statusQuery = {$or: [{status: {$exists: false}},
                             {status: []},
                             {status: {$in: ["urgent", "completed", "today"]}}
                            ]};

    var filtered = query.filter(statusQuery, [{ status: [] },
                                      { status: ["urgent"] },
                                      { status: ["nope"] }
                                     ]);

    assert.equal(filtered.length, 2);
});

it("$ne does not hit when field is different", function () {
    var filtered = query.filter({ age: { $ne: 5 }}, [{ age: 5 }]);
    assert.equal(filtered.length, 0);
});

it("$ne does hit when field exists with different value", function () {
    var filtered = query.filter({ age: { $ne: 4 }}, [{ age: 5 }]);
    assert.equal(filtered.length, 1);
});

it("$ne does hit when field does not exist", function(){
    var filtered = query.filter({ age: { $ne: 5 }}, [{}]);
    assert.equal(filtered.length, 1);
});

/*
 * Complex
 */

var topic = [
    {
        name: 'craig',
        age: 90001,
        tags: ['coder', 'programmer', 'traveler', 'photographer'],
        address: {
            city: 'Minneapolis',
            state: 'MN',
            phone: '9999999999'
        },
        tags: ['photos', 'cook'],
        hobbies: [
            {
                name: 'programming',
                description: 'some desc'
            },
            {
                name: 'cooking'
            },
            {
                name: 'photography',
                places: ['haiti', 'brazil', 'costa rica']
            },
            {
                name: 'backpacking'
            }
        ]
    },
    {
        name: 'tim',
        age: 90001,
        tags: ['traveler', 'photographer'],
        address: {
            city: 'St. Paul',
            state: 'MN',
            phone: '765765756765'
        },
        tags: ['dj'],
        hobbies: [
            {
                name: 'biking',
                description: 'some desc'
            },
            {
                name: 'DJ'
            },
            {
                name: 'photography',
                places: ['costa rica']
            }
        ]
    }
];
it("throws error if $not is incorrect", function () {
    
    assert.throws(function () {
        query.filter({ 
            $this:{
                $not: ['abc']
            }
        }, topic);
    }, Error);
});
it("has query through photography in brazil count of 1", function () {
    var filtered = query.filter({
        hobbies: {
            name: 'photography',
            places: {
                $in: ['brazil']
            }
        }
    }, topic);
    assert.equal(filtered.length, 1);
});
it("has query through photography in brazil, haiti, and costa rica count of 1", function () {
    var filtered = query.filter({
        hobbies: {
            name: 'photography',
            places: {
                $all: ['brazil', 'haiti', 'costa rica']
            }
        }
    }, topic);
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0], topic[0]);
});
it("has a query hobbies of photography, cooking, or biking count of 2", function () {
    var filtered = query.filter({
        hobbies: {
            name: {
                $in: ['photography', 'cooking', 'biking']
            }
        }
    }, topic);
    assert.equal(filtered.length, 2);
});
it("has query to complex count of 2", function () {
    var filtered = query.filter({
        hobbies: {
            name: 'photography',
            places: {
                $in: ['costa rica']
            }
        },
        address: {
            state: 'MN',
            phone: {
                $exists: true
            }
        }
    }, topic);

    assert.equal(filtered.length, 2);
});
it("has query to complex count of 0", function () {
    var filtered = query.filter({
        hobbies: {
            name: 'photos',
            places: {
                $in: ['costa rica']
            }
        }
    }, topic);
    assert.equal(filtered.length, 0);
});
it("has query subobject hobbies count of 3", function () {
    var filtered = query.filter({
        "hobbies.name": "photography"
    }, topic);
    assert.equal(filtered.length, 2);
});
it('has query dot-notation hobbies of photography, cooking, and biking count of 3', function () {
    var filtered = query.filter({
        "hobbies.name": {
            $in: ['photography', 'cooking', 'biking']
        }
    }, topic);
    assert.equal(filtered.length, 2);
});
it("has query to complex dot-search count of 2", function () {
    var filtered = query.filter({
        "hobbies.name": "photography",
        "hobbies.places": {
            $in: ['costa rica']
        },
        "address.state": "MN",
        "address.phone": {
            $exists: true
        }
    }, topic);
    assert.equal(filtered.length, 2);
});

it("$eq for nested object", function () {
    var filtered = query.filter({'sub.num': {'$eq': 10}}, loremArr());
    assert(filtered.length > 0);
    filtered.forEach(function (v) {
        assert.equal(10, v.sub.num);
    });
});

it("$ne for nested object", function () {
    var filtered = query.filter({'sub.num': {'$ne': 10}}, loremArr());
    assert(filtered.length > 0);
    filtered.forEach(function (v) {
        assert.notEqual(10, v.sub.num);
    });
});

it("$regex for nested object (one missing key)", function () {
    var persons = [{
        id: 1,
        prof: 'Mr. Moriarty'
    }, {
        id: 2,
        prof: 'Mycroft Holmes'
    }, {
        id: 3,
        name: 'Dr. Watson',
        prof: 'Doctor'
    }, {
        id: 4,
        name: 'Mr. Holmes',
        prof: 'Detective'
    }];
    var q = { "name": { "$regex": "n" } };
    var filtered = query.filter(q, persons);
    assert.deepEqual(filtered, [{
        id: 3,
        name: 'Dr. Watson',
        prof: 'Doctor'
    }]);
});

function loremArr(){
    return [
        {
            "num": 1,
            "pum": 1,
            "sub": {
                "num": 1,
                "pum": 1
            }
        },
        {
            "num": 2,
            "pum": 2,
            "sub": {
                "num": 2,
                "pum": 2
            }
        },
        {
            "num": 3,
            "pum": 3,
            "sub": {
                "num": 3,
                "pum": 3
            }
        },
        {
            "num": 4,
            "pum": 4,
            "sub": {
                "num": 4,
                "pum": 4
            }
        },
        {
            "num": 5,
            "pum": 5,
            "sub": {
                "num": 5,
                "pum": 5
            }
        },
        {
            "num": 6,
            "pum": 6,
            "sub": {
                "num": 6,
                "pum": 6
            }
        },
        {
            "num": 7,
            "pum": 7,
            "sub": {
                "num": 7,
                "pum": 7
            }
        },
        {
            "num": 8,
            "pum": 8,
            "sub": {
                "num": 8,
                "pum": 8
            }
        },
        {
            "num": 9,
            "pum": 9,
            "sub": {
                "num": 9,
                "pum": 9
            }
        },
        {
            "num": 10,
            "pum": 10,
            "sub": {
                "num": 10,
                "pum": 10
            }
        },
        {
            "num": 11,
            "pum": 11,
            "sub": {
                "num": 10,
                "pum": 10
            }
        }
    ];
}

console.log('query - OK');