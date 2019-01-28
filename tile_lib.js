
"use strict";

// Numbers might also encode a length, angle*foo+length

/* Insertion to proceed stepwise joining the newest to the oldest.

   Should be able to detect non-planarity purely symbollically?
*/

function mod(i,n) {
    while(i<0) i += n;
    while(i>=n) i -= n;
    return i;
}

function at(word,i) {
   return word[mod(i,word.length)];
}

function all_equal(word1, word2) {
    if (word1.length != word2.length)
        return false;
    for(let i=0;i<word1.length;i++)
        if (word1[i] != word2[i])
            return false;
    return true;
}

function all_equalish(word1, word2) {
    if (word1.length != word2.length)
        return false;
    for(let i=0;i<word1.length;i++)
        if (Math.abs(word1[i]-word2[i]) > 1e-6)
            return false;
    return true;
}

function random_int(n) {
    return Math.floor(Math.random()*n);
}

function ordered(a,b,c) {
    return (a<b&&b<c)||(b<c&&c<a)||(c<a&&a<b);
}

function point_line_distance(a,b,c,d, p,q) {
    c -= a;
    d -= b;
    p -= a;
    q -= b;
    let area = c*q-d*p;
    
    let dot = c*p+d*q;
    let ccdd = c*c+d*d;

    if (dot <= 0)
        return Math.sqrt(p*p+q*q);
    if (dot >= ccdd)
        return Math.sqrt((p-c)*(p-c)+(q-d)*(q-d));
    
    return Math.abs(area) / Math.sqrt(ccdd);
}

function intersects(a,b,c,d,p,q,r,s) {
    var det, gamma, lambda;
    det = (c - a) * (s - q) - (r - p) * (d - b);
    if (Math.abs(det) < 1e-6) {
        return false;
    } else {
        lambda = ((s - q) * (r - a) + (p - r) * (s - b)) / det;
        gamma = ((b - d) * (r - a) + (c - a) * (s - b)) / det;
        return (-1e-6 < lambda && lambda < 1+1e-6) && (-1e-6 < gamma && gamma < 1+1e-6);
    }
}


class Language {
    constructor(n180, reversals, mirrors, steps, scalers, shapes) {
        this.n180 = n180;
        this.n360 = n180*2;
        
        this.shift = 0;
        while((1<<this.shift) < this.n360) this.shift += 1;
        this.mask = (1<<this.shift)-1;
        
        this.n_segments = reversals.length;
        this.reversals = reversals;
        this.mirrors = mirrors;
        this.steps = steps;
        this.scalers = scalers;
        this.shapes = shapes;
        
        //Maximum gradient of edge shape
        this.rise = Math.tan(Math.PI/16);
        
        this.origin = [0,0,1];
    }
    
    go(point, step) {
        let angle = Math.PI/this.n180*this.angle(step);
        let seg = this.segment(step);
        let scale = point[2] * this.scalers[seg];        
        let size = scale * this.steps[seg];
        return [ point[0]+size*Math.cos(angle), point[1]+size*Math.sin(angle), scale ];
    }
        
    points(point, word) {
        let result = [point];
        for(let i=0;i<word.length;i++) {
            point = this.go(point, word[i]);
            result.push(point);
        }
        return result;
    }
    
    segment_points(shape, a,b,c,d) {
        shape = this.shapes[shape];
        let x = c-a,
            y = d-b,
            ox = y,
            oy = -x;
        let result = [ ], n=(shape==0?1:32);
        for(let i=1;i<=n;i++) {
            let f = i/n,
                o = Math.sin(Math.PI*shape*f) / Math.max(1/8,Math.abs(shape)) * this.rise;
            result.push([ a+x*f+ox*o, b+y*f+oy*o ]);
        }
        return result;
    }
    
    polygon(point, word) {
        let points = this.points(point, word);
        let result = [ point ];
        for(let i=0;i<word.length;i++)
            result = result.concat(
                this.segment_points(
                    this.segment(word[i]),
                    points[i][0], points[i][1],
                    points[i+1][0], points[i+1][1]));
        return result;
    }
        
    angle(code) {
        return code & this.mask;
    }
    
    segment(code) {
        return code >> this.shift;
    }
    
