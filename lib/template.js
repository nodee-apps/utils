'use strict';

/*
 * Very simple view engine for replacing variables in plain text template,
 * it helps when filling email templates, etc...
 */

var object = require('./object.js');
require('./regexp.js');

module.exports = {
    replacer: replacer,
    render: replacer('[[', ']]'),
    replace: replacer('[[', ']]')
};

// replace all data
function replacer(startString, endString){
    var startStringEscaped = startString.escape();
    var endStringEscaped = endString.escape();
    var matchRegexp = new RegExp(startStringEscaped + '([^' +startString[0].escape() + endString[0].escape()+ ']+)' + endStringEscaped,'g');
    
    return function(template, model){
        var brackets = template.match(matchRegexp) || [],
            value;

        for(var i=0;i<brackets.length;i++){
            brackets[i] = brackets[i].replace(startString,'').replace(endString,'');
            value = object.getValue(model, brackets[i].trim()) || '';
            template = template.replace(new RegExp(startStringEscaped + brackets[i] + endStringEscaped,'g'), value);
        }

        return template;
    };
}