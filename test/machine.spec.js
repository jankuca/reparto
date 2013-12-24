var events = require('events');

var Datagram = require('../lib/datagram');
var Machine = require('../app/machine');


describe('Machine', function () {
  it('should start listening for server connections', function () {
    var count = 0;
    var mock_method = function (type, listener) {
      if (type === 'connection') {
        count += 1;
        expect(listener).to.be.a('function');
      }
    };

    var datagram_client = { send: function () {} };
    var tcp_server = {
      on: mock_method,
      address: function () { return { port: 1234 }; }
    };
    var machine = new Machine(datagram_client, tcp_server, null, null);

    machine.init();
    expect(count).to.be(1);
  });


  it('should send a new-machine datagram on init', function () {
    var count = 0;
    var _datagram;

    var datagram_client = {
      send: function (datagram) {
        count += 1;
        _datagram = datagram;
      }
    };
    var tcp_server = {
      on: function () {},
      address: function () { return { port: 1234 }; }
    };
    var machine = new Machine(datagram_client, tcp_server, null, null);

    machine.init();
    expect(count).to.be(1);
    expect(_datagram).to.be.a(Datagram);
    expect(_datagram.data['type']).to.be('new-machine');
    expect(_datagram.data['tcp']).to.be(1234);
  });


  it('should keep sending new-machine datagrams until a server connection',
      function () {
    var count = 0;
    var _connection_listener;
    var mock_method = function (type, listener) {
      if (type === 'connection') {
        _connection_listener = listener;
      }
    };

    var datagram_client = {
      send: function (datagram) { count += 1; }
    };
    var tcp_server = {
      on: mock_method,
      address: function () { return { port: 1234 }; }
    };
    var machine = new Machine(datagram_client, tcp_server, null, null);

    machine.init();
    expect(count).to.be(1);

    setTimeout.flush();
    expect(count).to.be(2);

    setTimeout.flush();
    expect(count).to.be(3);

    var socket = new events.EventEmitter();
    _connection_listener(socket);
    setTimeout.flush();
    expect(count).to.be(3);
  });


  it('should send a new-machine datagram on server disconnect', function () {
    var _datagram;
    var _connection_listener;
    var mock_method = function (type, listener) {
      if (type === 'connection') {
        _connection_listener = listener;
      }
    };

    var socket = {
      on: function (type, listener) {
        if (type === 'close') {
          _close_listener = listener;
        }
      }
    };

    var datagram_client = {
      send: function (datagram) { _datagram = datagram; }
    };
    var tcp_server = {
      on: mock_method,
      address: function () { return { port: 1234 }; }
    };
    var machine = new Machine(datagram_client, tcp_server, null, null);

    machine.init();
    _datagram = null;

    _connection_listener(socket);
    _close_listener(false);
    expect(_datagram).to.be.a(Datagram);
    expect(_datagram.data['type']).to.be('new-machine');
    expect(_datagram.data['tcp']).to.be(1234);
  });


  it('should keep sending new-machine datagrams after disconnect',
      function () {
    var count = 0;
    var _connection_listener;
    var _close_listener;
    var mock_method = function (type, listener) {
      if (type === 'connection') {
        _connection_listener = listener;
      }
    };

    var socket = {
      on: function (type, listener) {
        if (type === 'close') {
          _close_listener = listener;
        }
      }
    };

    var datagram_client = {
      send: function (datagram) { count += 1; }
    };
    var tcp_server = {
      on: mock_method,
      address: function () { return { port: 1234 }; }
    };
    var machine = new Machine(datagram_client, tcp_server, null, null);

    machine.init();
    _connection_listener(socket);
    count = 0;

    _close_listener(false);
    setTimeout.flush(0);
    expect(count).to.be(1);

    setTimeout.flush();
    expect(count).to.be(2);

    setTimeout.flush();
    expect(count).to.be(3);

    _connection_listener(socket);
    setTimeout.flush();
    expect(count).to.be(3);
  });
});
