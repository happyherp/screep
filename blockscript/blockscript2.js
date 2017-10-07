

//Used for js-methods to access variables
v = {};

function isTrue(val){
    return val;
}

/**
* Kind of represents a thread.
*/
function Context(source){
    this.vars = {}
    this.source = source;
    this.state = "created";// created|running|waitingForCallback|error
    this.step = 0;
    this.steplimit = 10 * 1000;
    this.rootExec = null;
    this.onDone = null;//Function to be called after execution is done.
}

Context.prototype.start = function(){
    if (this.state == "created"){
        this.rootExec = beginExecution(this, new InstructionRootRef());
        this.state = "running";
        return this.run();
    }else{
        throw "State must be created. was "+this.state;
    }
}

Context.prototype.run = function(){
    if (this.state == "running"){
        while (!this.rootExec.isDone() && this.step<this.steplimit && this.state == "running"){
            this.rootExec.doStep(this);
            this.step++;
        }
        //console.log("Left run-loop");
        if (this.step==this.steplimit){
            console.log("cancelled execution after ", this.step, "step", this);
            this.state = "error"
        }else if (this.rootExec.isDone()){
            this.state = "done";
            var result = this.rootExec.retVal;
            if (this.onDone != null){
                this.onDone(result);
            }
            return result;
        }        
    }else{
        throw "State must be 'running'. was "+this.state;
    }
    return "this method sometimes does not return something because running will happen in a callback. getting the return from that callback is not supported yet.";
}

Context.prototype.continue = function(){
    if (this.state == "waitingForCallback"){
        this.state = "running";
        this.run();
    }else{
        throw "Invalid state. was "+this.state;
    }
}

//For indirectly referencing an instruction.
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


keyToExecuter = {
    if:IfExecution,
    while:WhileExecution,
    set:SetExecution,
    seq:SeqExecution,
    call:CallJSExecution,
    callX:CallNativeExecution,
    tick:TickExecution,
    lambda:LambdaExecution,
    sync:SyncExecution
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

//Kinda deprecated.
function run(instruction){
    var context = new Context(instruction);
    return context.start();
}

function runAsync(script, onDone){
    var context = new Context(script);
    context.onDone = onDone;
    context.start();
}


function runSerialized(instruction){
    
    var context = new Context(instruction);
    
    var exec =  beginExecution(context, new InstructionRootRef());
    while (!exec.isDone()){
        var json = toJSON({exec:exec, context:context});
        var reloaded = fromJSON(json);
        exec = reloaded.exec;
        context = reloaded.context;
        context.source = instruction; //Source-Code should bypass serialization. It does not change anyways.
        exec.doStep(context);
    }
    return exec.retVal;
}

    
function toJSON(obj){
    setProtoMarker(obj, []);
    
    return JSON.stringify(obj);
}


function setProtoMarker(obj, seen){
    if (obj != null && !seen.includes(obj)){
        seen.push(obj);
        if ( obj.__proto__ != null 
            && obj.__proto__.constructor != null
            && !["String", "Number", "Object", "Array"].includes(
                obj.__proto__.constructor.name) ){
            obj.protoname = obj.__proto__.constructor.name;
        }
        for (var key in obj){
            setProtoMarker(obj[key], seen);
        }
    }
}

function fromJSON(obj){
    return revive(JSON.parse(obj));    
}

function revive(obj){
    if (obj != null && obj.__proto__ != null 
            && obj.__proto__.constructor != null
            && !["String", "Number"].includes(
                obj.__proto__.constructor.name)){               
    
        var newobj = obj;
    
        if (obj.protoname != null){
            newobj = Object.create(eval(obj.protoname).prototype);
            obj.protoname = undefined;
        }  
        
        for (var key in obj){
            newobj[key] = revive(obj[key]);
        }
        obj = newobj;
    }
    return obj;
}


