var worker = require("worker");
var utils = require('utils');
var _ = require("lodash");
module.exports.loop = function () {
    
    
    var spawn = utils.values(Game.spawns)[0];
    if (spawn.room.energyAvailable === spawn.room.energyCapacityAvailable && _.values(Game.creeps).length < 15){
        
        var mult = Math.floor(spawn.room.energyAvailable / (BODYPART_COST[MOVE]+ BODYPART_COST[WORK] + BODYPART_COST[CARRY]));
        var bodyparts = [];
        for (var i = 0;i<mult;i++){
            bodyparts =  bodyparts.concat([MOVE, WORK, CARRY]);
        }
        var name = spawn.createCreep(bodyparts);
        console.log("created "+name+ "with "+bodyparts);
    }

    for(var name in Game.creeps) {
        var creep = Game.creeps[name];
        worker.run(creep);
    }
}