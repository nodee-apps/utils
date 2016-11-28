var object = require('./object.js');

var OPS = {};

OPS.$eq = function(key, val, raw) {
    if(Array.isArray(raw) && raw.length === 0) return 'isEmptyArray(deepGet(doc,'+key+'))';
    return 'compare(doc,'+key+',function(v){ return v==='+val+'; })';
};
OPS.$exists = function(key, val) {
    return '(deepGet(doc,'+key+') !== undefined) === '+val;
};
OPS.$pattern = function(key, val, raw) { // reduced from $regex
    if(raw) return 'compare(doc,'+key+',function(v){ return typeof v === "string" && '+raw+'.test(v); })';
};
OPS.$mod = function(key, val, raw) {
    if(!Array.isArray(raw)) throw new Error('value of $mod must be an array');
    return 'compare(doc,'+key+',function(v){ return v % '+JSON.stringify(raw[0])+' === '+JSON.stringify(raw[1])+'; })';
};
OPS.$ne = function(key, val, raw) {
    var compareExp = raw instanceof RegExp ? raw+'.test(v)' : 'v==='+val;
    return 'compare(doc,'+key+',function(v){ return '+compareExp+'; }, true)';
};
OPS.$gt = function(key, val, raw) {
    if(raw === null) return 'false';
    return 'compare(doc,'+key+',function(v){ return v>'+val+'; })';
};
OPS.$gte = function(key, val, raw) {
    if(raw === null) return 'false';
    return 'compare(doc,'+key+',function(v){ return v>='+val+'; })';
};
OPS.$lt = function(key, val, raw) {
    if(raw === null) return 'false';
    return 'compare(doc,'+key+',function(v){ return v<'+val+'; })';
};
OPS.$lte = function(key, val, raw) {
    if(raw === null) return 'false';
    return 'compare(doc,'+key+',function(v){ return v<='+val+'; })';
};
OPS.$in = function(key, vals, raw) {
    if(!Array.isArray(raw)) throw new Error('value of $in must be an array');
    return 'compare(doc,'+key+',function(v){ return '+vals+'.indexOf(v)!==-1; })';
};
OPS.$nin = function(key, vals, raw) {
    if(!Array.isArray(raw)) throw new Error('value of $nin must be an array');
    return 'compare(doc,'+key+',function(v){ return '+vals+'.indexOf(v)!==-1; },true)';
};
OPS.$size = function(key, val) {
    return '(deepGet(doc,'+key+')||"").length === '+val;
};
OPS.$elemMatch = function(key, val, raw) {
    var exp = compile(map('', object.isObject(raw) ? raw : { $this:raw }));
    return 'compare(doc,'+key+',function(v){ var doc=v; return '+exp+'; }, false, true)';
};
OPS.$all = function(key, val, raw) {
    if(!Array.isArray(raw)) throw new Error('value of $all must be an array');
    return 'matchAll('+val+',deepGet(doc,'+key+'))';
};

OPS.$not = function(key, val, raw) {
    if(!(object.isObject(raw) || raw instanceof RegExp)) throw new Error('value of $not must be an object or regex');
    return '!'+compile(map(JSON.parse(key), raw));
};

// reserved operators
OPS.$regex = true;
OPS.$options = true;
OPS.$nor = true;
OPS.$or = true;
OPS.$and = true;

// not implemented operators
OPS.$type = function(key, val) {
    throw new Error('$type operator is not implemented, now');
};
OPS.$where = function(key, val) {
    throw new Error('$where operator is not implemented, now');
};

function map(key, val) {
    var obj = {};
    obj[key] = val;
    return obj;
}

