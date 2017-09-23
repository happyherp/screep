

var script = 
{seq:[
    {set:"a",to:5},
    {tick:1},
    {set:"b",to:"a"},
    {set:"c",to:{call:(a,mult)=>a*mult, with:["a", 100]}},
    {
        set:"nested",
        to:{
            call:(n, a,mult)=>n*a*mult, 
            with:[{call:(b,c) => b+c,with:["b", "c"]} ,"a", 100]}
            },
    {
        if:{call: a=> a == 5, with:["a"]},
        then:{set:"a", to:10}
    },
    {set: "i", to:1},
    {
        while: {call:i=>i<10, with:"i"},
        do:{set:"i", to:{call: i => i*2, with:["i"]}}
    },
    "a"
    ]
};

var scriptSeq = {
    seq:[
       {set:"a", to:2},
       {set:"b", to:3},
       {set:"c", to:4},
    ]};
    
var scriptSeqNested = {
    seq:[{seq:[{seq:[{set:"a",to:1}]}]}
    ]};

var scriptCall = {
    call:()=>123
};

var scriptCallMult = {
    call:(a,b)=>a*b, with:[4,3]
};

var scriptCallNested = {
    call:(a,b)=>a*b, with:[4,{call:a=> a-1, with: [4]}]
};

var scriptLoop={
    seq:[
        {set:"i", to:1},
        {
            while:{call:x=>x<10, with:["i"]},
            do:{set:"i", to: {call:x=>x*2, with:["i"]}}
        }                
    ]
};
    
var scriptReassign={
    seq:[
        {set:"x", to:2},
        {set:"y", to:"x"},
        {call:(x,y)=>x*y, with:["x", "y"]}
    ]
}    

function run(){
    var state = new State()
    var retVal =  exec(state, script);
    console.log("state:", state);
    console.log("retVal", retVal);
};


function run2(script){
    if (script == null){
        script = scriptSeq;
    }
    var state = new ProgramState(script);
    console.log("starting: ", _.cloneDeep(state));
    var i = 0;
    while (state.position != END && i < 100){
        state.next();
        console.log("did a step: ", _.cloneDeep(state));
        i++;
    }
    console.log("lastresult: ",state.lastresult)
}    

function run3(script){
    if (script == null){
        script = scriptSeq;
    }
    var context = new Context();
    
    var exec =  beginExecution(script);
    while (!exec.isDone()){
        exec.doStep(context);
        console.log("did a step vars", _.cloneDeep(context.vars), "exec", _.cloneDeep(exec));        
    }
    console.log("lastresult: ",exec.retVal)
    
}   