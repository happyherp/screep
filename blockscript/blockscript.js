

//Used for js-methods to access variables
v = {};

function isTrue(val){
    return val;
}


function Context(thread, varscope){
    this.thread = thread;
    this.varscope = varscope;
}


function Thread(source){
    this.source = source;
    this.state = "created";// created|running|waitingForCallback|error
    this.step = 0;
    this.steplimit = 10 * 1000;
    this.rootExec = null;
    this.rootVarScope = new VarScope();
    this.onDone = null;//Function to be called after execution is done.
}

Thread.prototype.start = function(){
    if (this.state == "created"){
        this.rootExec = beginExecution(new Context(this, this.rootVarScope), new InstructionRootRef());
        this.state = "running";
        return this.run();
    }else{
        throw "State must be created. was "+this.state;
    }
}

Thread.prototype.run = function(){
    if (this.state == "running"){
        var context = new Context(this, this.rootVarScope);
        while (!this.rootExec.isDone() && this.step<this.steplimit && this.state == "running"){
            this.rootExec.doStep(context);
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

Thread.prototype.continue = function(){
    if (this.state == "waitingForCallback"){
        this.state = "running";
        this.run();
    }else{
        throw "Invalid state. was "+this.state;
    }
}


VarScope = function(parentscope){
    this.parentscope = parentscope;
    this.vars = {};
}

VarScope.prototype.defines = function(name){
    return this.vars[name] !== undefined 
            || this.parentscope != null && this.parentscope.defines(name);
}

VarScope.prototype.get = function(name){
    if (this.vars[name] !== undefined){
        return this.vars[name];
    }else if (this.parentscope != null){
        return this.parentscope.get(name);
    }else{
        throw "can't find var with name: "+name;
    }
}

VarScope.prototype.set = function(name, value){
    if (this.parentscope != null && this.parentscope.defines(name)){
        this.parentscope.set(name, value);
    }else{
        this.vars[name] = value;
    }
}

VarScope.prototype.flat = function(){
    if (this.parentscope){
        return _.defaults(this.vars, this.parentscope.flat())    
    }
    return this.vars;    
}


//For indirectly referencing an instruction.
function InstructionRootRef(){
}
InstructionRootRef.prototype.get = function(context){
    return normalizeInstruction(context.thread.source);
}
InstructionRootRef.prototype.subref = function(attr){
    return new InstructionSubRef([attr]);
}

InstructionSubRef = function(path){
    this.path = path;
}

InstructionSubRef.prototype.get = function(context){
    var instruction = normalizeInstruction(context.thread.source);
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
    var thread = new Thread(instruction);
    return context.thread();
}

function runAsync(script, onDone){
    var thread = new Thread(script);
    thread.onDone = onDone;
    thread.start();
}


function runSerialized(instruction){
    
    var thread = new Thread(instruction);
    
    var exec =  beginExecution(new Context(thread, thread.rootVarScope), new InstructionRootRef());
    while (!exec.isDone()){
        var json = toJSON({exec:exec, thread:thread});
        var reloaded = fromJSON(json);
        exec = reloaded.exec;
        thread = reloaded.thread;
        thread.source = instruction; //Source-Code should bypass serialization. It does not change anyways.
        exec.doStep(new Context(thread, thread.rootVarScope));
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


