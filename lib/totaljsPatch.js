
// makes Total.js backward compatible
module.exports = function(){
    if(!global.F) throw new Error('total.js framework not initializes yet');

    /*
     * config patch
     */
    if(F.config.configPatched) return; // already patched

    function setter(obj, prop, value){
        var propDashed = prop.replace(/_/g,'-');
        var propUnderscored = prop.replace(/\-/g,'_');

        obj[prop] = value;
        obj[propDashed] = value;
        obj[propUnderscored] = value;
        return true;
    }

    // copy all configs to underscore and dash style, it will be backward compatible
    Object.keys(F.config).forEach(function(key){
        setter(F.config, key, F.config[key]);
    });

    // wrap framework config an object proxy, to catch all slash and underscore config props and sync it
    F.config = new Proxy(F.config, {
        get: function(obj, prop){
            return obj[prop];
        },
        set: setter
    });
    
    global.CONF = F.config;
    F.config.configPatched = true;
};