    code(seg, ang) {
        return (seg<<this.shift)+ang;
    }
           
    rot180(angle) {
        return mod(angle+this.n180,this.n360);
    }
    
    reverse(code) {
        return this.code(
            this.reversals[this.segment(code)],
            this.rot180(this.angle(code)));
    }

    rotations(word) {
        let result = [ ];
        for(let i=0;i<this.n360;i++)
            result.push(word.map(step => 
               this.code(
                   this.segment(step),
                   mod(this.angle(step)+i,this.n360))));
        return result;
    }
    
    mirror(word) {
        let result = [ ];
        for(let i=word.length-1;i>=0;i--)
            result.push(
                this.code(
                    this.mirrors[this.segment(word[i])],
                    mod(-this.angle(word[i]),this.n360)));
        return result;
    }
    
    good(word) {
        if (word.length < 3) 
            return false;
    
        let p = this.points(this.origin, word);
        if (!all_equalish(p[0],p[p.length-1]))
            return false;
        
        let area = 0;
        for(let i=0;i<word.length;i++)
           area += 0.5*(p[i][0]*p[i+1][1]-p[i][1]*p[i+1][0]);
        if (area < 1e-6)
            return false;
        
        let min_thickness=2/3-1e-6;
        for(let i=0;i<word.length;i++)
            for(let j=0;j<word.length;j++)
               if (mod(i-j,word.length) != 0 && 
                   mod(i+1-j,word.length) != 0 &&
                   point_line_distance(p[i][0],p[i][1],p[i+1][0],p[i+1][1],p[j][0],p[j][1]) < min_thickness)
                   return false;

        for(let i=0;i<word.length;i++)
            for(let j=i+2;j<word.length;j++) {
                if (mod(i+1-j,word.length) == 0 || mod(j+1-i,word.length) == 0)
                    continue;
            
                //if (all_equalish(p[i],p[j]))
                //    return false;
                
                if (intersects(
                        p[i][0],p[i][1],p[i+1][0],p[i+1][1],
                        p[j][0],p[j][1],p[j+1][0],p[j+1][1]))
                    return false;
            }
            
        //let chub = area/word.length;
        //console.log(chub);
        //if (chub < 0.3) return false;
        //for(let i=0;i<word.length;i++) {
        //    if (mod(at(word,i+1)-at(word,i), this.n360) > 4)
        //        return false;
        //}
        
        return true;
    }
    
    try_find_good(n) {
        let word = [ ];
        for(let i=0;i<n;i++) {
            let j = random_int(this.n180+1);
            if (j != 0)
                word.push(
                    this.code(
                        random_int(this.n_segments),
                        (j-1)*2));
        }
        if (this.good(word))
            return word;
        return null;
    }
    
    async find_good(n) {
        for(let i=0;;i++) {            
            if ((i&255) == 0) {
                console.log(i);
                await handle_events();                
            }

            const result = this.try_find_good(n);
            if (result != null) return result;
        }    
    }
    
    balanced(tiles) {
        let mat = [ ];
        for(const tile of tiles) {
            let row = map(range(this.n_segments), i => 0);
            for(const code of tile) {
                const seg = this.segment(code);
                row[seg] += 1;
                row[this.reversals[seg]] -= 1;
            }
            mat.push(row);
        }
        console.log(mat);
        
        let result = positive_balance(mat);
        console.log(result);
        return result.error < 1e-3;
    }
    
    
    anticlockwise(a,b,c) {
        return mod(a-c,this.n360) <= mod(b-c,this.n360)
    }
        
