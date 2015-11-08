'use strict';
    
// using bundled module https://github.com/chriso/validator.js
var validator = module.exports = require('validator');
require('./string.js'); // init string extensions

/*
 * Custom validators - returns true/false, but also can modify value
 */

// alias
validator.isInteger = validator.isInt;

// value have to be defined, empty string, or zero is valid
validator.isDefined = function(value) {
    return !(value === null || value === undefined);
}

validator.isString = function(value) {
    return typeof value === 'string';
}

validator.isArray = function(value) {
    return Array.isArray(value);
}

validator.isBoolean = function(value) {
    return typeof value === 'boolean';
};

validator.minLength = function(value, minLength){
    if((typeof value === 'string' || Array.isArray(value)) && value.length >= minLength) return true;
    else return false;
};

validator.maxLength = function(value, maxLength){
    if((typeof value === 'string' || Array.isArray(value)) && value.length <= maxLength) return true;
    else return false;
};

// math round
validator.round = function(value, digits){
    var koef = Math.pow(10, parseInt(digits || 0, 10) || 0);
    
    if(typeof value !== 'number') return false;
    this.value = Math.round(koef*(parseFloat(value || 0, 10) || 0))/koef;
    return true;
};

// parsing date
validator.parseDate =
validator.toDate =
validator.date = function(value, formatString){
    
    // if object is already a Date, return
    if(Object.prototype.toString.call(value) === '[object Date]') return true;
    else if(typeof value !== 'string') return false;
    
    // '2014-10-18T22:00:20' (date) - 'yyyy-MM-ddTHH:mm:ss' (formatString)
    // if no format string use native Date.parse
    if(typeof formatString!=='string') {
        value = new Date(Date.parse(value));
        if(value) {
            this.value = value;
            return true;
        }
        else return false;
    }
    
    // use custom format fucntion
    value = getDateFromFormat(value, formatString);
    
    if(value === 0) return false;
    else {
        this.value = new Date(value);
        return true;
    }
};

// format date
validator.toDateString = function(value, formatString){
    if(Object.prototype.toString.call(value) !== '[object Date]') return false;
    
    // '2014-10-18T22:00:20' (date) - 'yyyy-MM-ddTHH:mm:ss' (formatString)
    // if no format string use native Date.toString()
    if(typeof formatString!=='string') this.value = value.toString();
    else this.value = formatDate(value, formatString);
    
    return true;
};

// custom validation function
validator.customValidation = function(value, func){
    if(typeof func !== 'function') throw new Error('Cannot validate, second argument have to be function');
    return func.call(this, value);
};

// modify object keys
validator.keyNames = function(value, fnc){

    if(Object.prototype.toString.call(value) !== '[object Object]' ||
       typeof fnc !== 'function') {
        
        return false;
    }
    
    var newKey;
    for(var key in value){
        newKey = fnc(key);
        this.value[ newKey ] = this.value[ key ];
        if(key!==newKey) delete this.value[ key ];
    }
    return true;
};

validator.isIn = function(value, elm1, elm2, elmX) {
    for(var i=1;i<arguments.length;i++) if(arguments[i]===value) return true;
    return false;
};

    
/*
 * Custom sanitizers - returns modified value
 */

// always sets this value
validator.setValue = function(value, setValue) {
    return setValue;
};

// sets value if it's null or undefined or empty string
validator.defaultValue = function(value, defaultValue) {
    return (typeof value === 'undefined' || value === null || value === '') ? defaultValue : value;
};

// copy value from another model property, if it is used as model sanitizer
validator.valueFrom = function(value, modelPropName) {
    if(typeof modelPropName === 'string' && this.model) {
        value = this.model[ modelPropName ];
        return value;
    }
};

// custom modify function
validator.customSanitization = function(value, func){
    if(typeof func !== 'function') throw new Error('Cannot sanitize, second argument have to be function');
    return func(value);
};
    
// remove not allowed characters from url
validator.cleanUrl = function(value){
    value = validator.toString(value);
    
    // '/' is reserved symbol for root domain path
    if(value !== '/') {
        value = value.removeDiacritics();
        value = value.replace(/[ ]+/g,'-').replace(/[^a-z0-9\-_\.]+/g,'');
    }
    
    return value;
};

// generate fulltext array
validator.fullText = function(value){
    if(value === undefined) return undefined;
    value = validator.toString(value)
                     .removeDiacritics()
                     .replace(/[^a-z0-9_]+/g,' ')
                     .replace(/[\s]{2,}/g,' ')
                     .replace(/[y]+/g,'i');
    
    return value.split(' ');
};

validator.toInt = validator.toInteger = function(str, radix) {
    return parseInt(str, radix===true ? 10 : radix || 10);
};


/*
 * sanitize hlpers
 */

/*
 * Borrowed from: http://www.mattkruse.com/javascript/date/source.html
 * Author: Matt Kruse <matt@mattkruse.com>
 * WWW: http://www.mattkruse.com/
 */

