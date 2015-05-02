'use strict';

describe('connection', function () {
  it('should connect to disque server successfully', function (done) {
    var node = new MockServer(7712, function (argv) {
      if (argv.toString() === 'cluster,nodes') {
        return '7a656412ba0761bbcab0ebf2b4247e84694cfcea :7712 myself 0 0 connected\n';
      }
    });
    node.on('connect', function () {
      disque.disconnect();
      disconnect([node], done);
    });

    var disque = new Disque([{ port: 7712 }]);
  });
});

function disconnect (clients, callback) {
  var pending = 0;

  for (var i = 0; i < clients.length; ++i) {
    pending += 1;
    clients[i].disconnect(check);
  }

  function check () {
    if (!--pending) {
      callback();
    }
  }
}
