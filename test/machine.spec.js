var events = require('events');
var stream = require('stream');

var Datagram = require('../lib/datagram');
var Machine = require('../app/machine');


describe('Machine', function () {
  var tcp_server = null;
  var tcp_connection_listener_count = 0;
  var handleTcpServerListener;
  var onTcpConnection;

  beforeEach(function () {
    tcp_connection_listener_count = 0;
    onTcpConnection = null;

    handleTcpServerListener = function (type, listener) {
      if (type === 'connection') {
        tcp_connection_listener_count += 1;
        expect(listener).to.be.a('function');
        onTcpConnection = listener;
      }
    };

    tcp_server = {
      on: function (type, listener) {
        handleTcpServerListener.call(this, type, listener);
      },
      once: function (type, listener) {
        handleTcpServerListener.call(this, type, listener);
      },
      address: function () {
        return { port: 1234 };
      }
    };

    setTimeout.clear();
  });


  it('should start listening for server connections', function () {
    var datagram_client = { send: function () {} };
    var machine = new Machine(datagram_client, tcp_server, null);

    machine.init();
    expect(tcp_connection_listener_count).to.be(1);
  });


  describe('datagram emission', function () {
    var datagram = null;
    var datagram_client = null;
    var datagram_count = 0;

    beforeEach(function () {
      datagram_count = 0;
      datagram_client = {
        send: function (_datagram) {
          datagram_count += 1;
          datagram = _datagram;
        }
      };
    });


    describe('(type: new-machine)', function () {
      it('should send a new-machine datagram on init', function () {
        var machine = new Machine(datagram_client, tcp_server, null);

        machine.init();
        expect(datagram_count).to.be(1);
        expect(datagram).to.be.a(Datagram);
        expect(datagram.data['type']).to.be('new-machine');
        expect(datagram.data['tcp']).to.be(1234);
      });


      it('should keep sending new-machine datagrams until a server connection',
          function () {
        var machine = new Machine(datagram_client, tcp_server, null);

        machine.init();
        expect(datagram_count).to.be(1);

        setTimeout.flush();
        expect(datagram_count).to.be(2);

        setTimeout.flush();
        expect(datagram_count).to.be(3);

        var socket = new events.EventEmitter();
        socket.write = function () {};

        onTcpConnection(socket);
        setTimeout.flush();
        expect(datagram_count).to.be(3);
      });


      describe('reconnect', function () {
        var socket = null;

        beforeEach(function () {
          socket = new events.EventEmitter();
          socket.write = function () {};
        });


        it('should send a new-machine datagram on server disconnect',
            function () {
          var machine = new Machine(datagram_client, tcp_server, null);

          machine.init();
          datagram = null;
          datagram_count = 0;

          onTcpConnection(socket);
          socket.emit('close', false);
          expect(datagram_count).to.be(1);
          expect(datagram).to.be.a(Datagram);
          expect(datagram.data['type']).to.be('new-machine');
          expect(datagram.data['tcp']).to.be(1234);
        });


        it('should keep sending new-machine datagrams after disconnect',
            function () {
          var machine = new Machine(datagram_client, tcp_server, null);

          machine.init();
          onTcpConnection(socket);
          datagram = null;
          datagram_count = 0;

          socket.emit('close', false);
          setTimeout.flush(0);
          expect(datagram_count).to.be(1);

          setTimeout.flush();
          expect(datagram_count).to.be(2);

          setTimeout.flush();
          expect(datagram_count).to.be(3);

          onTcpConnection(socket);
          setTimeout.flush();
          expect(datagram_count).to.be(3);
        });
      });
    });
  });


  describe('server control', function () {
    var datagram_client = null;
    var socket = null;
    var tcp_messages = [];

    beforeEach(function () {
      datagram_client = {
        send: function (datagram) {}
      };
      tcp_messages = [];
      socket = new events.EventEmitter();
      socket.write = function (json) {
        tcp_messages.push(JSON.parse(json));
      };
    });


    it('should start an app based on a server message', function () {
      var start_count = 0;
      var app_manager = {
        start: function (_app, _branch) {
          start_count += 1;
          app = _app;
          branch = _branch;
        }
      };

      var machine = new Machine(datagram_client, tcp_server, app_manager);

      machine.init();
      onTcpConnection(socket);

      socket.emit('data', JSON.stringify({
        'type': 'start',
        'app': 'abc',
        'branch': 'master'
      }));

      expect(start_count).to.be(1);
      expect(app).to.be('abc');
      expect(branch).to.be('master');
    });


    it('should stop an app based on a server message', function () {
      var stop_count = 0;
      var app_manager = {
        stop: function (_app, _branch) {
          stop_count += 1;
          app = _app;
          branch = _branch;
        }
      };

      var machine = new Machine(datagram_client, tcp_server, app_manager);

      machine.init();
      onTcpConnection(socket);

      socket.emit('data', JSON.stringify({
        'type': 'stop',
        'app': 'abc',
        'branch': 'master'
      }));

      expect(stop_count).to.be(1);
      expect(app).to.be('abc');
      expect(branch).to.be('master');
    });


    it('should challenge the server to create an extra connection for install',
        function () {
      var app_manager = {
        getCurrentVersion: function (app, callback) {
          callback(null, null);
        }
      };

      var machine = new Machine(datagram_client, tcp_server, app_manager);
      machine.init();
      onTcpConnection(socket);

      socket.emit('data', JSON.stringify({
        'type': 'install',
        'apps': { 'abc': 'aaaa1111' },
        'branch': 'master'
      }));

      var tcp_message = tcp_messages.slice(-1)[0];
      expect(tcp_message).to.be.ok();
      expect(tcp_message['type']).to.be('connection-challenge');
      expect(tcp_message['id']).to.be.a('string');
      expect(tcp_message['app']).to.be('abc');
      expect(tcp_message['bundle']).to.eql([ null, 'aaaa1111' ]);
    });


    it('should challenge the server to create an extra connection for upgrade',
        function () {
      var app_manager = {
        getCurrentVersion: function (app, callback) {
          callback(null, 'aaaa1111');
        }
      };

      var machine = new Machine(datagram_client, tcp_server, app_manager);
      machine.init();
      onTcpConnection(socket);

      socket.emit('data', JSON.stringify({
        'type': 'install',
        'apps': { 'abc': 'bbbb2222' },
        'branch': 'master'
      }));

      var tcp_message = tcp_messages.slice(-1)[0];
      expect(tcp_message).to.be.ok();
      expect(tcp_message['type']).to.be('connection-challenge');
      expect(tcp_message['id']).to.be.a('string');
      expect(tcp_message['app']).to.be('abc');
      expect(tcp_message['bundle']).to.eql([ 'aaaa1111', 'bbbb2222' ]);
    });


    it('should not send role messages to challenge sockets', function () {
      var outgoing_messages = [];

      var machine = new Machine(datagram_client, tcp_server, null);
      machine.init();
      onTcpConnection(socket);

      var challenge_socket = new events.EventEmitter();
      challenge_socket.write = function (chunk) {
        outgoing_messages.push(String(chunk));
      };
      onTcpConnection(challenge_socket);

      expect(outgoing_messages).to.eql([]);
    });


    it('should stay in the cluster after accepting a challenge response',
        function () {
    });


    describe('accepting bundles', function () {
      var installer;
      var install_source;
      var app_manager;

      var install_count = 0;
      var bundle_data = '';
      var destroyed = false;
      var app = null;

      beforeEach(function () {
        install_count = 0;
        bundle_data = '';
        install_source = null;
        destroyed = false;
        app = null;

        installer = new stream.Writable();
        installer.write = function (chunk) {
          bundle_data += String(chunk);
        };
        installer.once('pipe', function (_source) {
          install_source = _source;
        });

        app_manager = {
          getCurrentVersion: function (_app, callback) {
            callback(null, 'aaaa1111');
          },
          createBundleInstaller: function (_app) {
            install_count += 1;
            app = _app;
            return installer;
          }
        };
      });


      var createBundleSocket = function (chunks) {
        var challenge_socket = new stream.Readable();
        challenge_socket._read = function () {
          this.push(chunks.shift() || null);
        };
        challenge_socket.destroy = function () {
          destroyed = true;
        };
        return challenge_socket;
      };


      it('should accept bundles preceeded by challenge headers', function () {
        var machine = new Machine(datagram_client, tcp_server, app_manager)
        machine.init();
        onTcpConnection(socket);

        socket.emit('data', JSON.stringify({
          'type': 'install',
          'apps': { 'abc': 'bbbb2222' },
          'branch': 'master'
        }));

        var tcp_message = tcp_messages.slice(-1)[0];
        var challenge_id = tcp_message['id'];
        var challenge_socket = createBundleSocket([
          new Buffer(JSON.stringify({
            'challenge': challenge_id,
            'app': 'abc',
            'bundle': [ 'aaaa1111', 'bbbb2222' ]
          }) + '\n'),
          new Buffer('AAAA'),
          new Buffer('BBBB')
        ]);
        onTcpConnection(challenge_socket);

        expect(install_count).to.be(1);
        expect(app).to.be('abc');
        expect(bundle_data).to.be('AAAABBBB');
        expect(install_source).to.be(challenge_socket);
      });


      it('should reject bundles preceeded by invalid headers', function () {
        var machine = new Machine(datagram_client, tcp_server, app_manager)
        machine.init();
        onTcpConnection(socket);

        socket.emit('data', JSON.stringify({
          'type': 'install',
          'apps': { 'abc': 'bbbb2222' },
          'branch': 'master'
        }));

        var challenge_socket = createBundleSocket([
          new Buffer(JSON.stringify({
            'app': 'abc',
            'bundle': [ 'aaaa1111', 'bbbb2222' ]
          }) + '\n'),
          new Buffer('AAAA'),
          new Buffer('BBBB')
        ]);
        onTcpConnection(challenge_socket);

        expect(install_count).to.be(0);
        expect(destroyed).to.be(true);
      });


      it('should reject bundles with invalid challenges', function () {
        var machine = new Machine(datagram_client, tcp_server, app_manager)
        machine.init();
        onTcpConnection(socket);

        socket.emit('data', JSON.stringify({
          'type': 'install',
          'apps': { 'abc': 'bbbb2222' },
          'branch': 'master'
        }));

        var challenge_socket = createBundleSocket([
          new Buffer(JSON.stringify({
            'challenge': 'asdf',
            'app': 'abc',
            'bundle': [ 'aaaa1111', 'bbbb2222' ]
          }) + '\n'),
          new Buffer('AAAA'),
          new Buffer('BBBB')
        ]);
        onTcpConnection(challenge_socket);

        expect(install_count).to.be(0);
        expect(destroyed).to.be(true);
      });
    });
  });


  describe('roles', function () {
    var datagram_client;
    var socket;
    var messages;

    beforeEach(function () {
      datagram_client = {
        send: function (datagram) {}
      };
      socket = {
        on: function (type, listener) {},
        once: function (type, listener) {},
        write: function (message, encoding, callback) {
          messages.push({
            data: message,
            encoding: encoding,
            callback: callback
          });
        }
      };
      messages = [];
    });


    it('should report its role to the server', function () {
      var machine = new Machine(datagram_client, tcp_server, null);

      machine.init(null, 'abc');
      onTcpConnection(socket);

      expect(messages.length).to.be(1);
      expect(messages[0].data).to.be.a('string');

      var message = JSON.parse(messages[0].data);
      expect(message).to.be.an('object');
      expect(message['type']).to.be('role');
      expect(message['environment']).to.be('_default');
      expect(message['roles']).to.eql([ 'abc' ]);
    });


    it('should support multiple roles', function () {
      var machine = new Machine(datagram_client, tcp_server, null);

      machine.init(null, [ 'abc', 'efg' ]);
      onTcpConnection(socket);

      expect(messages.length).to.be(1);
      expect(messages[0].data).to.be.a('string');

      var message = JSON.parse(messages[0].data);
      expect(message).to.be.an('object');
      expect(message['type']).to.be('role');
      expect(message['environment']).to.be('_default');
      expect(message['roles']).to.eql([ 'abc', 'efg' ]);
    });
  });
});
