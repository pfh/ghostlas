
function assert(cond, text) {
    if (!cond) throw text;
}

function* range(n) {
    for(let i=0;i<n;i++) yield i;
}

function eat(iter) {
    let result = [ ];
    for(const item of iter) result.push(item);
    return result;
}

// Jesus Fucking H. Christ
function map(iter, fun) {
    let result = [ ];
    for(const item of iter) result.push(fun(item));
    return result;
}

function sum(iter) {
    let result = 0;
    for(const value of iter) result += value;
    return result;
}

function dot(a,b) {
    return sum(map(range(a.length), i => a[i]*b[i]));
}

function add(a,b) {
    return map(range(a.length), i => a[i]+b[i]);
}

function scale(a,b) {
    return map(range(b.length), i => a*b[i]);
}


function mutated(a, b) {
    let result = { };
    Object.assign(result,a);
    Object.assign(result,b);
    return result;
}

