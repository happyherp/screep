
function inherit(subclass, superclass){
    subclass.prototype = Object.create(superclass.prototype);
    subclass.prototype.constructor = subclass;
}
