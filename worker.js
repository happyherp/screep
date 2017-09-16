
var worker = {
    
    findConstructionSite:function(creep){
        var targets = creep.room.find(FIND_CONSTRUCTION_SITES);
            if(targets.length) {
                return targets[0];
            }
        return null;
    },
    
    findSomethingToFeed:function(creep){
        var targets = creep.room.find(FIND_STRUCTURES, {
            filter: (structure) => {
                return (structure.structureType == STRUCTURE_EXTENSION ||
                    structure.structureType == STRUCTURE_SPAWN ||
                    structure.structureType == STRUCTURE_TOWER) && structure.energy < structure.energyCapacity;
            }
        });
        if(targets.length > 0) {
           return targets[0];
        }
        return null;
    },
    
    harvest:function(creep){
        if (creep.memory.sourceTarget === undefined){
            var sources = creep.room.find(FIND_SOURCES_ACTIVE);
            var source = sources[_.random(0, sources.length-1)];
            creep.memory.sourceTarget = source.id;
        }
        var source = Game.getObjectById(creep.memory.sourceTarget);
        if (creep.harvest(source) !== OK){
            creep.moveTo(source, {ignoreCreeps:false, resuePath:5,visualizePathStyle: {stroke: '#ffff00'}});
        }
    },
    
    chooseNewAction: function(creep){
        
        if(creep.carry.energy == 0) {
            creep.memory.state='harvesting';
        }else if (creep.room.controller.ticksToDowngrade < 4000){
            creep.memory.state='upgrading';
        }else if (worker.findSomethingToFeed(creep)){
            creep.memory.state="feeding";
        }else if (worker.findConstructionSite(creep)){
            creep.memory.state="building";
        }else{
            creep.memory.state='upgrading';
        }
        creep.say(creep.memory.state);
    },

    /** @param {Creep} creep **/
    run: function(creep) {
        if (creep.memory.state === undefined){
            worker.chooseNewAction(creep);
        }
        
        if(creep.carry.energy == 0) {
            creep.memory.state='harvesting';
        } 
        
        if(creep.memory.state==="upgrading") {
            if(creep.upgradeController(creep.room.controller) == ERR_NOT_IN_RANGE) {
                creep.moveTo(creep.room.controller, {resuePath:5 ,visualizePathStyle: {stroke: '#ffffff'}});
            }
        }
        if(creep.memory.state==="building") {
            var site = worker.findConstructionSite(creep);
            if (!site){
                worker.chooseNewAction(creep);
                worker.run(creep);
                return;
            }
            if(creep.build(site) == ERR_NOT_IN_RANGE) {
                creep.moveTo(site, {visualizePathStyle: {stroke: '#ffffff'}});
            }
        }
        
        if (creep.memory.state==="feeding"){
            var target = worker.findSomethingToFeed(creep);
             if (!target){
                worker.chooseNewAction(creep);
                worker.run(creep);
                return;
            }
            if(creep.transfer(target, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                creep.moveTo(target, {resuePath:5 ,visualizePathStyle: {stroke: '#ffffff'}});
            }
        }
        if(creep.memory.state === 'harvesting') {
            if (creep.carryCapacity == creep.carry.energy){
                creep.memory.sourceTarget = undefined;
                worker.chooseNewAction(creep);
                worker.run(creep);
                return;                
            }
            worker.harvest(creep);
        }
    }
};

module.exports = worker;