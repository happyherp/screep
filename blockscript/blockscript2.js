function isTrue(val){
    return val;
}


function Context(){
    this.vars = {}
}

function beginExecution(instruction){
    if (["number", "boolean"].includes(typeof instruction)){
        return new SimpleValueExecution(instruction);
    }else if (typeof instruction == "string"){
        return new RefExecution(instruction);      
    }else{
        
        for (var key in keyToExecuter){
            if (instruction[key] != null){
                return new keyToExecuter[key](instruction);
            }
        }                
        
        throw ["Unknown instruction ", instruction];
    }
}


function Execution(instruction){
    this.state = "start"
    this.instruction = instruction; 
    this.retVal = null;
    this.subexecution = null;
}


Execution.prototype.doStep = function(context){
    throw "Implement me. ";
}

Execution.prototype.isDone = function(){
    return this.state == "done";
}

function SimpleValueExecution(instruction){
    Execution.call(this, instruction);    
}
SimpleValueExecution.prototype = Object.create(Execution.prototype);

SimpleValueExecution.prototype.doStep = function(context){
    this.retVal = this.instruction;
    this.state = "done";
}


function IfExecution(instruction){
    Execution.call(this, instruction);
}
IfExecution.prototype = Object.create(Execution.prototype);


IfExecution.prototype.doStep = function(context){
    
    if (this.state == "start"){
        this.state = "evaluating";
        this.subexecution = beginExecution(this.instruction.if);
    }else if (this.state == "evaluating"){
        if (this.subexecution.isDone()){
            if (isTrue(this.subexecution.retVal)){
                this.state = "then"
                this.subexecution = beginExecution(this.instruction.then);
            }else if (this.instruction.else != null){
                this.state = "else";
                this.subexecution = beginExecution(this.instruction.else);
            }else{
                this.state = "done"
                this.subexecution = null;
            }
        }else{
            this.subexecution.doStep(context);
        }
    }else if (this.state == "else" || this.state == "then"){
        if (this.subexecution.isDone()){
            this.retVal = this.subexecution.retVal;
            this.state = "done";
            this.subexecution = null;
        }else{
            this.subexecution.doStep(context);
        }        
    }else{
        throw ["Invalid state ", state];
    }
}

function WhileExecution(instruction){
    Execution.call(this, instruction);
}
WhileExecution.prototype = Object.create(Execution.prototype);


WhileExecution.prototype.doStep = function(context){
    
    if (this.state == "start"){
        this.state = "evaluating";
        this.subexecution = beginExecution(this.instruction.while);
    }else if (this.state == "evaluating"){
        if (this.subexecution.isDone()){
            if (isTrue(this.subexecution.retVal)){
                this.state = "looping"
                this.subexecution = beginExecution(this.instruction.do);            
            }else{
                this.state = "done"
                this.subexecution = null;
            }
        }else{
            this.subexecution.doStep(context);
        }
    }else if (this.state == "looping"){
        if (this.subexecution.isDone()){
            this.state = "evaluating";
            this.subexecution = beginExecution(this.instruction.while);
        }else{
            this.subexecution.doStep(context);
        }        
    }else{
        throw ["Invalid state ", state];
    }
}


SetExecution = function(instruction){
    Execution.call(this, instruction);
}
SetExecution.prototype = Object.create(Execution.prototype);


SetExecution.prototype.doStep = function(context){
    if (this.state == "start"){
        this.state = "evaluating";
        this.subexecution = beginExecution(this.instruction.to);
    }else if (this.state == "evaluating"){
        if (this.subexecution.isDone()){
            this.retVal = this.subexecution.retVal;
            context.vars[this.instruction.set] = this.retVal;
            this.subexecution = null;
            this.state = "done";
        }else{
            this.subexecution.doStep(context);
        }
    }else{
        throw ["Should be done", this.state];
    }
}

RefExecution = function(instruction){
    Execution.call(this, instruction);
}

RefExecution.prototype = Object.create(Execution.prototype);

RefExecution.prototype.doStep = function(context){
    this.state = "done";
    this.retVal = context.vars[this.instruction];
}

SeqExecution = function(instruction){
    Execution.call(this, instruction);
}
SeqExecution.prototype = Object.create(Execution.prototype);


SeqExecution.prototype.doStep = function(context){
    if (this.state == "start"){
        this.index = -1;
        this.state = "inseq";
    }else if (this.state == "inseq"){
        if (this.subexecution == null || this.subexecution.isDone()){
            this.index += 1;
            if (this.index < this.instruction.seq.length){
                this.subexecution = beginExecution(this.instruction.seq[this.index]);
            }else{                
                this.state = "done";
                if (this.subexecution != null){
                    this.retVal = this.subexecution.retVal;
                }
            }
        }else{
            this.subexecution.doStep(context);
        }
    }else{
        throw ["Should be done", this.state];
    }    
}


CallExecution = function(instruction){
    Execution.call(this, instruction);
}

CallExecution.prototype = Object.create(Execution.prototype);

CallExecution.prototype.doStep = function(context){
    if (this.state == "start"){
        if (this.instruction.with != null && this.instruction.with.length > 0){
            this.state = "evaluateArgs"
            this.argValues = []            
            this.subexecution = beginExecution(
                this.instruction.with[0]);
        }else{
            this.state = "call";
        }
    }else if (this.state == "evaluateArgs"){
        if (this.subexecution.isDone()){
            this.argValues.push(this.subexecution.retVal);
            this.subexecution = null;
            if (this.argValues.length < this.instruction.with.length){
                this.subexecution = beginExecution(    
                    this.instruction.with[this.argValues.length]);                
            }else{
                this.state = "call";
            }
        }else{
            this.subexecution.doStep(context);
        }
    }else if (this.state == "call"){
        this.retVal =  this.instruction.call.apply(null, this.argValues);
        this.state = "done";             
    }else{
        throw ["Invalid State", this.state];
    }
}

TickExecution = function(instruction){
    Execution.call(this, instruction);
}
TickExecution.prototype = Object.create(Execution.prototype);

TickExecution.prototype.doStep = function(context){
    this.state = "done";
}



keyToExecuter = {
    if:IfExecution,
    while:WhileExecution,
    set:SetExecution,
    seq:SeqExecution,
    call:CallExecution,
    tick:TickExecution
}
