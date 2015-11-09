var deepGet = require('./object.js').deepGet;

Array.prototype.sortByKey = function(key, order) {
    if(!key || typeof key !== 'string') throw new Error('Missing key');
    var asc = order === undefined || !!order;
    if(order === -1 || order === 'desc' || order === 0) asc = false;
    var increment = asc ? 1 : -1;
    
    return this.sort(function(a, b) {
        var x = deepGet(a, key);
        var y = deepGet(b, key);
        
        return ((x < y) ? -increment : ((x > y) ? increment : 0));
    });
};