


var _ = require("lodash");



var END = "end";

function ProgramState(source){
    
    this.next = function(){
        var stmt = this.findStatementAt(this.position);
        var result = undefined;
        if (stmt.set){
            this.vars[stmt.set] = this.eval(stmt.to)
        }else if (stmt.call){
            var args = this.position.args;
            if (stmt.with != null && stmt.with.length != this.position.args.length){
                throw "Args have not been evaluated"
            }
            result = stmt.call.apply(null, args);        
        }else {
            console.log("unhandled statement: ",stmt);
            throw "unhandled statement";
        }
        
        this.incrementPosition(result);
        this.lastresult = result;
    };
    
    this.findStatementAt = function(position){
        var stmt = this.source;
        for (var i = 0;i<position.length;i++){
            var direction = position[i];
            if (direction == END){
                return null;
            }else if (direction.seq != null){
                stmt = stmt.seq[direction.seq];
            }else if (direction.args != null){
                if (direction.args.length == stmt.with.length){
                    //Just use that statement.
                }else{
                    //Evaluate arguments
                    stmt = stmt.with[direction.args.length];
                }
            }else{
                console.log("unexpected position-direction: ",direction);
                throw "unexpected position-direction";
            }
        }
        return stmt;
    }
    

        if (typeof expr == 'number'){
            return expr;
        }else{
            throw "Can't handle "+expr;
        }
    };
    
    this.validPosition = function(){
        var lastPos = this.position[this.position.length-1];
        var stmt = this.findStatementAt(this.position);
        if (stmt.seq != null){
            return false;
        }else if (stmt.call != null){
            if (lastPos.args != null){
                //Make sure all arguments have already been evaluated.
                return stmt.with == undefined 
                    || stmt.with.lengthf* == lastPos.args.length;
            }else{
                return false;
            }
        }else if (stmt.set != null ){
            return true
        }else{
            throw "did not handle case of "+stmt;
        }
    }
    
    this.incrementPosition = function(result){

        var moved = false;
        while (!moved){       
            var currentDir = this.position[this.position.length-1];
            if (currentDir === undefined){
                //We popped the whole stack, programm done.
                this.position = END;
                moved = true;                
            }else if (currentDir.seq != null){
                if (currentDir.seq < currentDir.of-1){
                    currentDir.seq += 1;
                    moved = true;
                }else{                    
                    this.position.pop();
                }
            }else if (currentDir.args != null){
                if (currentDir.args.length < currentDir.args.of){
                    //We just evaluated an argument.
                    if (result === undefined){
                        throw "Attempted to put undefined in argument-list"
                    }
                    currentDir.args.push(result);     
                    moved = true;                    
                }else{
                    //We just finished calling the function.
                    this.position.pop();                    
                }
            }else{
                console.log("incrementPosition: unexpected position-direction: ", currentDir);
                throw "unexpected position-direction";
            }
        }
    
        while (this.position != END && !this.validPosition()){
            var stmt = this.findStatementAt(this.position);
            if (stmt.seq != null){
                this.position.push({seq:0,of:stmt.seq.length});
            }else if (stmt.call != null){
                if (stmt.with == null){
                    stmt.with = [];
                }
                this.position.push({args:[],of:stmt.with.length});                    
            }else{
                throw "Can't handle "+stmt;
            }
        }
    };
    
    if (source.seq == undefined){
        source = {seq:[source]}
    }
    this.source = source;
    this.vars = {};
    this.position = [{seq:-1, of:this.source.seq.length}];
    this.incrementPosition();
    this.lastresult = undefined;
}    

// module.exports = {
    // run:run,
// };