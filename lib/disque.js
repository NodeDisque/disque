var Redis = require('ioredis');
var util = require('util');
var _ = require('lodash');
var commands = require('./commands');

function Disque(startupNodes, options) {
  options = _.defaults(options || {}, {
    clusterRetryStrategy: null
  });

  Redis.Cluster.apply(this, arguments);
}

util.inherits(Disque, Redis.Cluster);

Disque.prototype.getBuiltinCommands().forEach(function (commandName) {
  delete Disque.prototype[commandName];
});

_.forEach(commands, function (commandName) {
  Disque.prototype[commandName] = Disque.prototype.createBuiltinCommand(commandName).string;
  Disque.prototype[commandName + 'Buffer'] = Disque.prototype.createBuiltinCommand(commandName).buffer;
});

module.exports = Disque;