    match_lengths(word1, word2) {
        let n_fwd, n_back, a,b,c;
        let n_max = Math.min(word1.length, word2.length);

        for(n_back=0;
            n_back < n_max &&
            word1[word1.length-n_back-1] == this.reverse(word2[n_back]);
            n_back++);

        //Consume at least one
        //if (n_back == 0)
        //    return null;

        for(n_fwd=0;
            n_fwd < n_max-n_back && 
            word1[n_fwd] == this.reverse(word2[word2.length-1-n_fwd]);
            n_fwd++);

        //At least one match    
        if (n_fwd == 0 && n_back == 0)
            return null;
        
        if (n_back+n_fwd == word1.length)
            return null; //Won't handle this case

        if (n_back+n_fwd == word2.length) {
            return null; //Gets twisted sometimes, still not sure why
            /*
            //a = this.rot180(at(word1,n_fwd-1));
            //c = at(word1,-n_back);
            a = at(word1,n_fwd);
            c = this.rot180(at(word1,-n_back-1));
            
            b = at(word2,n_back);
            //console.log(a+" "+b+" "+c+"--"+word2);
            if (mod(a-c,this.n360) <= mod(b-c,this.n360))
                return null;
            
            b = this.rot180(at(word2,-n_fwd));
            //console.log(a+" "+b+" "+c+"x");
            if (mod(a-c,this.n360) <= mod(b-c,this.n360))
                return null;
            
            //return null;
            while(n_fwd+n_back+2 <= word1.length && 
                  word1[n_fwd] == this.rot180(word1[word1.length-n_back-1])) {
                n_fwd ++;
                n_back ++;
                console.log("bip");
            }
            */
        } else {                   
            //Consistency at ends
            a = this.angle(at(word1,n_fwd));
            b = this.rot180(this.angle(at(word2,-n_fwd-1)));
            c = this.rot180(this.angle(at(word1,n_fwd-1)));
            //if (mod(a-c,this.n360) <= mod(b-c,this.n360))
            if (!ordered(c,b,a))
                return null;
            
            a = this.angle(at(word2,n_back));
            b = this.rot180(this.angle(at(word1,-n_back-1)));
            c = this.rot180(this.angle(at(word2,n_back-1)));
            //if (mod(a-c,this.n360) <= mod(b-c,this.n360))
            if (!ordered(c,b,a))
                return null;
        }
            
        return [n_fwd, n_back];
    }
}

function splice(word1, word2, n_fwd, n_back) {
    //let result = word1.slice(n_fwd,word1.length-n_back);
    //let path;
    /*if (n_fwd+n_back < word2.length) {
        result = result.concat(
            word2.slice(n_back,word2.length-n_fwd));
        //path = word2.slice(word2.length-n_fwd,word2.length);
    }*/    
    
    let result = word1.slice(n_fwd, word1.length-n_back);
    for(let i=n_back;i<word2.length-n_fwd;i++)
        result[result.length] = word2[i];
    
    return result;
    //let path = word1.slice(n_fwd);
    //return {word:result, path:path};
}

function rebasing(word, pos) {
    //pos = mod(pos,word.length);
    //return word.slice(pos,word.length).concat(word.slice(0,pos));
    pos = mod(pos, word.length);
    let result = word.slice(pos,word.length);
    for(let i=0;result.length<word.length;i++)
        result[result.length] = word[i];
    return result;
}

function rebasings(word) {
    let result = [ ];
    for(let i=0;i<word.length;i++)
        result.push(rebasing(word,i))
    return result;
}


// String identifier, independent of rebasing
function word_key(pattern) {
    let less = function(i,j) {
        for(let k=0;k<pattern.length;k++) {
            if (pattern[i]<pattern[j]) return true;
            if (pattern[i]>pattern[j]) return false;                
            i = mod(i+1,pattern.length);
            j = mod(j+1,pattern.length);
        }
        return false;
    }
    let least = 0;
    for(let i=1;i<pattern.length;i++)
        if (less(i,least)) least = i;
    return rebasing(pattern,least).toString();
}


