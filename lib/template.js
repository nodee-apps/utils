'use strict';

/*
 * Very simple view engine for replacing variables in plain text template,
 * it helps when filling email templates, etc...
 */

var object = require('./object.js');

module.exports = {
    render: replace,
};

// replace all data
function replace(template, model){
    var brackets = template.match(/\[\[([^\[\]]+)\]\]/g) || [],
        value;
    
    for(var i=0;i<brackets.length;i++){
        brackets[i] = brackets[i].replace('[[','').replace(']]','');
        value = object.getValue(model, brackets[i]) || '';
        template = template.replace(new RegExp('\\[\\['+ brackets[i] +'\\]\\]','g'), value);
    }
    
    return template;
}