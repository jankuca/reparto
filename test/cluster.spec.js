var events = require('events');

var Cluster = require('../app/cluster');
var Datagram = require('../lib/datagram');


describe('Cluster', function () {
  it('should start listening for datagrams', function () {
    var count = 0;
    var mock_method = function (type, listener) {
      count += 1;
      expect(type).to.be('message');
      expect(listener).to.be.a('function');
    };

    var datagram_server = { on: mock_method };
    var cluster = new Cluster(datagram_server, null);

    cluster.init();
    expect(count).to.be(1);
  });

  it('should accept a new-machine datagram and try to connect to the machine',
      function () {
    var count = 0;
    var _listener;
    var _address;
    var _port;

    var datagram_server = {
      on: function (type, listener) {
        _listener = listener;
      }
    };
    var tcp = {
      connect: function (address, port) {
        count += 1;
        _address = address;
        _port = port;

        return new events.EventEmitter();
      }
    };
    var cluster = new Cluster(datagram_server, tcp);

    cluster.init();

    var datagram = new Datagram({
      'type': 'new-machine',
      'tcp': 1234
    });
    var info = {
      address: '123.1.1.1'
    };
    _listener(datagram, info);

    expect(count).to.be(1);
    expect(_address).to.be('123.1.1.1');
    expect(_port).to.be(1234);
  });
});
