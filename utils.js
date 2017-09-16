/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('utils');
 * mod.thing == 'a thing'; // true
 */

module.exports = {
   values:function(obj){
       let array = [];
       for (var key in obj){
           array.push(obj[key]);
       }
       return array;
   }
};