function compile(query) {
    var oldDateToJSON = Date.prototype.toJSON;
    Date.prototype.toJSON = function(){ return this.getTime(); };
    
    var rels = [];
    query = (object.isObject(query)) ? query : { $this:query };
    
    Object.keys(query).forEach(function(key) {
        if(key[0]==='$' && key!=='$this' && !OPS[key]) throw new Error('Operator "' +key+ '" not recognized');
        var ops = query[key];

        function join(op) {
            return query[key].map(compile).join(op);
        }

        if (ops instanceof RegExp) {
            ops = { $pattern:ops.toString() };
        }
        if (ops && ops.$regex) {
            ops.$pattern = '/'+ops.$regex+'/'+(ops.$options||'');
        }
        
        ops = object.isObject(ops) ? ops : { $eq:ops };
        
        if (key === '$nor') return rels.push('!('+join(' || ')+')');
        else if (key === '$or') return rels.push('('+join(' || ')+')');
        else if (key === '$and') return rels.push('('+join(' && ')+')');

        for(var op in ops){
            if(op[0]!=='$') { // nested query
                rels.push(compile(map(key ? key+'.'+op : op, ops[op])));
            }
            else if(OPS[op] === undefined) throw new Error('Operator "' +op+ '" not recognized');
            else if(typeof OPS[op] === 'function') rels.push(OPS[op](JSON.stringify(key), JSON.stringify(ops[op]), ops[op]));
        }
    });
    
    Date.prototype.toJSON = oldDateToJSON;
    return '('+(rels.length < 2 ? rels[0] || 'true' : rels.join(' && '))+')';
}

function compare(obj, keyName, compareFnc, negative, valueMustBeAarray){
    var v,
        values = deepGet(obj, keyName),
        isArray = Array.isArray(values);
    
    if(valueMustBeAarray && !isArray) return false;
    values = isArray ? values : [values];
    
    for(var i=0;i<values.length;i++){
        v = values[i] instanceof Date ? values[i].getTime() : values[i];
        if(compareFnc(v)) return !negative;
    }
    return !!negative;
}

function matchAll(all,vals){
    if(!Array.isArray(vals)) return false;
    for(var i=0;i<all.length;i++){
        var found = false;
        for(var j=0;j<vals.length;j++){
            if(vals[j] instanceof Date ? all[i]===vals[j].getTime() : all[i]===vals[j]) { found=true; break; }
        }
        if(!found) return false;
    }
    return true;
}

function isEmptyArray(val){ 
    return Array.isArray(val) && val.length===0; 
}

function deepGet(parent, key) {
    if(key==='$this') return parent;
    if(parent === null || parent === undefined || typeof parent === 'function') return undefined;

    var parts = Array.isArray(key) ? key : key.split('.'),
        partsLength = parts.length,
        current = parent,
        index,
        partialResult,
        collectedResult = [];

    for(var i=0; i<partsLength; i++) {
        if(i < parts.length-1 && Array.isArray(current[parts[i]]) && !current[parts[i]].hasOwnProperty(parts[i+1])){
            key = parts.slice(i+1);
            for(index=0;index<current[parts[i]].length;index++){
                partialResult = deepGet( current[parts[i]][index], key );
                if(partialResult !== undefined) collectedResult = collectedResult.concat( partialResult );
            }
            return collectedResult.length ? collectedResult : undefined;
        }
        if((current[parts[i]] === null && i<parts.length-1) || current[parts[i]] === undefined) return undefined;
        current = current[parts[i]];
    }

    // function as value is not allowed
    if(typeof current === 'function') return undefined;
    return current;
}

var helpersFncString = deepGet.toString() + ' ' + 
                       compare.toString() + ' ' + 
                       matchAll.toString() + ' ' +
                       isEmptyArray.toString();

module.exports = {
    compile: function(query) {
        return new Function('doc', '"use strict"; ' + helpersFncString + ' return '+compile(query)+';').bind({});
    },
    
    toCompiledString: function(query){
        return compile(query);
    },
    
    fromCompiledString: function(compiledString){
        return new Function('doc', '"use strict"; ' + helpersFncString + ' return '+compiledString+';').bind({});
    },
    
    filter: function(query, docs){
        if(!Array.isArray(docs)) throw new Error('Wrong Arguments');
    
        if(object.isObject(query)) query = this.compile(query);
        else if(typeof query === 'string') query = this.fromCompiledString(query);
        else if(typeof query !== 'function') throw new Error('Wrong Arguments');
        
        var filteredDocs = [], docsLength = docs.length;
        for(var i=0;i<docsLength;i++){
            if(query(docs[i])) filteredDocs.push(docs[i]);
        }
        
        return filteredDocs;
    }
};