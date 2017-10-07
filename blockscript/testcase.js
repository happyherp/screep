
tests = [
    {name:"fak", test: run(scriptFak) == 120},
    {name:"reassign", test: run(scriptReassign) == 4},
    {name:"loop", test:run(scriptLoop) == 16},
    {name:"script", test:run(script) == 10},
    {name:"varFromJs", test:run(scriptVarFromJS) == 12},
    {name:"scriptImplicitSeq", test:run(scriptImplicitSeq) == 16},
    {name:"scriptImplicitJS", test:run(scriptImplicitJS) == 123},    
    {name:"serialized", test: runSerialized(script) == 10},
]


testIt = function(){

    tests.forEach(t=> console.log(t.name, t.test));    
   
}