'use strict';
    
// using bundled module https://github.com/chriso/validator.js
var validator = module.exports = require('validator');


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
    return typeof value === 'boolean'
}

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
}

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
        value = replaceDiacritics(value);
        value = value.toLowerCase().replace(/[ ]+/g,'-').replace(/[^a-z0-9\-_\.]+/g,'');
    }
    
    return value;
};

validator.toInt = validator.toInteger = function(str, radix) {
    return parseInt(str, radix===true ? 10 : radix || 10);
};


/*
 * sanitize hlpers
 */
function replaceDiacritics(str) {
    var alphabet = { a:/[\u0061\u24D0\uFF41\u1E9A\u00E0\u00E1\u00E2\u1EA7\u1EA5\u1EAB\u1EA9\u00E3\u0101\u0103\u1EB1\u1EAF\u1EB5\u1EB3\u0227\u01E1\u00E4\u01DF\u1EA3\u00E5\u01FB\u01CE\u0201\u0203\u1EA1\u1EAD\u1EB7\u1E01\u0105\u2C65\u0250]/ig,
        aa:/[\uA733]/ig,
        ae:/[\u00E6\u01FD\u01E3]/ig,
        ao:/[\uA735]/ig,
        au:/[\uA737]/ig,
        av:/[\uA739\uA73B]/ig,
        ay:/[\uA73D]/ig,
        b:/[\u0062\u24D1\uFF42\u1E03\u1E05\u1E07\u0180\u0183\u0253]/ig,
        c:/[\u0063\u24D2\uFF43\u0107\u0109\u010B\u010D\u00E7\u1E09\u0188\u023C\uA73F\u2184]/ig,
        d:/[\u0064\u24D3\uFF44\u1E0B\u010F\u1E0D\u1E11\u1E13\u1E0F\u0111\u018C\u0256\u0257\uA77A]/ig,
        dz:/[\u01F3\u01C6]/ig,
        e:/[\u0065\u24D4\uFF45\u00E8\u00E9\u00EA\u1EC1\u1EBF\u1EC5\u1EC3\u1EBD\u0113\u1E15\u1E17\u0115\u0117\u00EB\u1EBB\u011B\u0205\u0207\u1EB9\u1EC7\u0229\u1E1D\u0119\u1E19\u1E1B\u0247\u025B\u01DD]/ig,
        f:/[\u0066\u24D5\uFF46\u1E1F\u0192\uA77C]/ig,
        g:/[\u0067\u24D6\uFF47\u01F5\u011D\u1E21\u011F\u0121\u01E7\u0123\u01E5\u0260\uA7A1\u1D79\uA77F]/ig,
        h:/[\u0068\u24D7\uFF48\u0125\u1E23\u1E27\u021F\u1E25\u1E29\u1E2B\u1E96\u0127\u2C68\u2C76\u0265]/ig,
        hv:/[\u0195]/ig,
        i:/[\u0069\u24D8\uFF49\u00EC\u00ED\u00EE\u0129\u012B\u012D\u00EF\u1E2F\u1EC9\u01D0\u0209\u020B\u1ECB\u012F\u1E2D\u0268\u0131]/ig,
        j:/[\u006A\u24D9\uFF4A\u0135\u01F0\u0249]/ig,
        k:/[\u006B\u24DA\uFF4B\u1E31\u01E9\u1E33\u0137\u1E35\u0199\u2C6A\uA741\uA743\uA745\uA7A3]/ig,
        l:/[\u006C\u24DB\uFF4C\u0140\u013A\u013E\u1E37\u1E39\u013C\u1E3D\u1E3B\u017F\u0142\u019A\u026B\u2C61\uA749\uA781\uA747]/ig,
        lj:/[\u01C9]/ig,
        m:/[\u006D\u24DC\uFF4D\u1E3F\u1E41\u1E43\u0271\u026F]/ig,
        n:/[\u006E\u24DD\uFF4E\u01F9\u0144\u00F1\u1E45\u0148\u1E47\u0146\u1E4B\u1E49\u019E\u0272\u0149\uA791\uA7A5]/ig,
        nj:/[\u01CC]/ig,
        o:/[\u006F\u24DE\uFF4F\u00F2\u00F3\u00F4\u1ED3\u1ED1\u1ED7\u1ED5\u00F5\u1E4D\u022D\u1E4F\u014D\u1E51\u1E53\u014F\u022F\u0231\u00F6\u022B\u1ECF\u0151\u01D2\u020D\u020F\u01A1\u1EDD\u1EDB\u1EE1\u1EDF\u1EE3\u1ECD\u1ED9\u01EB\u01ED\u00F8\u01FF\u0254\uA74B\uA74D\u0275]/ig,
        oi:/[\u01A3]/ig,
        ou:/[\u0223]/ig,
        oo:/[\uA74F]/ig,
        p:/[\u0070\u24DF\uFF50\u1E55\u1E57\u01A5\u1D7D\uA751\uA753\uA755]/ig,
        q:/[\u0071\u24E0\uFF51\u024B\uA757\uA759]/ig,
        r:/[\u0072\u24E1\uFF52\u0155\u1E59\u0159\u0211\u0213\u1E5B\u1E5D\u0157\u1E5F\u024D\u027D\uA75B\uA7A7\uA783]/ig,
        s:/[\u0073\u24E2\uFF53\u00DF\u015B\u1E65\u015D\u1E61\u0161\u1E67\u1E63\u1E69\u0219\u015F\u023F\uA7A9\uA785\u1E9B]/ig,
        t:/[\u0074\u24E3\uFF54\u1E6B\u1E97\u0165\u1E6D\u021B\u0163\u1E71\u1E6F\u0167\u01AD\u0288\u2C66\uA787]/ig,
        tz:/[\uA729]/ig,
        u:/[\u0075\u24E4\uFF55\u00F9\u00FA\u00FB\u0169\u1E79\u016B\u1E7B\u016D\u00FC\u01DC\u01D8\u01D6\u01DA\u1EE7\u016F\u0171\u01D4\u0215\u0217\u01B0\u1EEB\u1EE9\u1EEF\u1EED\u1EF1\u1EE5\u1E73\u0173\u1E77\u1E75\u0289]/ig,
        v:/[\u0076\u24E5\uFF56\u1E7D\u1E7F\u028B\uA75F\u028C]/ig,
        vy:/[\uA761]/ig,
        w:/[\u0077\u24E6\uFF57\u1E81\u1E83\u0175\u1E87\u1E85\u1E98\u1E89\u2C73]/ig,
        x:/[\u0078\u24E7\uFF58\u1E8B\u1E8D]/ig,
        y:/[\u0079\u24E8\uFF59\u1EF3\u00FD\u0177\u1EF9\u0233\u1E8F\u00FF\u1EF7\u1E99\u1EF5\u01B4\u024F\u1EFF]/ig,
        z:/[\u007A\u24E9\uFF5A\u017A\u1E91\u017C\u017E\u1E93\u1E95\u01B6\u0225\u0240\u2C6C\uA763]/ig,
        '':/[\u0300\u0301\u0302\u0303\u0308]/ig
    };
    
    for (var letter in alphabet) {
      str = str.replace(alphabet[letter], letter);
    }
    return str;
}




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