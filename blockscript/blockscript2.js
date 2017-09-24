
//Used for js-methods to access variables
v = {};

function isTrue(val){
    return val;
}


function Context(source){
    this.vars = {}
    this.source = source;
}

function InstructionRootRef(){
}
InstructionRootRef.prototype.get = function(context){
    return normalizeInstruction(context.source);
}
InstructionRootRef.prototype.subref = function(attr){
    return new InstructionSubRef([attr]);
}

InstructionSubRef = function(path){
    this.path = path;
}

InstructionSubRef.prototype.get = function(context){
    var instruction = normalizeInstruction(context.source);
    for (var i = 0;i<this.path.length;i++){
        instruction = normalizeInstruction(instruction[this.path[i]],this.path[i]) ;
    }
    return instruction;
}
InstructionSubRef.prototype.subref = function(attr){
    return new InstructionSubRef(this.path.concat([attr]));
}

function normalizeInstruction(instruction, attr){
    if (instruction instanceof Array && attr != "with" && attr != "seq"){
        instruction = {seq:instruction};
    }else if (typeof instruction =="function"){
        instruction = {call:instruction};
    }    
    return instruction
}

function beginExecution(context, instructionRef){
    
    var instruction = instructionRef.get(context);    
    
    var constructor = null;
    if (["number", "boolean"].includes(typeof instruction)){
        constructor = SimpleValueExecution;
    }else if (typeof instruction == "string"){
        constructor = RefExecution;
    }else{        
        for (var key in keyToExecuter){
            if (instruction[key] != null){
               constructor = keyToExecuter[key];
               break;
            }
        }                        
    }
    if (constructor == null){
        throw ["Unknown instruction ", instruction];
    }
    return new constructor(instructionRef);
}

function run(instruction){
    var context = new Context(instruction);
    
    var exec =  beginExecution(context, new InstructionRootRef());
    while (!exec.isDone()){
        exec.doStep(context);
    }
    return exec.retVal;
}

function runSerialized(instruction){
    
    var context = new Context(instruction);
    
    var exec =  beginExecution(context, new InstructionRootRef());
    while (!exec.isDone()){
        var json = toJSON({exec:exec, context:context});
        var reloaded = fromJSON(json);
        exec = reloaded.exec;
        context = reloaded.context;
        exec.doStep(context);
    }
    return exec.retVal;
}

function toJSON(obj){
    return JSON.stringify(obj);
}

function fromJSON(obj){
    return JSON.parse(obj);
}

