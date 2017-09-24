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
    if (this.state == "done"){
        throw "This Execution is done";
    }
    
    if (this.subexecution != null && !this.subexecution.isDone()){
        this.subexecution.doStep(context);
    }else{
        this.doStepNoSub(context)
    }        
}

Execution.prototype.doStepNoSub = function(context){
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


IfExecution.prototype.doStepNoSub = function(context){
    
    if (this.state == "start"){
        this.state = "evaluating";
        this.subexecution = beginExecution(this.instruction.if);
    }else if (this.state == "evaluating"){
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
    }else if (this.state == "else" || this.state == "then"){
        this.retVal = this.subexecution.retVal;
        this.state = "done";
        this.subexecution = null;       
    }else{
        throw ["Invalid state ", state];
    }
}

function WhileExecution(instruction){
    Execution.call(this, instruction);
}
WhileExecution.prototype = Object.create(Execution.prototype);


WhileExecution.prototype.doStepNoSub = function(context){
    
    if (this.state == "start"){
        this.state = "evaluating";
        this.subexecution = beginExecution(this.instruction.while);
    }else if (this.state == "evaluating"){
        if (isTrue(this.subexecution.retVal)){
            this.state = "looping"
            this.subexecution = beginExecution(this.instruction.do);            
        }else{
            this.state = "done"
            this.subexecution = null;
        }
    }else if (this.state == "looping"){
        this.state = "evaluating";
        this.subexecution = beginExecution(this.instruction.while);        
    }else{
        throw ["Invalid state ", state];
    }
}


SetExecution = function(instruction){
    Execution.call(this, instruction);
}
SetExecution.prototype = Object.create(Execution.prototype);


SetExecution.prototype.doStepNoSub = function(context){
    if (this.state == "start"){
        this.state = "evaluating";
        this.subexecution = beginExecution(this.instruction.to);
    }else if (this.state == "evaluating"){
        this.retVal = this.subexecution.retVal;
        context.vars[this.instruction.set] = this.retVal;
        this.subexecution = null;
        this.state = "done";
    }else{
        throw ["Should be done", this.state];
    }
}

RefExecution = function(instruction){
    Execution.call(this, instruction);
}

RefExecution.prototype = Object.create(Execution.prototype);

RefExecution.prototype.doStepNoSub = function(context){
    this.state = "done";
    this.retVal = context.vars[this.instruction];
    if (this.retVal === undefined){
        throw "Can't access variable: "+this.instruction
    }
}

SeqExecution = function(instruction){
    Execution.call(this, instruction);
}
SeqExecution.prototype = Object.create(Execution.prototype);


SeqExecution.prototype.doStepNoSub = function(context){
    if (this.state == "start"){
        this.index = -1;
        this.state = "inseq";
    }else if (this.state == "inseq"){
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
        throw ["Should be done", this.state];
    }    
}


CallJSExecution = function(instruction){
    Execution.call(this, instruction);
}

CallJSExecution.prototype = Object.create(Execution.prototype);

CallJSExecution.prototype.doStepNoSub = function(context){
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
        this.argValues.push(this.subexecution.retVal);
        this.subexecution = null;
        if (this.argValues.length < this.instruction.with.length){
            this.subexecution = beginExecution(    
                this.instruction.with[this.argValues.length]);                
        }else{
            this.state = "call";
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

LambdaExecution = function(instruction){
    Execution.call(this, instruction);
}
LambdaExecution.prototype = Object.create(Execution.prototype);

LambdaExecution.prototype.doStepNoSub = function(context){
    this.retVal = {
        instruction:this.instruction, 
        context:context};
    this.state = "done";
}

CallNativeExecution = function(instruction){
    Execution.call(this, instruction);
}

CallNativeExecution.prototype = Object.create(Execution.prototype);

CallNativeExecution.prototype.doStep = function(context){
    if (this.state == "start"){
        if (this.instruction.with != null && this.instruction.with.length > 0){
            this.state = "evaluateArgs"
            this.argValues = []            
            this.subexecution = beginExecution(
                this.instruction.with[0]);
        }else{
            this.state = "evaluateFunction";
            this.subexecution = beginExecution(this.instruction.callX);
        }
    }else if (this.state == "evaluateArgs"){
        if (this.subexecution.isDone()){
            this.argValues.push(this.subexecution.retVal);
            this.subexecution = null;
            if (this.argValues.length < this.instruction.with.length){
                this.subexecution = beginExecution(    
                    this.instruction.with[this.argValues.length]);                
            }else{
                this.state = "evaluateFunction";
                this.subexecution = beginExecution(this.instruction.callX);                
            }
        }else{
            this.subexecution.doStep(context);
        }
    }else if (this.state == "evaluateFunction"){
        if (this.subexecution.isDone()){
            this.state = "calling";
            var subinstruction = this.subexecution.retVal.instruction.is;
            var varnames = this.subexecution.retVal.instruction.lambda;
            if (varnames.length != this.argValues.length){
                throw "Numbers of arguments in call did not match number of arguments of functions. ";
            }
            this.subcontext = new Context();
            //this.subcontext.vars = _.cloneDeep(this.subexecution.retVal.context.vars);
            this.subcontext.vars.__proto__ = this.subexecution.retVal.context.vars;
            for (var i = 0;i<varnames.length;i++){
                this.subcontext.vars[varnames[i]] = this.argValues[i];
            }
            this.subexecution = beginExecution(subinstruction);            
        }else{
            this.subexecution.doStep(context);
        }        
    }else if (this.state == "calling"){
        if (this.subexecution.isDone()){
            this.retVal = this.subexecution.retVal;
            this.state = "done";
        }else{
            this.subexecution.doStep(this.subcontext);
        }
    }else{
        throw ["Invalid State", this.state];
    }
}



keyToExecuter = {
    if:IfExecution,
    while:WhileExecution,
    set:SetExecution,
    seq:SeqExecution,
    call:CallJSExecution,
    callX:CallNativeExecution,
    tick:TickExecution,
    lambda:LambdaExecution
}
