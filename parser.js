
function get_bool(str, text) {
    str = str.toLowerCase();
    if (["0","no","false","n","f"].some(i => i==str))
        return false;
    if (["1","yes","true","y","t"].some(i => i==str))
        return true;
    throw text;
}

function parse_edge(parts) {
    let result = { mirror:false };

    assert(parts.length >= 2, "'edge' should specify one or two characters.");
    
    result.code = parts[1];
    assert(result.code.length == 1 || result.code.length == 2, 
        "Specify either one or two characters representing the edge.");
    
    for(const part of parts.slice(2,parts.length)) {
        if (part == "mirror") {
            assert(result.code.length != 1, "'mirror' makes no sense for flat edges.")
            result.mirror = true;
            continue;
        }
        throw "Don't know what to do with "+part+" in "+parts;
    }
    
    return result;
}

function parse_tile(parts) {
    assert(parts.length >= 2, "'tile' needs a tile specification.");
    let result = { code: parts[1], colors: [], border: true };
        
    for(const part of parts.slice(2,parts.length)) {
        if (part[0] == "#") {
            result.colors.push(part);
        } else if (part == "noborder") {
            result.border = false;
        } else {
            throw "Don't know what to do with: "+part+" in "+parts;
        }
    }
    
    assert(result.colors.length <= 2, "At most two colors per tile.");
    return result
}

class Spec {
    /*
    Members are:
        comments
        rotations
        mirrors
        edges
        tiles
        angles
    */
    
    constructor (text) {
        const lines = text.split("\n");
        
        this.comments = [ ];
        this.rotations = true;
        this.mirrors = true;
        this.edges = [ ];
        this.tiles = [ ];
        this.angles = 4;
        
        for(const line of lines) {
            const parts = line.split(/\s/).filter(word => word.length);
            if (parts.length == 0) 
                continue;
            if (parts[0][0] == "#") {
                this.comments.push(line);
                continue;
            }
            if (parts[0] == "lookahead") {
                assert(parts.length == 2, "Expected one number for 'lookahead'.");
                this.lookahead = parseInt(parts[1]);
                assert(this.lookahead >= 0, "Lookahead should be a positive whole number.");
                continue;
            }
            if (parts[0] == "angles") {
                assert(parts.length == 2, "Expected one number for 'angles'.");
                this.angles = parseInt(parts[1]);
                assert(this.angles >= 3, "'angles' should be at least 3.");
                continue;
            }
            if (parts[0] == "rotations") {
                assert(parts.length == 2, "Expected a true or false value for 'rotations'.");
                this.rotations = get_bool(parts[1], "Invalid true of false value for 'rotations'.");
                continue;
            }
            if (parts[0] == "mirrors") {
                assert(parts.length == 2, "Expected a true or false value for 'mirrors'.");
                this.mirrors = get_bool(parts[1], "Invalid true of false value for 'mirrors'.");
                continue;
            }
            if (parts[0] == "edge") {
                this.edges.push(parse_edge(parts));
                continue;
            }
            if (parts[0] == "tile") {
                this.tiles.push(parse_tile(parts));
                continue;
            }            
            throw "Don't know what to do with: "+line;
        }
    }
    
    
    realize() {
        let codes = [ ],
            reversals = [ ], 
            mirrors = [ ], 
            steps = [ ], 
            scalers = [ ], 
            shapes = [ ];
        
        for(const edge of this.edges) {
            let i = codes.length;
            if (edge.code.length == 1) {
                codes[i] = edge.code;
                reversals[i] = i;
                mirrors[i] = i;
                steps[i] = 1;
                scalers[i] = 1;
                shapes[i] = 0;                
            } else if (edge.mirror) {
                codes[i] = edge.code[0];
                reversals[i] = i+1;
                mirrors[i] = i;
                steps[i] = 1;
                scalers[i] = 1;
                shapes[i] = 1;
                codes[i+1] = edge.code[1];
                reversals[i+1] = i;
                mirrors[i+1] = i+1;
                steps[i+1] = 1;
                scalers[i+1] = 1;
                shapes[i+1] = -1;
            } else {
                codes[i] = edge.code[0];
                reversals[i] = i;
                mirrors[i] = i+1;
                steps[i] = 1;
                scalers[i] = 1;
                shapes[i] = 2;
                codes[i+1] = edge.code[1];
                reversals[i+1] = i+1;
                mirrors[i+1] = i;
                steps[i+1] = 1;
                scalers[i+1] = 1;
                shapes[i+1] = -2;
            }
        }
        
        let lang = new Language(
            this.angles, reversals, mirrors, steps, scalers, shapes);
        
        let tiles = [ ];
        for(const tile of this.tiles) {
            let i = tiles.length;
            
            let steps = [ ];
            let angle = 0;
            for(const code of tile.code) {
                let index = codes.findIndex(item => code == item);
                
                if (index >= 0) {
                    steps[steps.length] = lang.code(index, angle);
                } else if (code == "+") {
                    angle = mod(angle+2,lang.n360);                    
                } else if (code == "-") {
                    angle = mod(angle-2,lang.n360);
                } else {
                    throw "Don't know what to do with: '"+code+"' in '"+tile.code+"'.";
                }
            }
            
            tiles.push({
                tile:steps,
                original:i,
                colors:tile.colors,
                border:tile.border
            });
        }
        
        let assem = new Assembler(
            lang, tiles, 
            this.lookahead, 
            this.rotations,
            this.mirrors);
        
        return assem;
    }
};






