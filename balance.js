
function positive_balance(mat) {
    let n = mat[0].length;
    let m = mat.length;
    let error = map(range(n),i => 0);
    let weights = map(range(m),i => 0);
    
    let last_error2 = 0.0, error2;
    
    for(const i of range(1000)) {
        for(let j of range(m)) {
            let xx = Math.max(1e-6, dot(mat[j],mat[j])),
                xy = dot(mat[j],error);
                adjust = -xy/xx;                
            adjust = Math.max(1, adjust+weights[j])-weights[j];
            //console.log(error);
            error = add(error, scale(adjust, mat[j]));
            weights[j] += adjust;
        }
        
        error2 = dot(error,error);
        if (Math.abs(error2 - last_error2) < 1e-6) break;
        last_error2 = error2;
    }
    
    return { error:error2, weights };
}


console.log( positive_balance([ [1,1], [-1,-1], [-1,-2] ]) );




