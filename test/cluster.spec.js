var events = require('events');

var Cluster = require('../app/cluster');
var Datagram = require('../lib/datagram');


describe('Cluster', function () {
  var datagram_server = null;
  var datagram_listener_count = 0;
  var tcp = null;
  var tcp_connection_address = null;
  var tcp_connection_port = null;
  var tcp_connection_count = 0;
  var socket = null;
  var onDatagram = null;

  beforeEach(function () {
    datagram_listener_count = 0;
    tcp_connection_address = null;
    tcp_connection_port = null;
    tcp_connection_count = 0;
    socket = null;
    onDatagram = null;

    handleDatagramServerListener = function (type, listener) {
      if (type === 'message') {
        datagram_listener_count += 1;
        expect(listener).to.be.a('function');
        onDatagram = listener;
      }
    };

    datagram_server = {
      on: function (type, listener) {
        handleDatagramServerListener.call(this, type, listener);
      }
    };

    tcp = {
      connect: function (address, port) {
        tcp_connection_count += 1;
        tcp_connection_address = address;
        tcp_connection_port = port;

        return socket || new events.EventEmitter();
      }
    };

    setTimeout.clear();
  });


  it('should start listening for datagrams', function () {
    var cluster = new Cluster(datagram_server, tcp);

    cluster.init();
    expect(datagram_listener_count).to.be(1);
  });


  it('should accept a new-machine datagram and try to connect to the machine',
      function () {
    var cluster = new Cluster(datagram_server, tcp);
    cluster.init();

    var datagram = new Datagram({ 'type': 'new-machine', 'tcp': 1234 });
    var info = { address: '123.1.1.1' };
    onDatagram(datagram, info);
    expect(tcp_connection_count).to.be(1);
    expect(tcp_connection_address).to.be('123.1.1.1');
    expect(tcp_connection_port).to.be(1234);
  });


  it('should not add the same machine twice', function () {
    var cluster = new Cluster(datagram_server, tcp);
    cluster.init();

    var datagram = new Datagram({ 'type': 'new-machine', 'tcp': 1234 });
    var info = { address: '123.1.1.1' };
    onDatagram(datagram, info);
    onDatagram(datagram, info);
    expect(tcp_connection_count).to.be(1);
  });


  it('should add multiple machines', function () {
    var cluster = new Cluster(datagram_server, tcp);
    cluster.init();

    var datagram_a = new Datagram({ 'type': 'new-machine', 'tcp': 1234 });
    var info_a = { address: '123.1.1.1' };
    onDatagram(datagram_a, info_a);
    expect(tcp_connection_count).to.be(1);

    var datagram_b = new Datagram({ 'type': 'new-machine', 'tcp': 1235 });
    var info_b = { address: '123.1.1.2' };
    onDatagram(datagram_b, info_b);
    expect(tcp_connection_count).to.be(2);
  });


  describe('reconnect', function () {
    var onClose = null;
    var onError = null;

    beforeEach(function () {
      onClose = null;
      onError = null;

      socket = {
        on: function (type, listener) {
          switch (type) {
          case 'close': onClose = listener; break;
          case 'error': onError = listener; break;
          }
        }
      };
    });


    it('should try to reconnect on machine disconnect', function () {
      var cluster = new Cluster(datagram_server, tcp);
      cluster.init();

      var datagram = new Datagram({ 'type': 'new-machine', 'tcp': 1234 });
      var info = { address: '123.1.1.1' };
      onDatagram(datagram, info);
      tcp_connection_count = 0;

      onClose(false);
      setTimeout.flush();
      expect(tcp_connection_count).to.be(1);
    });


    it('should try to reconnect on connection error', function () {
      var cluster = new Cluster(datagram_server, tcp);
      cluster.init();

      var datagram = new Datagram({ 'type': 'new-machine', 'tcp': 1234 });
      var info = { address: '123.1.1.1' };
      onDatagram(datagram, info);
      tcp_connection_count = 0;

      onError(new Error());
      onClose(true);
      setTimeout.flush();
      expect(tcp_connection_count).to.be(1);
    });


    it('should try to reconnect after one second after connection failure',
        function () {
      var cluster = new Cluster(datagram_server, tcp);
      cluster.init();

      var datagram = new Datagram({ 'type': 'new-machine', 'tcp': 1234 });
      var info = { address: '123.1.1.1' };
      onDatagram(datagram, info);
      tcp_connection_count = 0;

      onError(new Error());
      onClose(true);
      expect(tcp_connection_count).to.be(0);

      setTimeout.flush(900);
      expect(tcp_connection_count).to.be(0);

      setTimeout.flush(100);
      expect(tcp_connection_count).to.be(1);
    });
  });
});
