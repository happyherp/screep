
testIt = function(){
    console.log("fak", run(scriptFak) == 120);
    console.log("reassign", run(scriptReassign) == 4);
    console.log("loop",run(scriptLoop) == 16);
    console.log("script",run(script) == 10);
    console.log("varFromJs",run(scriptVarFromJS) == 12);
    
}