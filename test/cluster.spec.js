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

    var handleDatagramServerListener = function (type, listener) {
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
        socket.address = function () {
          return { address: '127.0.0.1', port: 1234 };
        };
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


  describe('client control', function () {
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


    describe('roles', function () {
      it('should provide machines with app lists in response to a role message',
          function () {
        var role = { 'apps': [ 'api/master', 'ui/master' ]};
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


    describe('apps', function () {
      it('should instruct machines to install new apps', function () {
        var current_version_count = 0;
        var codebase = {
          getCurrentVersion: function (app, callback) {
            current_version_count += 1;
            expect(app).to.be('api');
            callback(null, 'aaaa1111');
          }
        };

        var cluster = new Cluster(datagram_server, tcp, null, codebase);
        cluster.init();
        connect();

        socket.emit('message', JSON.stringify({
          'type': 'versions',
          'apps': { 'api': null }
        }));

        expect(current_version_count).to.be(1);
        expect(tcp_messages.length).to.be(1);
        expect(tcp_messages[0]['type']).to.be('install');
        expect(tcp_messages[0]['apps']).to.eql({ 'api': 'aaaa1111' });
      });


      it('should instruct machines to uninstall old apps', function () {
        var current_version_count = 0;
        var codebase = {
          getCurrentVersion: function (app, callback) {
            current_version_count += 1;
            expect(app).to.be('api');
            callback(null, null);
          }
        };

        var cluster = new Cluster(datagram_server, tcp, null, codebase);
        cluster.init();
        connect();

        socket.emit('message', JSON.stringify({
          'type': 'versions',
          'apps': { 'api': 'aaaa1111' }
        }));

        expect(current_version_count).to.be(1);
        expect(tcp_messages.length).to.be(1);
        expect(tcp_messages[0]['type']).to.be('remove');
        expect(tcp_messages[0]['apps']).to.eql([ 'api' ]);
      });


      it('should instruct machines to upgrade apps', function () {
        var current_version_count = 0;
        var codebase = {
          getCurrentVersion: function (app, callback) {
            current_version_count += 1;
            expect(app).to.be('api');
            callback(null, 'bbbb2222');
          }
        };

        var cluster = new Cluster(datagram_server, tcp, null, codebase);
        cluster.init();
        connect();

        socket.emit('message', JSON.stringify({
          'type': 'versions',
          'apps': { 'api': 'aaaa1111' }
        }));

        expect(current_version_count).to.be(1);
        expect(tcp_messages.length).to.be(1);
        expect(tcp_messages[0]['type']).to.be('upgrade');
        expect(tcp_messages[0]['apps']).to.eql({ 'api': 'bbbb2222' });
      });
    });


    describe('bundles', function () {
      var stream = null;
      var bundle_data;
      var received_data = '';
      var ended = false;
      var codebase;

      beforeEach(function () {
        received_data = '';
        ended = false;
        stream = null;
        bundle_data = Math.round(999999999 * Math.random()).toString(16);
        codebase = {
          createBundleStream: function (app, rev_list) {
            stream = new events.EventEmitter();
            stream.pipe = function (dest, options) {
              stream.on('data', dest.emit.bind(dest, 'data'));
              if (!options || options.end !== false) {
                stream.once('end', dest.emit.bind(dest, 'end'));
              }
            };
            return stream;
          }
        };
      });

      var wairForBundle = function () {
        received_data = '';
        ended = false;
        socket.write = function (chunk) {
          received_data += String(chunk);
        };
        socket.on('data', function (chunk) {
          received_data += String(chunk);
        });
        socket.once('end', function () {
          ended = true;
        });
      };


      it('should send whole-app bundles to machines when challenged',
          function () {
        var cluster = new Cluster(datagram_server, tcp, null, codebase);
        cluster.init();
        connect();

        var main_socket = socket;
        socket = null;

        main_socket.emit('message', JSON.stringify({
          'type': 'connection-challenge',
          'id': 'abcd1234',
          'app': 'abc',
          'bundle': [ null, 'aaaa1111' ]
        }));
        expect(tcp_connection_count).to.be(2);
        expect(socket).to.be.ok();

        wairForBundle();

        socket.emit('connect');
        stream.emit('data', bundle_data);
        stream.emit('end');

        var expected_header_json = JSON.stringify({
          'challenge': 'abcd1234',
          'app': 'abc',
          'bundle': [ null, 'aaaa1111' ]
        });
        expect(ended).to.be(true);
        expect(received_data).to.be(expected_header_json + '\n' + bundle_data);
      });


      it('should send partial bundles to machines when challenged',
          function () {
        var cluster = new Cluster(datagram_server, tcp, null, codebase);
        cluster.init();
        connect();

        var main_socket = socket;
        socket = null;

        main_socket.emit('message', JSON.stringify({
          'type': 'connection-challenge',
          'id': 'abcd5678',
          'app': 'abc',
          'bundle': [ 'aaaa1111', 'bbbb2222' ]
        }));
        expect(tcp_connection_count).to.be(2);
        expect(socket).to.be.ok();

        wairForBundle();

        socket.emit('connect');
        stream.emit('data', bundle_data);
        stream.emit('end');

        var expected_header_json = JSON.stringify({
          'challenge': 'abcd5678',
          'app': 'abc',
          'bundle': [ 'aaaa1111', 'bbbb2222' ]
        });
        expect(ended).to.be(true);
        expect(received_data).to.be(expected_header_json + '\n' + bundle_data);
      });
    });
  });
});