class Assembler {
    // lang: a Language
    // tile: an array of { tile:[code,...] }   
    //    (can contain other tile info)
    //    (will be augmented with "mirror" and "index")
    constructor(lang, tiles, lookahead=5, rotations=true, mirrors=true) {
        let newtiles, seen;
        
        if (rotations) {
            newtiles = [ ];
            for(const tile of tiles) 
                for(const newtile of lang.rotations(tile.tile))
                    newtiles.push(mutated(tile,{tile:newtile,mirror:false}));
            tiles = newtiles;
        }
        
        if (mirrors) {
            tiles = tiles.concat(tiles.map(tile => 
                mutated(tile,{tile:lang.mirror(tile.tile),mirror:true})));
        }
        
        // Remove any duplicates
        newtiles = [ ];
        seen = { };
        for(const tile of tiles) {
            let key = word_key(tile.tile);
            if (key in seen) continue;
            newtiles.push(tile);
            seen[key] = true;
        }
        tiles = newtiles;
        
        for(const i of range(tiles.length))
            tiles[i].index = i;
        
        newtiles = [ ];
        for(const tile of tiles) {
            let tile_rebasings = rebasings(tile.tile);
            for(const rebase of tile_rebasings)
                newtiles.push(mutated(tile,{tile:rebase}));
        }
        
        this.lang = lang;        
        this.tiles = newtiles;
        
        /*for(let i=0;i<tiles.length;i++) {
            lang.rotations(tiles[i]).
            concat(lang.rotations(lang.mirror(tiles[i]))).
            forEach(j => {
                color += 1;
                rebasings(j).forEach(tile => {
                    if (!this.tiles.some(k=>all_equal(k,tile))) {
                        this.tiles.push(tile); 
                        this.colors.push(color);
                    }
                })
            });
        }*/
        
        //this.context_radius = 0;
        //this.tiles.forEach(i => {
        //    if (i.length > this.context_radius)
        //        this.context_radius = i.length;
        //});
        
        //this.context_radius *= 2; //!
        
        //this.cache = { };
        
        this.lookahead =  lookahead;
        
        this.placements = [ {path:[],word:this.tiles[0].tile,tile:0} ];
        this.highwater = this.placements;
        this.overwrites = [ 1 ];
        this.iters = 0;
        this.successes = 0;
        
        this.forbid = { };
        //this.memo = { }
    }
    
    context(word, offset) {
        let ctx = [];
        for(let i=-this.context_radius;i<this.context_radius;i++)
            ctx.push(at(word, i+offset));
        return ctx.toString();
    }
    
    options(pattern) {
        let choices = [ ];
        for(let i=0;i<this.tiles.length;i++) {
            let matches = this.lang.match_lengths(pattern, this.tiles[i].tile);
            if (matches === null) continue;
            
            choices.push([i,matches[0],matches[1]]);
        }
        return choices;
    }
    
    cached_options(pattern) {
        let choices;
        let context = this.context(pattern,0);
        if (context in this.cache) {
            choices = this.cache[context];
        } else {
            choices = this.options(pattern);
            this.cache[context] = choices;
        }
        return choices;
    }
    
    can_extend(pattern, lookahead) {
        let choices = this.options(pattern);
        let has_fwd=false, has_back=false;
        for(let i=0;i<choices.length;i++) {
            if (choices[i][1]) has_fwd = true;
            if (choices[i][2]) has_back = true;
        }        
        if (!has_fwd || !has_back) return null;
        if (lookahead <= 0) return true;
        
        for(let i=0;i<choices.length;i++) {
            let choice = choices[i];
            if (!choice[2]) continue;
            let result = splice(pattern, this.tiles[choice[0]].tile, choice[1], choice[2]);

            let end = -this.tiles[choice[0]].length+choice[1]+choice[2];
            if (this.can_extend(result,lookahead-1) &&
                this.can_extend(rebasing(result,end),lookahead-1))
                return true;
        }
        
        return false;
    }
    
