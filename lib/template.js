'use strict';

/*
 * 1. Simple view engine inspired by c# razor syntax
 * 2. String replacer for replacing variables in plain text, used before implementation of razor view engine
 */

var object = require('./object.js');
require('./regexp.js');
require('./string.js');

module.exports = {
    // simple replacer, not razor like
    replacer: replacer,
    replace: replacer('[[', ']]'),

    // razor like view engine with safe scope compile mode
    render: function(templateStrOrFncOrParser, model, locals){
        return this.compile(templateStrOrFncOrParser)(model, locals);
    },
    compile: function(templateStrOrFncOrParser){
        if(typeof templateStrOrFncOrParser === 'string') return this.createRenderer( this.parse(templateStrOrFncOrParser) );
        else if(typeof templateStrOrFncOrParser === 'function') return templateStrOrFncOrParser;
        else if(templateStrOrFncOrParser instanceof TemplateParser) return this.createRenderer(templateStrOrFncOrParser);

        throw new Error('Wrong arguments');
    },
    parse: function(templateStr){
        return parse(templateStr);
    },
    createRenderer: function(parserOrParsedStr){
        var fncBody = isolatedVars + 
                      deepGetFnc + ' ' + 
                      'var helpers=this;var __r=[];locals=locals||{};function T(text){return helpers.html.escape(locals[text]||text);};with(model||{}){' +
                      (typeof parserOrParsedStr === 'string' ? parserOrParsedStr : parserOrParsedStr.parts.join('')) +
                      ' return __r.join("");}';
        var renderer = new Function('model','locals', fncBody);
        return renderer.bind(this.helpers);
    },
    helpers:{
        html:{
            escape: function (value) {
                value = typeof value === 'undefined' ? '' : (value + '');
                return value
                        .replace(/&/g, '&amp;')
                        .replace(/</g, '&lt;')
                        .replace(/>/g, '&gt;')
                        .replace(/"/g, '&quot;')
                        .replace(/'/g, '&#x27;')
                        .replace(/\//g, '&#x2F;');
            }
        }
    }
};

/*
 * String replacer for replacing variables in plain text, used before implementation of razor view engine
 */
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

/*
* Razor like template engine
*/

// javascript eval and async global objects
var isolatedVars = 'var '+object.globalsList.js.join(',')+';';
// Nodejs eval and async global objects
isolatedVars += 'var '+object.globalsList.node.join(',')+';';

var deepGetFnc = object.deepGet.toString();

// void html tags
// area, base, br, col, command, embed, hr, img, input, keygen, link, meta, param, source, track, wbr
// comments and defs
// !DOCTYPE, <!-- -->

var voidHtmlTags = { '!doctype':1, 'area':1, 'base':1, 'br':1, 'col':1, 'command':1, 'embed':1, 'hr':1, 'img':1, 'input':1, 'keygen':1, 'link':1, 'meta':1, 'param':1, 'source':1, 'track':1, 'wbr':1 };

function startOfHtmlTag(position, str){
    if(str[position] !== '<') return;
    if(str[position+1] === '/') return;
    
    // <!-- html comment start
    if(str[position+1]==='!' && str[position+2]==='-' && str[position+2]==='-') return { 
        tagName: '!--', 
        count: 1
    }
    var len = str.length, p = position+1;

    while(p < len){
        if(str[p] === '>'){
            var tag = str.slice(position+1,p);
            var tagName = tag.split(/\s|\//)[0].toLowerCase();
            if(!/^[a-zA-Z-]+[^<\/]*\/?$/.test(tag)) return;
            else return { 
                tagName: tagName, 
                count: voidHtmlTags[ tagName ] ? 1 : 2
            }
        }
        p++;
    }
}

function endOfHtmlTag(position, str){
    if(str[position] !== '>') return;
    // --> end of html comment
    if(str[position-1]==='-' && str[position-2]==='-') return { 
        tagName: '!--', 
        count: 1
    }
    var p = position-1;

    while(p >= 0){
        if(str[p] === '<'){
            var tag = str.slice(p+1,position);
            var tagName = tag.split(/\s|\//);
            tagName = (tagName[0] || tagName[1]).toLowerCase();
            if(!/^\/?[a-zA-Z-]+[^<\/]*\/?$/.test(tag)) return;
            else return { 
                tagName: tagName, 
                count: 1
            }
        }
        p--;
    }
}

function countOfHtmlTag(position, str, elemCounts){
    var start = startOfHtmlTag(position, str) || { count:0 };
    var end = endOfHtmlTag(position, str) || { count:0 };
    if(!start.tagName && !end.tagName) return 0;
    var tagName = start.tagName || end.tagName;

    if(elemCounts['!--'] && !end.count && !tagName==='!--') return elemCounts['!--'];

    elemCounts[ tagName ] = elemCounts[ tagName ] || 0;
    elemCounts[ tagName ] += (start.count - end.count);
    elemCounts.__sum = elemCounts.__sum || 0;
    elemCounts.__sum += (start.count - end.count);

    elemCounts.__tagHead = voidHtmlTags[ tagName ] ? elemCounts[ tagName ] === 1 : elemCounts[ tagName ] === 2;
    return elemCounts.__sum;
}

function startOfExpression(position, str){
    var mayBeExpression = str[position] === '@' && 
                          str[position-1] !== '@' && 
                          str[position+1] !== '@';

    if(!mayBeExpression) return false;
    if(!/[a-zA-Z0-9]/.test(str[position-1]||'')) return true;
    var pos = position+1, len = str.length;
    
    while(pos < len && /[a-zA-Z0-9.-]/.test( str[pos] )){
        pos++;
    }
    return !/[a-zA-Z0-9.-]+\.[a-zA-Z]{2,9}/.test( str.slice(position+1,pos+1) );
}

function parsingError(msg, templateStr, position){
    templateStr = templateStr.slice(0, position+1);
    var line = (templateStr.match(/\n/g) || []).length+1;
    templateStr = (templateStr.match(/\n.+$/g) || [templateStr])[0];
    var col = templateStr.length-1;
    throw new Error(msg + ', at line '+line+' col '+col);
}

function TemplateParser(){
    this.parts = [];
    this.position = this.position || 0;
    this.lastSlicePosition = this.lastSlicePosition || 0;
    this.lastSlicePosition = this.lastSlicePosition || 0;
    this.parentMode = this.parentMode || []; // 'code'
    this.mode = this.mode || 'html'; // 'code'
    this.expressionType = []; // 'curlyBrackets', 'brackets', 'model', 'loop'='curlyBrackets'
    this.elemCounts = this.elemCounts || {};
    this.lastCount = this.lastCount || [];
    this.parentBrackets = this.parentBrackets || []; // { curlyOpens:curlyOpens, opens:opens, squareOpens:squareOpens }
}

function parse(str){
    var len = str.length,
        opens = 0,
        closes = 0,
        curlyOpens = 0,
        curlyCloses = 0,
        squareOpens = 0,
        squareCloses = 0,
        lastHtmlTag,
        insideHtmlComment = false,
        insideSingleQuotes = false,
        insideDoubleQuotes = false,
        lastCodeType,
        charRepeat;

    var parser = new TemplateParser();

    function checkBracketsPairs(opens, closes, curlyOpens, curlyCloses, squareOpens, squareCloses){
        if(opens > closes) parsingError('Expression Missing ")"', str, parser.position);
        else if(closes > opens) parsingError('Unmatched ")"', str, parser.position);
        else if(curlyOpens > curlyCloses) parsingError('Expression Missing "}"', str, parser.position);
        else if(curlyCloses > curlyOpens) parsingError('Unmatched "}"', str, parser.position);
        else if(squareOpens > squareCloses) parsingError('Expression Missing "]"', str, parser.position);
        else if(squareCloses > squareOpens) parsingError('Unmatched "["', str, parser.position);
    }

    function checkHtmlTagPairs(){
        if(parser.elemCounts.__sum > 0) {
            for(var tagName in parser.elemCounts){
                if(tagName !== '__sum' && tagName !== '__tagHead' && parser.elemCounts[tagName] !== 0) return parsingError('Unclosed html tag "' +tagName+ '"', str, parser.position);
            }
        }
    }

    function endOfExpression(){
        var parentBrackets = parser.parentBrackets[ parser.parentBrackets.length-1 ] || { 
            curlyOpens: 0, 
            curlyCloses: 0, 
            squareOpens: 0, 
            squareCloses: 0, 
            opens: 0, 
            closes: 0
        };
        var brackets = {
            opens: opens - parentBrackets.opens,
            closes: closes - parentBrackets.closes,
            curlyOpens: curlyOpens - parentBrackets.curlyOpens,
            curlyCloses: curlyCloses - parentBrackets.curlyCloses,
            squareOpens: squareOpens - parentBrackets.squareOpens,
            squareCloses: squareCloses - parentBrackets.squareCloses
        };

        if(brackets.closes > brackets.opens){
            if(parser.parentMode[ parser.parentMode.length-1 ] === 'code') parsingError('Unmatched ")"', str, parser.position);
            else return true;
        }
        else if(lastCodeType !== 'model' && brackets.curlyCloses > brackets.curlyOpens) {
            if(parser.parentMode[ parser.parentMode.length-1 ] === 'code') parsingError('Unmatched "}"', str, parser.position);
            else return true;
        }
        else if(brackets.squareCloses > brackets.squareOpens) {
            if(parser.parentMode[ parser.parentMode.length-1 ] === 'code') parsingError('Unmatched "]"', str, parser.position);
            else return true;
        }
        else if(brackets.opens > brackets.closes  || 
                brackets.curlyOpens > brackets.curlyCloses ||
                brackets.squareOpens > brackets.squareCloses) {
            // brackets not closed, therefore it can not be end of expression
            return false;
        }
        else if((lastCodeType === 'curlyBrackets' || lastCodeType === 'loop') && brackets.curlyOpens > 0) {
           return true;
        }

        else if(lastCodeType === 'brackets' && brackets.opens > 0) {
            return true;
        }

        // "@" or " " or startHtmlTag
        else if(lastCodeType === 'model' &&
                parser.lastSlicePosition !== parser.position + 1 &&
               (
                   (brackets.squareOpens === brackets.squareCloses &&
                   !insideSingleQuotes && !insideDoubleQuotes &&
                    /[ \n\r]|[^a-zA-Z0-9$_\[\]\.]/.test(str[parser.position])) ||

                    !insideSingleQuotes && !insideDoubleQuotes && startOfHtmlTag(parser.position, str) ||
                    !insideSingleQuotes && !insideDoubleQuotes && startOfExpression(parser.position, str) ||
                    (((insideSingleQuotes && str[parser.position]==='\'') || 
                      (insideDoubleQuotes && str[parser.position]==='"')) && !startOfExpression(parser.position-1, str))
                )){
            return true;
        }

        else if(parser.position >= len-1) {
            parser.position++; // catch last char
            return true;
        }
    }

    while(parser.position < len){
        //console.warn(str[parser.position], lastCodeType, parser.mode, parser.parentMode, curlyOpens, curlyCloses, parser.elemCounts, insideHtmlComment);
        if( !insideSingleQuotes && 
            !insideDoubleQuotes && 
            str[parser.position] === '@' 
            && str[parser.position-1] === '@') {
            
            // asdasd<asd></asd>@@something
            str = str.replaceAt('', parser.position);
            parser.position++;
            continue;
        }

        // 1. html parsing mode
        //     - dive into code mode - only by "@" expressions like @model, @( ... ) or @{ ... }
        //     - come back to parent mode - only by ending html tags
        //     - all content is plain text - __r.push("escaped string")
        if(parser.mode === 'html'){
            //htmlOpens += startOfHtmlTag(parser.position, str);
            //htmlCloses += endOfHtmlTag(parser.position, str);
            countOfHtmlTag(parser.position, str, parser.elemCounts);
            insideHtmlComment = parser.elemCounts['!--'];

            // end of template, just save prev string
            if(parser.position >= len-1) {
                checkHtmlTagPairs();
                // checkBracketsPairs(opens, closes, curlyOpens, curlyCloses, squareOpens, squareCloses);
                parser.parts.push( '\n__r.push("'+str.slice(parser.lastSlicePosition).replace(/"/g,'\\"').replace(/\r?\n/g,'\\n')+'");' ); // save prev string as text
            }

            // come back to parent mode - only by ending html tags
            else if(!insideHtmlComment && parser.elemCounts.__sum >= 0 && parser.elemCounts.__sum === parser.lastCount[ parser.lastCount.length-1 ]){ // end of html mode
                parser.parts.push( '\n__r.push("'+str.slice(parser.lastSlicePosition, parser.position+1).replace(/"/g,'\\"').replace(/\r?\n/g,'\\n')+'");' ); // save prev string as text
                parser.lastSlicePosition = parser.position;
                parser.mode = parser.parentMode.pop() || 'html'; // bubble up to parentMode, default is html mode
                parser.lastCount.pop();
                parser.lastSlicePosition++; // skip "@" in next content
            }

            // dive into code mode - only by "@" expressions like @model, @( ... ) or @{ ... }
            else if(!insideHtmlComment && !insideSingleQuotes && !insideDoubleQuotes && startOfExpression(parser.position, str)){ // start of expression
                parser.parts.push( '\n__r.push("'+str.slice(parser.lastSlicePosition, parser.position).replace(/"/g,'\\"').replace(/\r?\n/g,'\\n')+'");' ); // save prev string as text, without "@"
                parser.lastSlicePosition = parser.position;
                parser.parentMode.push('html');
                parser.mode = 'code';

                // store brackets counts for pairing when step out of expression
                parser.parentBrackets.push({ 
                    curlyOpens: curlyOpens, 
                    curlyCloses: curlyCloses,
                    opens: opens,
                    closes: closes,
                    squareOpens: squareOpens,
                    squareCloses: squareCloses
                });

                if(str[parser.position+1] === '{') {
                    parser.lastSlicePosition++; // skip "@" and "{" in next content
                    parser.expressionType.push('curlyBrackets');
                }
                else if(str[parser.position+1] === '(') {
                    parser.expressionType.push('brackets');
                }
                else if( str.slice( parser.position+1, parser.position+1+3 ) === 'if(' || 
                         str.slice( parser.position+1, parser.position+1+4 ) === 'for(' || 
                         str.slice( parser.position+1, parser.position+1+6 ) === 'while(') {
                        parser.expressionType.push('loop');
                }
                else {
                    parser.expressionType.push('model');
                    parser.position++; // skip "@" to avoid duplicite nesting in code mode
                }
                parser.position--; // back to brackets or first expression char
                parser.lastSlicePosition++; // skip "@" in next content
                lastCodeType = parser.expressionType[ parser.expressionType.length-1 ];
            }

            parser.position++;
            continue;
        }

        // 2. code parsing mode
        //     - come back to parent mode - by ending with "}" or ")" or "@" or " " or startHtmlTag
        //     - dive into nested code mode - only inside curly brackets {} and only by "@" expressions like @model, @( ... ) or @{ ... }
        //     - dive into html mode - only inside curly brackets {} and only by start of html tags
        //     - all content as code to eval
        else if(parser.mode === 'code'){
            if( !charRepeat && str[parser.position] === '\'' && str[parser.position-1]!== '\\' && !insideDoubleQuotes) insideSingleQuotes = !insideSingleQuotes;
            else if( !charRepeat && str[parser.position] === '"' && str[parser.position-1]!== '\\' && !insideSingleQuotes) insideDoubleQuotes = !insideDoubleQuotes;

            if(!insideSingleQuotes && !insideDoubleQuotes && !charRepeat) {
                if( str[parser.position] === '(') opens++;
                else if(str[parser.position] === ')') closes++;
                else if(str[parser.position] === '{') curlyOpens++;
                else if(str[parser.position] === '}') curlyCloses++;
                else if(str[parser.position] === '[') squareOpens++;
                else if(str[parser.position] === ']') squareCloses++;
            }
            charRepeat = false;

            // come back to parent mode - by ending with "}" or ")" or "@" or " " or startHtmlTag
            if(endOfExpression()){ // end of code mode
                var parentBrackets = parser.parentBrackets[ parser.parentBrackets.length-1 ] || { 
                    curlyOpens: 0, 
                    curlyCloses: 0, 
                    opens: 0, 
                    closes: 0,
                    squareOpens: 0, 
                    squareCloses: 0
                };
                var brackets = {
                    opens: opens - parentBrackets.opens,
                    closes: closes - parentBrackets.closes,
                    curlyOpens: curlyOpens - parentBrackets.curlyOpens,
                    curlyCloses: curlyCloses - parentBrackets.curlyCloses,
                    squareOpens: squareOpens - parentBrackets.squareOpens,
                    squareCloses: squareCloses - parentBrackets.squareCloses
                };

                var isNestedCode = (parser.parentBrackets[ parser.parentBrackets.length-2 ] || {}).hasChildCode;
                if(!isNestedCode && parser.parentMode[ parser.parentMode.length-1 ] === 'code') checkBracketsPairs(brackets.opens, brackets.closes, brackets.curlyOpens, brackets.curlyCloses, brackets.squareOpens, brackets.squareCloses);

                var insideTagHead = parser.elemCounts.__tagHead;
                var endOfValueWithoutBrackets = lastCodeType === 'model' && 
                                                brackets.opens === 0 &&
                                                brackets.curlyOpens === 0 ? true : false;

                var endOfValueAsString = lastCodeType === 'model' && (str[parser.lastSlicePosition] === '"' || str[parser.lastSlicePosition] === '\'');
                
                var positionIncrement = (endOfValueWithoutBrackets && !endOfValueAsString) ? 0 : 1;
                if(lastCodeType === 'curlyBrackets') {
                    positionIncrement = 0;
                }
                if(str[parser.lastSlicePosition] === '{') parser.lastSlicePosition++; // skip "{" if parent is curlyBrackets
                var expStr = str.slice(parser.lastSlicePosition, parser.position + positionIncrement);

                var prevTypeCode = parser.expressionType[ parser.expressionType.length-2 ];
                if(endOfValueAsString) { // just string
                    parser.parts.push( '\n__r.push('+( insideTagHead ? 'this.html.escape(' : '' )+ expStr +( insideTagHead ? ')' : '' )+');' ); // save prev string as result
                }
                else if(endOfValueWithoutBrackets && brackets.squareOpens === 0 && /[a-zA-Z0-9_$.]/.test(expStr)) { // simple object, try to deepGet
                    var valueParts = expStr.split('.');
                    parser.parts.push( '\n__r.push('+( insideTagHead ? 'this.html.escape(' : '' )+'typeof '+valueParts[0]+' === "undefined" ? "" :  deepGet(' + valueParts[0] + ',"' +(valueParts.length > 1 ? valueParts.slice(1).join('.') : 'this')+ '")'+( insideTagHead ? ')' : '' )+');' ); // save prev string as result
                }
                else if(!parentBrackets.hasChildHtml && 
                        !parentBrackets.hasChildCode && 
                        (lastCodeType === 'model' || lastCodeType === 'brackets')){ // expressions that returns template part string
                    
                    parser.parts.push( '\n__r.push('+( insideTagHead ? 'this.html.escape(' : '' ) + expStr + ( insideTagHead ? ')' : '' ) + ');' ); // save prev string as result
                }
                else parser.parts.push( '\n'+ expStr ); // save prev string as code to eval
                
                parser.lastSlicePosition = parser.position + (lastCodeType === 'curlyBrackets' ? 1 : positionIncrement); // force to skip "}"
                
                parser.mode = parser.parentMode.pop() || 'html'; // bubble up to parentMode, default is html mode
                parser.expressionType.pop();
                lastCodeType = parser.expressionType[ parser.expressionType.length-1 ];
                // go back to previous opened counts
                parser.parentBrackets.pop();

                if(parser.mode === 'code') charRepeat = true;
                parser.position--; // back to last char, to ensure it will check if this is not start or end of another expression
                insideDoubleQuotes = false; // reset quotes when leaving code mode
                insideSingleQuotes = false; // reset quotes when leaving code mode
            }

            // dive into nested code mode - only inside curly brackets {} and only by "@" expressions like @model, @( ... ) or @{ ... }
            else if(curlyOpens > 0 && curlyOpens > curlyCloses && startOfExpression(parser.position, str)){ // start of nested expression
                if(str[parser.lastSlicePosition] === '{') parser.lastSlicePosition++; // skip "{" if parent is curlyBrackets
                parser.parts.push( '\n'+str.slice(parser.lastSlicePosition, parser.position) ); // save prev string as code to eval, without "@"
                parser.lastSlicePosition = parser.position;
                parser.parentMode.push('code');
                parser.mode = 'code';

                // mark this level as parent of another code
                parser.parentBrackets[ parser.parentBrackets.length-1 ].hasChildCode = true;

                // store brackets counts for pairing when step out of expression
                parser.parentBrackets.push({ 
                    curlyOpens: curlyOpens, 
                    curlyCloses: curlyCloses,
                    opens: opens,
                    closes: closes,
                    squareOpens: squareOpens, 
                    squareCloses: squareCloses
                });

                if(str[parser.position+1] === '{') {
                    parser.expressionType.push('curlyBrackets');
                }
                else if(str[parser.position+1] === '(') {
                    parser.expressionType.push('brackets');
                }
                else if( str.slice( parser.position+1, parser.position+1+3 ) === 'if(' || 
                         str.slice( parser.position+1, parser.position+1+4 ) === 'for(' || 
                         str.slice( parser.position+1, parser.position+1+6 ) === 'while(') {
                        parser.expressionType.push('loop');
                }
                else parser.expressionType.push('model');
                
                parser.lastSlicePosition++; // skip "@" next time
                lastCodeType = parser.expressionType[ parser.expressionType.length-1 ];
            }

            // dive into html mode - only inside curly brackets {} and only by start of html tags
            else if(curlyOpens > 0 && curlyOpens > curlyCloses && (lastHtmlTag = startOfHtmlTag(parser.position, str))){
                // mark this level as parent of another html
                parser.parentBrackets[ parser.parentBrackets.length-1 ].hasChildHtml = true;

                if(str[parser.lastSlicePosition] === '{') parser.lastSlicePosition++; // skip "{" if parent is curlyBrackets
                parser.parts.push('\n'+ str.slice(parser.lastSlicePosition, parser.position) ); // save prev string as code to eval
                parser.lastSlicePosition = parser.position;
                parser.parentMode.push('code');
                parser.mode = 'html';
                parser.lastCount.push(parser.elemCounts.__sum || 0);
                parser.position--; // back to last expression char, because this char is beginning of html element "<"
            }

            // end of template, check pairing
            if(parser.position >= len-1) {
                checkHtmlTagPairs();
                checkBracketsPairs(opens, closes, curlyOpens, curlyCloses, squareOpens, squareCloses);
            }
        }

        parser.position++;
    }

    return parser;
}

//console.warn( module.exports.parse(" <!-- <asd></asd> --> <a> @order.items.forEach(function(item){ <span>@item.name</span> }) </a>"));