
/*
 * Helpers for working with Dates
 */

// parse string as date in custom format like "yyyy.MM.dd", and ged time in ms
Date.parseFormat = getDateFromFormat;

// parse string with in custom format like "yyyy.MM.dd", and fill date instance
Date.prototype.parseFormat = function(dateStr, format){
    this.setTime( getDateFromFormat(dateStr, format) );
    return this;
};

// build string with in custom format like "yyyy.MM.dd"
Date.prototype.toFormatString = function(format){
    return formatDate(this, format);
};

// replace time zone, include DST difference and offset
Date.prototype.changeZone = function(newOffset, refDate){
    newOffset = newOffset || 0;
    if(this.hasOwnProperty('_zone') && this._zone === newOffset) return this;
    else this._zone = newOffset+0;
    
    var dstDiff = this.getTimezoneOffset() - (refDate || new Date()).getTimezoneOffset();
    var localOffset = this.getTimezoneOffset();
    var offset = localOffset*60*1000 + newOffset*60*60*1000 - dstDiff*60*1000 + this.isDSTinEffect()*60*60*1000;
    var newTime = this.getTime() + offset;
    
    this.setTime(newTime);
    return this;
};

// return time in zone, include DST difference
Date.prototype.toZone = function(newOffset){
    return new Date(this.getTime()).changeZone(newOffset);
};

// check if timezone offset for DST
Date.prototype.dstTimezoneOffset = function() {
    var jan = new Date(this.getFullYear(), 0, 1);
    var jul = new Date(this.getFullYear(), 6, 1);
    return Math.max(jan.getTimezoneOffset(), jul.getTimezoneOffset());
};

Date.prototype.dst = function() {
    return this.getTimezoneOffset() < this.dstTimezoneOffset();
};

// synchronize dst when past / future timing is set
Date.prototype.syncDST = function(refDate) {
    var diff = this.getTimezoneOffset() - (refDate || new Date()).getTimezoneOffset();
    if(diff) {
        this.setTime(this.getTime() - diff*60*1000);
    }
    return this;
};

// synchronize dst when past / future timing is set
Date.prototype.toSyncDST = function(refDate) {
    return new Date(this.getTime()).syncDST(refDate);
};

// real time zone from UTC, include actual DST in hours
Date.prototype.getUTCTimeZone = function() {
    return - this.getTimezoneOffset() / 60;
};

// TODO: implement zone changes between 2-3 oclock AM, when time is moving +-1 hour
Date.prototype.isDSTinEffect = function(){
    var d = new Date(), lSoM, lSoO;

    // loop over the 31 days of March for the current year
    for(var i=31; i>0; i--){
        var tmp = new Date(d.getFullYear(), 2, i);
        
        // If it's Sunday
        if(tmp.getDay() === 0){
            // last Sunday of March
            lSoM = tmp;
            break;
        }
    }

    // loop over the 31 days of October for the current year
    for(var i=31; i>0; i--){
        var tmp = new Date(d.getFullYear(), 9, i);
        
        // If it's Sunday
        if(tmp.getDay() === 0){
            // last Sunday of October
            lSoO = tmp;
            break;
        }
    }

    // 0 = DST off (UTC)
    // 1 = DST on  (BST)
    if(d < lSoM || d > lSoO) return 0;
    else return 1;
};


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
    var now=new Date(0);
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
            if (year==null) { return now; }
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
            if ((month < 1)||(month>12)){return now;}
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
            if(month==null||(month<1)||(month>12)){return now;}
            i_val+=month.length;}
        else if (token==='dd'||token==='d') {
            date=_getInt(val,i_val,token.length,2);
            if(date==null||(date<1)||(date>31)){return now;}
            i_val+=date.length;}
        else if (token==='hh'||token==='h') {
            hh=_getInt(val,i_val,token.length,2);
            if(hh==null||(hh<1)||(hh>12)){return now;}
            i_val+=hh.length;}
        else if (token==='HH'||token==='H') {
            hh=_getInt(val,i_val,token.length,2);
            if(hh==null||(hh<0)||(hh>23)){return now;}
            i_val+=hh.length;}
        else if (token==='KK'||token==='K') {
            hh=_getInt(val,i_val,token.length,2);
            if(hh==null||(hh<0)||(hh>11)){return now;}
            i_val+=hh.length;}
        else if (token==='kk'||token==='k') {
            hh=_getInt(val,i_val,token.length,2);
            if(hh==null||(hh<1)||(hh>24)){return now;}
            i_val+=hh.length;hh--;}
        else if (token==='mm'||token==='m') {
            mm=_getInt(val,i_val,token.length,2);
            if(mm==null||(mm<0)||(mm>59)){return now;}
            i_val+=mm.length;}
        else if (token==='ss'||token==='s') {
            ss=_getInt(val,i_val,token.length,2);
            if(ss==null||(ss<0)||(ss>59)){return now;}
            i_val+=ss.length;}
        else if (token==='a') {
            if (val.substring(i_val,i_val+2).toLowerCase()==='am') {ampm='AM';}
            else if (val.substring(i_val,i_val+2).toLowerCase()==='pm') {ampm='PM';}
            else {return now;}
            i_val+=2;}
        else {
            if (val.substring(i_val,i_val+token.length)!==token) {return now;}
            else {i_val+=token.length;}
        }
    }

    // If there are any trailing characters left in the value, it doesn't match
    if (i_val !== val.length) { return now; }
    // Is date valid for month?
    if (month===2) {
        // Check for leap year
        if ( ( (year%4===0)&&(year%100 !== 0) ) || (year%400===0) ) { // leap year
            if (date > 29){ return now; }
        }
        else { if (date > 28) { return now; } }
    }
    if ((month===4)||(month===6)||(month===9)||(month===11)) {
        if (date > 30) { return now; }
    }

    // Correct hours value
    if (hh<12 && ampm==='PM') { hh=hh-0+12; }
    else if (hh>11 && ampm==='AM') { hh-=12; }
    var newdate=new Date(year,month-1,date,hh,mm,ss);
    return newdate;
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