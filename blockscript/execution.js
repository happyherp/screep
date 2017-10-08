
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

inherit(SimpleValueExecution, Execution);

SimpleValueExecution.prototype.doStep = function(context){
    this.retVal = this.instructionRef.get(context);
    this.state = "done";
}


function IfExecution(instructionRef){
    Execution.call(this, instructionRef);
}

inherit(IfExecution, Execution);

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

inherit(WhileExecution, Execution);

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

inherit(SetExecution, Execution);

SetExecution.prototype.doStepNoSub = function(context){
    if (this.state == "start"){
        this.state = "evaluating";
        this.subexecution = beginExecution(context, this.instructionRef.subref("to"));
    }else if (this.state == "evaluating"){
        this.retVal = this.subexecution.retVal;
        context.varscope.set(this.instructionRef.get(context).set, this.retVal);
        this.subexecution = null;
        this.state = "done";
    }else{
        throw ["Should be done", this.state];
    }
}

RefExecution = function(instructionRef){
    Execution.call(this, instructionRef);
}

inherit(RefExecution, Execution);

RefExecution.prototype.doStepNoSub = function(context){
    this.state = "done";
    this.retVal = context.varscope.get(this.instructionRef.get(context));
}

SeqExecution = function(instructionRef){
    Execution.call(this, instructionRef);
}

inherit(SeqExecution, Execution);

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

inherit(CallJSExecution, Execution);

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
        v = context.varscope.flat();
        this.retVal =  this.instructionRef.get(context).call.apply(null, this.argValues);
        this.state = "done";             
    }else{
        throw ["Invalid State", this.state];
    }
}

TickExecution = function(instructionRef){
    Execution.call(this, instructionRef);
}

inherit(TickExecution, Execution);

TickExecution.prototype.doStep = function(context){
    //TODO: Um something should be done, right?
    //Somehow notify the executing function. it needs to resume later on.
    this.state = "done";
}

LambdaExecution = function(instructionRef){
    Execution.call(this, instructionRef);
}

inherit(LambdaExecution, Execution);

LambdaExecution.prototype.doStepNoSub = function(context){
    this.retVal = {
        instructionRef:this.instructionRef, //The instruction to be executed
        varscope:context.varscope}; //The varscope in which this lambda was defined.
    this.state = "done";
}

CallNativeExecution = function(instructionRef){    
    Execution.call(this, instructionRef);
    this.argValues = []                
}

inherit(CallNativeExecution, Execution);

CallNativeExecution.prototype.doStep = function(context){
    if (this.state == "start"){
        if (this.instructionRef.get(context).with != null && this.instructionRef.get(context).with.length > 0){
            this.state = "evaluateArgs"
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
            this.subvarscope = new VarScope(this.subexecution.retVal.varscope);
            for (var i = 0;i<varnames.length;i++){
                this.subvarscope.vars[varnames[i]] = this.argValues[i];
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
            this.subexecution.doStep(new Context(context.thread, this.subvarscope));
        }
    }else{
        throw ["Invalid State", this.state];
    }
}

SyncExecution = function(instructionRef){
    Execution.call(this, instructionRef);
}
inherit(SyncExecution, Execution);
SyncExecution.prototype.doStep = function(context){
    if (this.state == "start"){
        this.state = "waitingForCallback  ";
        var asyncFunction = this.instructionRef.get(context).sync
        if (typeof asyncFunction != "function"){
            throw [ "Sync must be a function, was", asyncFunction]
        }
        context.thread.state = "waitingForCallback";
        asyncFunction(()=>{
            this.retVal = arguments;
            this.state = "done";
            context.thread.continue();
        });       
    }else if (this.state == "waitingForCallback"){
        throw "tried to do a Step, but we are waiting for a callback";
    }else{
        throw ["Invalid State", this.state];
    }
}