// ------------------------------------------------------------------
// These functions use the same 'format' strings as the 
// java.text.SimpleDateFormat class, with minor exceptions.
// The format string consists of the following abbreviations:
// 
// Field        | Full Form          | Short Form
// -------------+--------------------+-----------------------
// Year         | yyyy (4 digits)    | yy (2 digits), y (2 or 4 digits)
// Month        | MMM (name or abbr.)| MM (2 digits), M (1 or 2 digits)
//              | NNN (abbr.)        |
// Day of Month | dd (2 digits)      | d (1 or 2 digits)
// Day of Week  | EE (name)          | E (abbr)
// Hour (1-12)  | hh (2 digits)      | h (1 or 2 digits)
// Hour (0-23)  | HH (2 digits)      | H (1 or 2 digits)
// Hour (0-11)  | KK (2 digits)      | K (1 or 2 digits)
// Hour (1-24)  | kk (2 digits)      | k (1 or 2 digits)
// Minute       | mm (2 digits)      | m (1 or 2 digits)
// Second       | ss (2 digits)      | s (1 or 2 digits)
// AM/PM        | a                  |
//
// NOTE THE DIFFERENCE BETWEEN MM and mm! Month=MM, not mm!
// Examples:
//  "MMM d, y" matches: January 01, 2000
//                      Dec 1, 1900
//                      Nov 20, 00
//  "M/d/yy"   matches: 01/20/00
//                      9/2/00
//  "MMM dd, yyyy hh:mm:ssa" matches: "January 01, 2000 12:30:45AM"
// ------------------------------------------------------------------
var MONTH_NAMES= ['January','February','March','April','May','June','July','August','September','October','November','December','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
var DAY_NAMES= ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
function LZ(x) {return(x<0||x>9?'':'0')+x}

// ------------------------------------------------------------------
// formatDate (date_object, format)
// Returns a date in the output format specified.
// The format string uses the same abbreviations as in getDateFromFormat()
// ------------------------------------------------------------------
function formatDate(date,format) {
    format=format+'';
    var result='';
    var i_format=0;
    var c='';
    var token='';
    var y=date.getYear()+'';
    var M=date.getMonth()+1;
    var d=date.getDate();
    var E=date.getDay();
    var H=date.getHours();
    var m=date.getMinutes();
    var s=date.getSeconds();
    var yyyy,yy,MMM,MM,dd,hh,h,mm,ss,ampm,HH,H,KK,K,kk,k;
    // Convert real date parts into formatted versions
    var value= {};
    if (y.length < 4) {y=''+(y-0+1900);}
    value['y']=''+y;
    value['yyyy']=y;
    value['yy']=y.substring(2,4);
    value['M']=M;
    value['MM']=LZ(M);
    value['MMM']=MONTH_NAMES[M-1];
    value['NNN']=MONTH_NAMES[M+11];
    value['d']=d;
    value['dd']=LZ(d);
    value['E']=DAY_NAMES[E+7];
    value['EE']=DAY_NAMES[E];
    value['H']=H;
    value['HH']=LZ(H);
    if (H===0){value['h']=12;}
    else if (H>12){value['h']=H-12;}
    else {value['h']=H;}
    value['hh']=LZ(value['h']);
    if (H>11){value['K']=H-12;} else {value['K']=H;}
    value['k']=H+1;
    value['KK']=LZ(value['K']);
    value['kk']=LZ(value['k']);
    if (H > 11) { value['a']='PM'; }
    else { value['a']='AM'; }
    value['m']=m;
    value['mm']=LZ(m);
    value['s']=s;
    value['ss']=LZ(s);
    while (i_format < format.length) {
            c=format.charAt(i_format);
            token='';
            while ((format.charAt(i_format)===c) && (i_format < format.length)) {
                    token += format.charAt(i_format++);
                    }
            if (value[token] != null) { result=result + value[token]; }
            else { result=result + token; }
            }
    return result;
}

// ------------------------------------------------------------------
// getDateFromFormat( date_string , format_string )
//
// This function takes a date string and a format string. It matches
// If the date string matches the format string, it returns the 
// getTime() of the date. If it does not match, it returns 0.
// ------------------------------------------------------------------
function getDateFromFormat(val,format) {
    val=val+'';
    format=format+'';
    var i_val=0;
    var i_format=0;
    var c='';
    var token='';
    var token2='';
    var x,y;
    var now=new Date();
    var year=now.getYear();
    var month=now.getMonth()+1;
    var date=1;
    var hh=now.getHours();
    var mm=now.getMinutes();
    var ss=now.getSeconds();
    var ampm='';
    
    while (i_format < format.length) {
            // Get next token from format string
            c=format.charAt(i_format);
            token='';
            
            while ((format.charAt(i_format)===c) && (i_format < format.length)) {
                    token += format.charAt(i_format++);
                    }
            // Extract contents of value based on format token
            if (token==='yyyy' || token==='yy' || token==='y') {
                    if (token==='yyyy') { x=4;y=4; }
                    if (token==='yy')   { x=2;y=2; }
                    if (token==='y')    { x=2;y=4; }
                    year=_getInt(val,i_val,x,y);
                    if (year==null) { return 0; }
                    i_val += year.length;
                    if (year.length===2) {
                            if (year > 70) { year=1900+(year-0); }
                            else { year=2000+(year-0); }
                            }
                    }
            else if (token==='MMM'||token==='NNN'){
                    month=0;
                    for (var i=0; i<MONTH_NAMES.length; i++) {
                            var month_name=MONTH_NAMES[i];
                            if (val.substring(i_val,i_val+month_name.length).toLowerCase()===month_name.toLowerCase()) {
                                    if (token==='MMM'||(token==='NNN'&&i>11)) {
                                            month=i+1;
                                            if (month>12) { month -= 12; }
                                            i_val += month_name.length;
                                            break;
                                            }
                                    }
                            }
                    if ((month < 1)||(month>12)){return 0;}
                    }
            else if (token==='EE'||token==='E'){
                    for (var i=0; i<DAY_NAMES.length; i++) {
                            var day_name=DAY_NAMES[i];
                            if (val.substring(i_val,i_val+day_name.length).toLowerCase()===day_name.toLowerCase()) {
                                    i_val += day_name.length;
                                    break;
                                    }
                            }
                    }
            else if (token==='MM'||token==='M') {
                    month=_getInt(val,i_val,token.length,2);
                    if(month==null||(month<1)||(month>12)){return 0;}
                    i_val+=month.length;}
            else if (token==='dd'||token==='d') {
                    date=_getInt(val,i_val,token.length,2);
                    if(date==null||(date<1)||(date>31)){return 0;}
                    i_val+=date.length;}
            else if (token==='hh'||token==='h') {
                    hh=_getInt(val,i_val,token.length,2);
                    if(hh==null||(hh<1)||(hh>12)){return 0;}
                    i_val+=hh.length;}
            else if (token==='HH'||token==='H') {
                    hh=_getInt(val,i_val,token.length,2);
                    if(hh==null||(hh<0)||(hh>23)){return 0;}
                    i_val+=hh.length;}
            else if (token==='KK'||token==='K') {
                    hh=_getInt(val,i_val,token.length,2);
                    if(hh==null||(hh<0)||(hh>11)){return 0;}
                    i_val+=hh.length;}
            else if (token==='kk'||token==='k') {
                    hh=_getInt(val,i_val,token.length,2);
                    if(hh==null||(hh<1)||(hh>24)){return 0;}
                    i_val+=hh.length;hh--;}
            else if (token==='mm'||token==='m') {
                    mm=_getInt(val,i_val,token.length,2);
                    if(mm==null||(mm<0)||(mm>59)){return 0;}
                    i_val+=mm.length;}
            else if (token==='ss'||token==='s') {
                    ss=_getInt(val,i_val,token.length,2);
                    if(ss==null||(ss<0)||(ss>59)){return 0;}
                    i_val+=ss.length;}
            else if (token==='a') {
                    if (val.substring(i_val,i_val+2).toLowerCase()==='am') {ampm='AM';}
                    else if (val.substring(i_val,i_val+2).toLowerCase()==='pm') {ampm='PM';}
                    else {return 0;}
                    i_val+=2;}
            else {
                    if (val.substring(i_val,i_val+token.length)!==token) {return 0;}
                    else {i_val+=token.length;}
                    }
    }
    
    // If there are any trailing characters left in the value, it doesn't match
    if (i_val !== val.length) { return 0; }
    // Is date valid for month?
    if (month===2) {
            // Check for leap year
            if ( ( (year%4===0)&&(year%100 !== 0) ) || (year%400===0) ) { // leap year
                    if (date > 29){ return 0; }
                    }
            else { if (date > 28) { return 0; } }
            }
    if ((month===4)||(month===6)||(month===9)||(month===11)) {
            if (date > 30) { return 0; }
            }
    
    // Correct hours value
    if (hh<12 && ampm==='PM') { hh=hh-0+12; }
    else if (hh>11 && ampm==='AM') { hh-=12; }
    var newdate=new Date(year,month-1,date,hh,mm,ss);
    return newdate.getTime();
}

// ------------------------------------------------------------------
// Utility functions for parsing in getDateFromFormat()
// ------------------------------------------------------------------
function _isInteger(val) {
    var digits='1234567890';
    for (var i=0; i < val.length; i++) {
            if (digits.indexOf(val.charAt(i))===-1) { return false; }
            }
    return true;
}
function _getInt(str,i,minlength,maxlength) {
    for (var x=maxlength; x>=minlength; x--) {
            var token=str.substring(i,i+x);
            if (token.length < minlength) { return null; }
            if (_isInteger(token)) { return token; }
            }
    return null;
}