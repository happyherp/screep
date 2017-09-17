


var _ = require("lodash");


function run(){
    var state = new State()
    var retVal =  exec(state, script);
    console.log("state:", state);
    console.log("retVal", retVal);
};

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
    {return: "a"}
    ]
};
    
    
function State(){
    this.vars = {};
};
    
function exec(state, statement){
    if (statement.seq != null){
        _.forEach(statement.seq, stmt => exec(state, stmt));
    }else if (typeof statement == 'number'){
        return statement;
    }else if (typeof statement == 'string'){
        return state.vars[statement];        
    }else if (statement.set != null){
        state.vars[statement.set] = exec(state, statement.to);
    }else if (statement.if != null){
        var cond = exec(state, statement.if);
        if (cond){
            exec(state, statement.then);
        }
    }else if (statement.while != null){
        while (exec(state, statement.while)){
            exec(state, statement.do);
        }    
    }else if (statement.call != null){
        var args = _.map(statement.with, a => exec(state, a))
        return statement.call.apply(null, args);
    }
}

// module.exports = {
    // run:run,
// };