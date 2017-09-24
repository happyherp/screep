
testIt = function(){
    console.log("fak", run(scriptFak) == 120);
    console.log("reassign", run(scriptReassign) == 4);
    console.log("loop",run(scriptLoop) == 16);
    console.log("script",run(script) == 10);
    console.log("varFromJs",run(scriptVarFromJS) == 12);
    console.log("scriptImplicitSeq",run(scriptImplicitSeq) == 16);
    console.log("scriptImplicitJS",run(scriptImplicitJS) == 123);
    
    console.log("serialized", runSerialized(script) == 10);
}