function Execution(instructionRef){
    this.state = "start"
    this.instructionRef = instructionRef; 
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

function SimpleValueExecution(instructionRef){
    Execution.call(this, instructionRef);    
}
SimpleValueExecution.prototype = Object.create(Execution.prototype);

SimpleValueExecution.prototype.doStep = function(context){
    this.retVal = this.instructionRef.get(context);
    this.state = "done";
}


function IfExecution(instructionRef){
    Execution.call(this, instructionRef);
}

IfExecution.prototype = Object.create(Execution.prototype);

IfExecution.prototype.doStepNoSub = function(context){
    
    if (this.state == "start"){
        this.state = "evaluating";
        this.subexecution = beginExecution(context, this.instructionRef.subref("if"));
    }else if (this.state == "evaluating"){
        if (isTrue(this.subexecution.retVal)){
            this.state = "then"
            this.subexecution = beginExecution(context, this.instructionRef.subref("then"));
        }else if (this.instructionRef.get(context).else != null){
            this.state = "else";
            this.subexecution = beginExecution(context, this.instructionRef.subref("else"));
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

function WhileExecution(instructionRef){
    Execution.call(this, instructionRef);
}
WhileExecution.prototype = Object.create(Execution.prototype);


WhileExecution.prototype.doStepNoSub = function(context){
    
    if (this.state == "start"){
        this.state = "evaluating";
        this.subexecution = beginExecution(context, this.instructionRef.subref("while"));
    }else if (this.state == "evaluating"){
        if (isTrue(this.subexecution.retVal)){
            this.state = "looping"
            this.subexecution = beginExecution(context, this.instructionRef.subref("do"));            
        }else{
            this.state = "done"
            this.subexecution = null;
        }
    }else if (this.state == "looping"){
        this.state = "evaluating";
        this.subexecution = beginExecution(context, this.instructionRef.subref("while"));        
    }else{
        throw ["Invalid state ", state];
    }
}


SetExecution = function(instructionRef){
    Execution.call(this, instructionRef);
}
SetExecution.prototype = Object.create(Execution.prototype);


SetExecution.prototype.doStepNoSub = function(context){
    if (this.state == "start"){
        this.state = "evaluating";
        this.subexecution = beginExecution(context, this.instructionRef.subref("to"));
    }else if (this.state == "evaluating"){
        this.retVal = this.subexecution.retVal;
        context.vars[this.instructionRef.get(context).set] = this.retVal;
        this.subexecution = null;
        this.state = "done";
    }else{
        throw ["Should be done", this.state];
    }
}

RefExecution = function(instructionRef){
    Execution.call(this, instructionRef);
}

RefExecution.prototype = Object.create(Execution.prototype);

RefExecution.prototype.doStepNoSub = function(context){
    this.state = "done";
    this.retVal = context.vars[this.instructionRef.get(context)];
    if (this.retVal === undefined){
        throw "Can't access variable: "+this.instructionRef.get(context)
    }
}

SeqExecution = function(instructionRef){
    Execution.call(this, instructionRef);
}
SeqExecution.prototype = Object.create(Execution.prototype);


SeqExecution.prototype.doStepNoSub = function(context){
    if (this.state == "start"){
        this.index = -1;
        this.state = "inseq";
    }else if (this.state == "inseq"){
        this.index += 1;
        if (this.index < this.instructionRef.get(context).seq.length){
            this.subexecution = beginExecution(context, this.instructionRef.subref("seq").subref(this.index));
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


CallJSExecution = function(instructionRef){
    Execution.call(this, instructionRef);
}

CallJSExecution.prototype = Object.create(Execution.prototype);

CallJSExecution.prototype.doStepNoSub = function(context){
    if (this.state == "start"){
        if (this.instructionRef.get(context).with != null && this.instructionRef.get(context).with.length > 0){
            this.state = "evaluateArgs"
            this.argValues = []            
            this.subexecution = beginExecution(context, 
                this.instructionRef.subref("with").subref(0));
        }else{
            this.state = "call";
        }
    }else if (this.state == "evaluateArgs"){
        this.argValues.push(this.subexecution.retVal);
        this.subexecution = null;
        if (this.argValues.length < this.instructionRef.get(context).with.length){
            this.subexecution = beginExecution(context,  
                this.instructionRef.subref("with").subref(this.argValues.length));                
        }else{
            this.state = "call";
        }
    }else if (this.state == "call"){
        v = context.vars;
        this.retVal =  this.instructionRef.get(context).call.apply(null, this.argValues);
        this.state = "done";             
    }else{
        throw ["Invalid State", this.state];
    }
}

TickExecution = function(instructionRef){
    Execution.call(this, instructionRef);
}
TickExecution.prototype = Object.create(Execution.prototype);

TickExecution.prototype.doStep = function(context){
    this.state = "done";
}

LambdaExecution = function(instructionRef){
    Execution.call(this, instructionRef);
}
LambdaExecution.prototype = Object.create(Execution.prototype);

LambdaExecution.prototype.doStepNoSub = function(context){
    this.retVal = {
        instructionRef:this.instructionRef, //The instruction to be executed
        context:context}; //The context in which this lambda was defined.
    this.state = "done";
}

CallNativeExecution = function(instructionRef){
    Execution.call(this, instructionRef);
}

CallNativeExecution.prototype = Object.create(Execution.prototype);

CallNativeExecution.prototype.doStep = function(context){
    if (this.state == "start"){
        if (this.instructionRef.get(context).with != null && this.instructionRef.get(context).with.length > 0){
            this.state = "evaluateArgs"
            this.argValues = []            
            this.subexecution = beginExecution(context, 
                this.instructionRef.subref("with").subref(0));
        }else{
            this.state = "evaluateFunction";
            this.subexecution = beginExecution(context, this.instructionRef.subref("callX"));
        }
    }else if (this.state == "evaluateArgs"){
        if (this.subexecution.isDone()){
            this.argValues.push(this.subexecution.retVal);
            this.subexecution = null;
            if (this.argValues.length < this.instructionRef.get(context).with.length){
                this.subexecution = beginExecution(context,     
                    this.instructionRef.subref("with").subref(this.argValues.length));                
            }else{
                this.state = "evaluateFunction";
                this.subexecution = beginExecution(context, this.instructionRef.subref("callX"));                
            }
        }else{
            this.subexecution.doStep(context);
        }
    }else if (this.state == "evaluateFunction"){
        if (this.subexecution.isDone()){
            this.state = "calling";
            var subinstructionRef = this.subexecution.retVal.instructionRef.subref("is");
            var varnames = this.subexecution.retVal.instructionRef.get(context).lambda;
            if (varnames.length != this.argValues.length){
                throw "Numbers of arguments in call did not match number of arguments of functions. ";
            }
            this.subcontext = new Context(context.source);
            this.subcontext.vars.__proto__ = this.subexecution.retVal.context.vars;
            for (var i = 0;i<varnames.length;i++){
                this.subcontext.vars[varnames[i]] = this.argValues[i];
            }
            this.subexecution = beginExecution(context, subinstructionRef);            
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
