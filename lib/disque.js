'use strict';

var Redis = require('ioredis');
var util = require('util');
var _ = require('lodash');
var commands = require('./commands');
var debug = require('debug')('disque:disque');

function Disque(startupNodes, options) {
  Redis.call(this, _.assign(options || {}, {
    clusterRetryStrategy: null,
    lazyConnect: true,
    disqueNodes: startupNodes
  }));

  this.nodes = {};
  this.connect();
  var _this = this;
  this.on('connect', function () {
    _this.client.on('connect', function () {
      _this.stream = _this.client.stream;
      _this.sendCommand = _this.client.sendCommand.bind(_this.client);
      _this.setStatus('ready');
      if (_this.offlineQueue.length) {
        debug('send %d commands in offline queue', _this.offlineQueue.length);
        while (_this.offlineQueue.length > 0) {
          var item = _this.offlineQueue.shift();
          _this.client.sendCommand(item.command, item.stream);
        }
      }
    });
  });
}

util.inherits(Disque, Redis);

Disque.prototype.getBuiltinCommands().forEach(function (commandName) {
  delete Disque.prototype[commandName];
});

_.forEach(commands, function (commandName) {
  Disque.prototype[commandName] = Disque.prototype.createBuiltinCommand(commandName).string;
  Disque.prototype[commandName + 'Buffer'] = Disque.prototype.createBuiltinCommand(commandName).buffer;
});

Disque.prototype.connect = function (callback) {
  if (this.status === 'connecting' || this.status === 'connect') {
    return false;
  }
  this.setStatus('connecting');
  this.connecting = true;
  this.retryAttempts = 0;
  this.condition = { mode: {} };

  if (typeof this.currentPoint !== 'number') {
    this.currentPoint = -1;
  }

  var _this = this;
  connectToNext();

  function connectToNext() {
    _this.currentPoint += 1;
    if (_this.currentPoint === _this.options.disqueNodes.length) {
      _this.emit('error', new Error('All nodes are unreachable.'));
      return;
    }

    var endpoint = _this.options.disqueNodes[_this.currentPoint];
    var client = new Redis({
      port: endpoint.port,
      host: endpoint.host,
      retryStrategy: null,
      enableReadyCheck: false,
      connectTimeout: 2000
    });
    client.cluster('nodes', function (err, lines) {
      client.disconnect();
      if (!_this.connecting) {
        return;
      }
      if (err) {
        debug('failed to connect to node %s:%s because %s', endpoint.host, endpoint.port, err);
        return connectToNext();
      }
      if (typeof lines !== 'string') {
        debug('connected to node %s:%s successfully, but got a invalid reply: %s', endpoint.host, endpoint.port, lines);
        connectToNext();
      }
      debug('connected to node %s:%s', endpoint.host, endpoint.port);
      lines.split('\n').forEach(function (line) {
        var res = line.split(' ');
        var id = res[0];
        var host = res[1];
        var flag = res[2];
        var prefix = id.slice(0, 8);
        if (flag === 'myself') {
          _this.client = new Redis({
            port: client.options.port,
            host: client.options.host,
            enableReadyCheck: false
          });
          _this.prefix = prefix;
        }
        _this.nodes[prefix] = host;
      });
      _this.setStatus('connect');
    });
  }
};

module.exports = Disque;
