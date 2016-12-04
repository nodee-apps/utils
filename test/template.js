var assert = require('assert'),
    template = require('../lib/template.js');

function it(description, fnc){
    try {
        fnc();
    }
    catch(err){
        console.warn(description);
        throw err;
    }
}

function testRender(description, templateStr, model, expectedStr, expectedErrMessage){
    try {
        var rendered = template.render(templateStr, model);
        assert.strictEqual(rendered, expectedStr);
    }
    catch(err){
        if(expectedErrMessage) {
            try {
                assert.strictEqual(err.message, expectedErrMessage);
            }
            catch(err){
                console.warn(description);
                throw err;
            }
        }
        else {
            console.warn(description);
            throw err;
        }
    }
}

/*
 * run test
 */

it("should replace brackets", function () {
    var testObject = {
        'asd':23,
        'deep':{
            'deepprop':'asd',
            'deeparr':['asd',{ asd:1 }]
        }
    };

    var text = ' asdasd [[asd]] asdad asd asdas asd [[deep.deeparr.0]]';
    var result = template.replace(text, testObject);
    assert.strictEqual(result, ' asdasd 23 asdad asd asdas asd asd');

    text = ' asdasd ${asd} asdad asd asdas asd ${ deep.deeparr.0 }';
    result = template.replacer('${','}')(text, testObject);
    assert.strictEqual(result, ' asdasd 23 asdad asd asdas asd asd');
});

testRender("should convert single viariable", "Hey, @name!", { name: 'nodee' }, "Hey, nodee!");
testRender("multiple variables", "Hey, @a, @b, @c!", { a: 1, b: 2, c: 3 }, "Hey, 1, 2, 3!");
testRender("handle missing vlaue", "Hey, @abc", {}, "Hey, ");
testRender("variables value like @abc", "Hey, @a, @b, @c!", { a: "@b", b: "@c", c: "@a" }, "Hey, @b, @c, @a!");
testRender("javascript block test", "@{var name='nodee';}this is @name", {}, "this is nodee");
testRender("condition syntax test", "@if(1==0){<span>if you see this words,your test was failed!</span>}",{},"");
testRender("condition syntax test", "@{ if(1==0){ <p>hello</p> } else{ <p>world</p> } }", {}, "<p>world</p>");
testRender("loop test", "@for(var i = 0; i < 3; i++){<span>@i</span>}", {}, "<span>0</span><span>1</span><span>2</span>");
testRender("loop test", "@{ var i = 3; }@while(i--){<span>@i</span>}", {}, "<span>2</span><span>1</span><span>0</span>");
testRender("escape test", "<input yyy='@test' xxx=\"@otherAttr\" />", { test: "nodee's test", otherAttr: "\"one more test\"" }, "<input yyy='nodee&#x27;s test' xxx=\"&quot;one more test&quot;\" />");
testRender("array param test", "@for(var i = 0; i < data.length; i++){<span>@data[i]</span>}", {data: [1, 2, 3]}, "<span>1</span><span>2</span><span>3</span>");
testRender("only expression","@order.addressBilling.email",{},"");
testRender("loop expressions","<!-- <tr></tr><tr></tr> --> <a> @order.items.forEach(function(item){ <span>@item.name</span> }) </a>",{ order:{ items:[{name:'product1'},{name:'product2'}] } },"<!-- <tr></tr><tr></tr> --> <a> <span>product1</span><span>product2</span> </a>");

it("mixture test", function () {
    var str = "<select>";
    str += "@for(var i = 0; i < data.length; i++){";
    str += "<option value='@data[i]'@if(selectedIndex == i){ @' selected' }>@data[i]</option>";
    str += "}</select>";

    var html = template.render(str, {
        selectedIndex: 2,
        data: [1, 2, 3]
    });

var equalStr = "<select><option value='1'>1</option><option value='2'>2</option>";
    equalStr += "<option value='3' selected>3</option></select>";
    assert.strictEqual(html, equalStr);
});


it("Given '@@' and '}' then it should out put '@' and '}' character", function () {
    var templateStr = "{@name@@gmail.com}";
    var str = template.render(templateStr, { name: 'nodee' });
    assert.strictEqual(str, '{nodee@gmail.com}');

    var templateStr2 = "{hello @@ and }}";
    var str2 = template.render(templateStr2, { name: 'nodee' });
    assert.strictEqual(str2, '{hello @ and }}');
});

it("pass one parameter to template.render() should return a template function", function () {
    var razor = template.compile("hello!@name");
    assert.strictEqual(typeof razor, 'function');
});

it("Given a template function to template.render() then it should return a convented string", function () {
    var tf = template.compile("hello!@name");
    var str = template.render(tf, { name: 'nodee' });
    assert.strictEqual(str, 'hello!nodee');
});

it("It should use @(new XXX()) as variable", function () {
    var str = template.render("now is @(new Date().getTime())", {});
    assert.strictEqual(/^now\sis\s\d+$/.test(str), true);
});

