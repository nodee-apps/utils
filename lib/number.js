
/*
 * Helpers for working with Numbers
 */

// convert integer to string, which can be ordered same as number
Number.prototype.toOrderableString = function(length, radix){
    if(!this.isInteger()) throw new Error('Number is not Integer');
    length = length || 5; // 36^5 = 60mil.
    radix = radix || 36;
    
    if(radix < 2 || radix > 36) throw new Error('Radix have to be from 2 to 36, and is "' +radix+ '"');
    var result = this.toString(radix);
    
    if(result.length > length) throw new Error('Max Length exceeded, result will be not orderable');
    
    var dif = length - result.length;
    for(var i=0;i<dif;i++) result = '0'+result;
    
    return result;
};

Number.prototype.isInteger = function(){
    return typeof (+this) === 'number' && this%1===0;
};

Number.prototype.isFloat = function(){
    return typeof (+this) === 'number' && this%1!==0
};