

var _ = require("lodash");



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