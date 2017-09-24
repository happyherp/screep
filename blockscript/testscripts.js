

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

var scriptPlus = {seq:[
    {set:"+", to:{lambda:["x", "y"], is:{call:(x,y) => x+y, with:["x", "y"]}}},
    {callX:"+", with:[4,9]}
]};

var scriptFak = {seq: [
    {
        set:"fak", 
        to:{
            lambda:["x"], 
            is: {
                if: {call:x=>x==1,with:["x"]}, 
                then:1, 
                else: {
                    call:(x,r)=>x*r, 
                    with:[
                        "x", 
                        {
                            callX:"fak", 
                            with: [{call: x=>x-1,with:["x"]}]
                        }
                    ]}
            },
        }
    },
    {callX:"fak", with:[5]}
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

var scriptVarFromJS = {seq:
    [
        {set:"x", to:3},
        {set:"y", to:4},
        {call:()=>v.x*v.y}
    ]
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
        },
        "i"        
    ]
};
    
var scriptReassign={
    seq:[
        {set:"x", to:2},
        {set:"y", to:"x"},
        {call:(x,y)=>x*y, with:["x", "y"]}
    ]
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