it("should use style like @(name)", function () {
    var str = template.render("Hey, zzz@(name)zzz!", { name: 'nodee' });
    assert.strictEqual(str, "Hey, zzznodeezzz!");
});

it("@(i) style should support operation", function () {
    var str = template.render("@(i+1)", { i: 1 });
    assert.strictEqual(str, "2");
});

it("@( i ) style should support operation", function () {
    var str = template.render("@( i + 1 )", { i: 1 });
    assert.strictEqual(str, "2");
});

it("fix bug with ')'", function () {
    var str = template.render("Address:(@Address)", { Address: "test load" });
    assert.strictEqual(str, "Address:(test load)");
});

it("support variable name like @rid_child", function () {
    var templateStr = "@{var r_child_id = 'rid_1';}<hello>@r_child_id</hello>";
    var result = template.render(templateStr, {});
    assert.strictEqual(result, "<hello>rid_1</hello>");
});

it("model property do not throw error if not defined, but only variable expression", function () {
    var templateStr = "<hello>@undefinedVariable s @definedParent.undefinedChild.undefinedChild</hello>";
    var result = template.render(templateStr, { definedParent:'asdasd' });
    assert.strictEqual(result, "<hello> s </hello>");
});

it("model property throw error if not defined, and not only variable expression", function () {
    assert.throws(function(){
        var templateStr = "<hello>@undefinedVariable s @(definedParent.undefinedChild.undefinedChild - 1)</hello>";
        var result = template.render(templateStr, { definedParent:'asdasd' });
    },'Cannot read property \'undefinedChild\' of undefined');
});

it("define and use function", function () {
    var str = template.render("@{ function sayHello(){ return 'HELLO'; } }<hello>@sayHello()</hello>", {});
    assert.strictEqual(str, "<hello>HELLO</hello>");
});


it("compile throws error when trying to get global vars inside template", function () {
    assert.throws(function(){
        var templateStr = "<hello>@setTimeout(function(){ console.warn('setTimeout from inside template'); })</hello>";
        var result = template.render(templateStr, { definedParent:'asdasd' });
    },'setTimeout is not a function');
});

it("html comments", function () {
    var str = template.render("@start <!--li><a href='#features'>@whatever</a></li> --> @end", {});
    assert.strictEqual(str, " <!--li><a href='#features'>@whatever</a></li> --> ");
});

it("auto parsing email", function () {
    var str = template.render("@'asd@@asd.com' aaa@aaa.org <hello>bbb@bbb.com</hello>", {});
    assert.strictEqual(str, "asd@@asd.com aaa@aaa.org <hello>bbb@bbb.com</hello>");
});

it("translate service single quote", function () {
    var str = template.render("@T('test')", {}, { test:'TRANSLATED' });
    assert.strictEqual(str, "TRANSLATED");
});

it("translate service double quote", function () {
    var str = template.render('@T("test")', {}, { test:'TRANSLATED' });
    assert.strictEqual(str, "TRANSLATED");
});

console.log('template - OK');


// TODO:
// 1. combinations html, brackets, curlyBrackets, model, loop - with spaces, without spaces between
// 2. nesting a sibling kombinacie

// var str = `_
//         <div></div> 

//         _@for(){ 
//             mymodel.prop(function(){ 
//                 console.warn("asd}") 
//             }) 
//             @asd 
//         }_ 

//         <h1>
//             _@( asdasd - 3 + 
//                 asda.forEach(function(){ c
//                     onsole.warn(s); 
//                     function s(){}  
//                 })
//             ) _

//             <hello></hello> asdasd @( simplebrackets.asd )_
//         </h1>@asd<b></b>

//         <p>@model.forEach(function(){ x= 5;  }) </p>

//         @a@b@c

//         <div>

//         @{
//             var x = { <p></p> @model };
//             <span>asd</span>

//             x.forEach(function(){


//             })
//         }

//         </div>

// EOF`;

// var str1 = `<div>@{
//             var x = { <p></p> @model };
//             <span>asd</span>
//             x.forEach(function(){})
//         }</div>`;

// var str3 = `<p></p>@{ x={}; }_`;

// var str4 = '<p>@{ @model.forEach(function(){ x= 5;  }) }</p>';

// var str5 = '@{ var x = { <p></p> @model }; <span>asd</span> x.forEach( function(){ }) }';

// var str6 = '_@for(){ mymodel.prop(function(){ console.warn("asd}") }) @asd }_'; 

// var str7 = '</h1>@asd*<b></b> @{}_ @a@b@c#';

// //html, code, html, code
// //var str = '<div> @model-1 asdasd @for(var i=0;i<3;i++){ <span @i asd > }</div>';
// var str = '<div> @model-1 asdasd @for(var i=0;i<3;i++){ <span class="dark-@i @model">@model@s</span>}@{var ds= "DS";@ds }</div>';
// var str = '@{var ds= "DS";@ds}';