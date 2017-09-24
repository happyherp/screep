
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



function A(){
    this.val = 3;
}

A.prototype.aonly = "abc"
A.prototype.s = "in A";

a = new A();

function B(){
    A.call(this);
}

B.prototype = Object.create(A.prototype);
B.prototype.constructor = B;
B.prototype.bonly = "abc";
B.prototype.s = "in B";


b = new B()

function C(){
    B.call(this);
}

C.prototype = Object.create(B.prototype);
C.prototype.constructor = C;
C.prototype.conly = "abc"
C.prototype.s = "in C";
c = new C();