    //Proabably a big performance hit from async    
    async extend(pattern, lookahead) {
        await handle_events();
        
        //let key = pattern.toString();
        /*let less = function(i,j) {
            for(let k=0;k<pattern.length;k++) {
                if (pattern[i]<pattern[j]) return true;
                if (pattern[i]>pattern[j]) return false;                
                i = mod(i+1,pattern.length);
                j = mod(j+1,pattern.length);
            }
            return false;
        }
        let least = 0;
        for(let i=1;i<pattern.length;i++)
            if (less(i,least)) least = i;
        let key = rebasing(pattern,least).toString();*/
        
        //let x=[];
        //for(let i=-3;i<=3;i++)
        //    x.push(pattern[mod(i,pattern.length)]);
        //let key = x.toString();
        let key = word_key(pattern);
        
        //if (key in this.forbid) return null;
        //if (lookahead < this.lookahead && key in this.memo) return this.memo[key];
        //if (lookahead == this.lookahead && key in this.memo && this.memo[key] === null) return null;
        
        let choices = this.options(pattern);        
        let has_fwd=false, has_back=false;
        for(let i=0;i<choices.length;i++) {
            if (choices[i][1]) has_fwd = true;
            if (choices[i][2]) has_back = true;
        }        
        if (!has_fwd || !has_back) {
            this.forbid[key] = true;
            //this.memo[key] = null;
            return null;
        }
        if (lookahead <= 0) return true;
        
        for(let i=0;i<choices.length;i++) {
            //await handle_events();
        
            let j = i+random_int(choices.length-i);        
            let choice = choices[j];
            choices[j] = choices[i];
                        
            //if (!choice[1]) continue;

            let tile = this.tiles[choice[0]].tile;
            let result = splice(pattern, tile, choice[1], choice[2]);
            
            if (word_key(result) in this.forbid)
                continue;
            
            //Hmmm
            let end = -tile.length+choice[1]+choice[2];
            //if (lookahead >= 1) {
            //if ((await this.extend(result,lookahead-1) === null) ||
            //    (await this.extend(rebasing(result,end),lookahead-1) === null))
            //    continue; 
            
            let bad = false;
            for(let i=end-1;!bad && i<=1;i++)
                bad = (await this.extend(rebasing(result,i),lookahead-1)) === null;
            if (bad) continue;
            
            //} else {
          /*      if (!this.can_extend(result,lookahead-1) ||
                    !this.can_extend(rebasing(result,end),lookahead-1))
                    continue; */
            //}
            
            //result.tile = choice[0];
            //this.memo[key] = true;
            return {
                word: result, 
                path: tile.slice(tile.length-choice[1], tile.length),
                tile: choice[0]
            };
        }
        
        this.forbid[key] = true;
        //this.memo[key] = null;
        return null;
    }

    async step() {
        this.iters += 1;
        let word = this.placements[this.placements.length-1].word;
        let key = word_key(word);
        let result = null;
        if (!(key in this.forbid))
            result = await this.extend(word, this.lookahead);
        
        if (result != null) { // && this.lang.good(result.word)) {
            this.successes += 1;
            
            if (this.overwrites.length <= this.placements.length)
                this.overwrites.push(0);
            this.overwrites[this.placements.length] += 1;
            
            this.placements.push(result);
            
            if (this.placements.length > this.highwater.length)
                this.highwater = this.placements;
            
            return true;
        }
        
        //this.forbid[key] = true;
        
        if (this.placements.length <= 1)
            return false;
        
        /*if (this.lookahead < 6) {
            this.placements = [this.placements[0]];
            this.lookahead += 1;
            return true;
        }
        
        return false;*/
        
        let n = this.placements.length-1;
        let trim = Math.max(1,n-1);
        while(trim > 1 && this.overwrites[trim-1]/Math.sqrt(trim-1) <= this.overwrites[n]/Math.sqrt(n)) trim -= 1;
        //while(trim > 1 && this.overwrites[trim-1]/(trim-1) <= this.overwrites[n]/n) trim -= 1;
        //while(trim > 1 && this.overwrites[trim-1] <= this.overwrites[trim]) trim -= 1;
        
        this.placements = this.placements.slice(0,trim);
        
        //let rate = this.successes / this.iters;
        
        //let kill=Math.round(Math.pow(Math.random(),-1/3));
        //let kill=1;
        //while(Math.random() > Math.pow(this.iters,-0.5)) 
        //    kill += 1;
        
        //let a=4, b=0.75;
        //while(Math.random() > a/(Math.pow(kill,b)+a) && kill < this.placements.length-1) 
        //    kill += 1;        
        
        //let p=Math.pow(this.iters,-0.5);//Math.pow(1-Math.pow(1+this.placements.length,-1/2), 100);

        //let w=2;
        //while(Math.random() < (w*p+(kill-1))/(w+(kill-1)) &&
        //    kill < this.placements.length) kill += 1;

        //let kill = Math.floor(Math.pow(Math.random(),-0.25));
        //let kill=Math.ceil(Math.pow(-Math.log(Math.random()),2)*0.5);
        //console.log(kill);
        //this.placements = this.placements.slice(0,Math.max(1,this.placements.length-kill));
        return true;
        
    }
}





