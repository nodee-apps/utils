
/*
 * Helpers for working with Dates
 */

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