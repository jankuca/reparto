var events = require('events');

var Cluster = require('../app/cluster');
var Datagram = require('../lib/datagram');


describe('Cluster', function () {
  it('should start listening for datagrams', function () {
    var count = 0;
    var handleDatagramServerListener = function (type, listener) {
      if (type === 'message') {
        count += 1;
        expect(listener).to.be.a('function');
      }
    };

    var datagram_server = { on: handleDatagramServerListener };
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
      on: function (type, listener) { _listener = listener; }
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

    var datagram = new Datagram({ 'type': 'new-machine', 'tcp': 1234 });
    var info = { address: '123.1.1.1' };
    _listener(datagram, info);

    expect(count).to.be(1);
    expect(_address).to.be('123.1.1.1');
    expect(_port).to.be(1234);
  });


  it('should not add the same machine twice', function () {
    var count = 0;
    var _listener;

    var datagram_server = {
      on: function (type, listener) { _listener = listener; }
    };
    var tcp = {
      connect: function (address, port) {
        count += 1;
        return new events.EventEmitter();
      }
    };
    var cluster = new Cluster(datagram_server, tcp);
    cluster.init();

    var datagram = new Datagram({ 'type': 'new-machine', 'tcp': 1234 });
    var info = { address: '123.1.1.1' };
    _listener(datagram, info);
    _listener(datagram, info);

    expect(count).to.be(1);
  });


  it('should add multiple machines', function () {
    var count = 0;
    var _listener;

    var datagram_server = {
      on: function (type, listener) { _listener = listener; }
    };
    var tcp = {
      connect: function (address, port) {
        count += 1;
        return new events.EventEmitter();
      }
    };
    var cluster = new Cluster(datagram_server, tcp);
    cluster.init();

    var datagram_a = new Datagram({ 'type': 'new-machine', 'tcp': 1234 });
    var info_a = { address: '123.1.1.1' };
    _listener(datagram_a, info_a);

    var datagram_b = new Datagram({ 'type': 'new-machine', 'tcp': 1235 });
    var info_b = { address: '123.1.1.2' };
    _listener(datagram_b, info_b);

    expect(count).to.be(2);
  });


  it('should try to reconnect on machine disconnect', function () {
    var count = 0;
    var _message_listener;
    var _close_listener;

    var socket = {
      on: function (type, listener) {
        if (type === 'close') {
          _close_listener = listener;
        }
      }
    };

    var datagram_server = {
      on: function (type, listener) { _message_listener = listener; }
    };
    var tcp = {
      connect: function (address, port) {
        count += 1;
        return socket;
      }
    };
    var cluster = new Cluster(datagram_server, tcp);
    cluster.init();

    var datagram = new Datagram({ 'type': 'new-machine', 'tcp': 1234 });
    var info = { address: '123.1.1.1' };
    _message_listener(datagram, info);
    count = 0;

    _close_listener(false);
    setTimeout.flush();

    expect(count).to.be(1);
  });


  it('should try to reconnect on connection error', function () {
    var count = 0;
    var _message_listener;
    var _close_listener;
    var _error_listener;

    var socket = {
      on: function (type, listener) {
        if (type === 'close') {
          _close_listener = listener;
        }
        if (type === 'error') {
          _error_listener = listener;
        }
      }
    };

    var datagram_server = {
      on: function (type, listener) { _message_listener = listener; }
    };
    var tcp = {
      connect: function (address, port) {
        count += 1;
        return socket;
      }
    };
    var cluster = new Cluster(datagram_server, tcp);
    cluster.init();

    var datagram = new Datagram({ 'type': 'new-machine', 'tcp': 1234 });
    var info = { address: '123.1.1.1' };
    _message_listener(datagram, info);
    count = 0;

    _error_listener();
    _close_listener(true);
    setTimeout.flush();

    expect(count).to.be(1);
  });


  it('should try to reconnect after one second after connection failure',
      function () {
    var count = 0;
    var _message_listener;
    var _close_listener;
    var _error_listener;

    var socket = {
      on: function (type, listener) {
        if (type === 'close') {
          _close_listener = listener;
        }
        if (type === 'error') {
          _error_listener = listener;
        }
      }
    };

    var datagram_server = {
      on: function (type, listener) { _message_listener = listener; }
    };
    var tcp = {
      connect: function (address, port) {
        count += 1;
        return socket;
      }
    };
    var cluster = new Cluster(datagram_server, tcp);
    cluster.init();

    var datagram = new Datagram({ 'type': 'new-machine', 'tcp': 1234 });
    var info = { address: '123.1.1.1' };
    _message_listener(datagram, info);
    count = 0;

    _error_listener();
    _close_listener(true);
    expect(count).to.be(0);

    setTimeout.flush(900);
    expect(count).to.be(0);

    setTimeout.flush(100);
    expect(count).to.be(1);
  });
});
