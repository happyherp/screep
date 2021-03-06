



tests = [
    {name:"fak", script:scriptFak, expected: 120},
    {name:"reassign", script:scriptReassign, expected: 4},
    {name:"loop", script:scriptLoop, expected: 16},
    {name:"script", script:script, expected: 10},
    {name:"varFromJs", script:scriptVarFromJS, expected: 12},
    {name:"scriptImplicitSeq", script:scriptImplicitSeq, expected: 16},
    {name:"scriptImplicitJS", script:scriptImplicitJS, expected: 123},
    {name:"serialized", script: script, expected: 10, serialize:true},
    {name:"TimeoutSync", script:scriptTimeoutSync, expected: true},
    {name:"NativeIf", script:scriptNativeIf, expected: 10},
    {name:"NativeIfCallbacks", script:scriptNativeIfCallbacks, expected:10},
    {name:"OuterScopeVarMod", script:scriptOuterScopeVarMod, expected:3},
    {name:"CheckVarProtected", script:scriptCheckVarProtected, expected:1}
]

testIt = function(){
    tests.forEach(t=> {
        if (t.serialize == null){
            runAsync(t.script, result=>{
                console.log(t.name, t.expected == result);
            });
        }else{
            var result = runSerialized(t.script);
            console.log(t.name, t.expected == result);
        }
    });       
}