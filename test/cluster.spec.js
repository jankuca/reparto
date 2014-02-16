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
  var tcp_messages = null;
  var onDatagram = null;

  beforeEach(function () {
    datagram_listener_count = 0;
    tcp_connection_address = null;
    tcp_connection_port = null;
    tcp_connection_count = 0;
    socket = null;
    tcp_messages = [];
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

        socket = socket || new events.EventEmitter();
        socket.write = function (json) {
          tcp_messages.push(JSON.parse(json));
        };

        return socket;
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
    it('should try to reconnect on machine disconnect', function () {
      var cluster = new Cluster(datagram_server, tcp);
      cluster.init();

      var datagram = new Datagram({ 'type': 'new-machine', 'tcp': 1234 });
      var info = { address: '123.1.1.1' };
      onDatagram(datagram, info);
      tcp_connection_count = 0;

      socket.emit('close', false);
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

      socket.emit('error', new Error());
      socket.emit('close', true);
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

      socket.emit('error', new Error());
      socket.emit('close', true);
      expect(tcp_connection_count).to.be(0);

      setTimeout.flush(900);
      expect(tcp_connection_count).to.be(0);

      setTimeout.flush(100);
      expect(tcp_connection_count).to.be(1);
    });
  });


  describe('roles', function () {
    var createConfigRepository = function (data) {
      return {
        get: function (collection, key, callback) {
          var collection = data[collection] || {};
          var item = collection[key] || null;
          callback(null, item);
        },
        set: function (collection, key, value, callback) {
          data[collection] = data[collection] || {};
          value['_id'] = key;
          data[collection][key] = value;
          callback(null);
        }
      };
    };

    var connect = function () {
      var datagram = new Datagram({ 'type': 'new-machine', 'tcp': 1234 });
      var info = { address: '123.1.1.1' };
      onDatagram(datagram, info);
    };


    it('should provide machines with app lists in response to a role message',
        function () {
      var role = { 'apps': [ 'api', 'ui' ]};
      var config = createConfigRepository({
        'roles': { 'abc': role }
      });

      var cluster = new Cluster(datagram_server, tcp, config);
      cluster.init();
      connect();

      socket.emit('message', JSON.stringify({
        'type': 'role',
        'environment': 'production',
        'roles': [ 'abc' ]
      }));

      expect(tcp_messages.length).to.be(1);
      expect(tcp_messages[0]['type']).to.be('apps');
      expect(tcp_messages[0]['apps']).to.eql(role['apps']);
    });
  });
});
