var events = require('events');

var Datagram = require('../lib/datagram');
var Machine = require('../app/machine');


describe('Machine', function () {
  var tcp_server = null;
  var tcp_connection_listener_count = 0;
  var handleTcpServerListener;
  var onTcpConnection;

  beforeEach(function () {
    tcp_connection_listener_count = 0;

    handleTcpServerListener = function (type, listener) {
      if (type === 'connection') {
        tcp_connection_listener_count += 1;
        expect(listener).to.be.a('function');
        onTcpConnection = listener;
      }
    };

    tcp_server = {
      on: function (type, listener) {
        handleTcpServerListener.call(this, type, listener)
      },
      address: function () {
        return { port: 1234 };
      }
    };

    setTimeout.clear();
  });


  it('should start listening for server connections', function () {
    var datagram_client = { send: function () {} };
    var machine = new Machine(datagram_client, tcp_server, null, null);

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
        var machine = new Machine(datagram_client, tcp_server, null, null);

        machine.init();
        expect(datagram_count).to.be(1);
        expect(datagram).to.be.a(Datagram);
        expect(datagram.data['type']).to.be('new-machine');
        expect(datagram.data['tcp']).to.be(1234);
      });


      it('should keep sending new-machine datagrams until a server connection',
          function () {
        var machine = new Machine(datagram_client, tcp_server, null, null);

        machine.init();
        expect(datagram_count).to.be(1);

        setTimeout.flush();
        expect(datagram_count).to.be(2);

        setTimeout.flush();
        expect(datagram_count).to.be(3);

        var socket = new events.EventEmitter();
        onTcpConnection(socket);
        setTimeout.flush();
        expect(datagram_count).to.be(3);
      });


      describe('reconnect', function () {
        var socket = null;
        var onClose;

        beforeEach(function () {
          socket = {
            on: function (type, listener) {
              if (type === 'close') {
                onClose = listener;
              }
            }
          };
        });


        it('should send a new-machine datagram on server disconnect',
            function () {
          var machine = new Machine(datagram_client, tcp_server, null, null);

          machine.init();
          datagram = null;
          datagram_count = 0;

          onTcpConnection(socket);
          onClose(false);
          expect(datagram_count).to.be(1);
          expect(datagram).to.be.a(Datagram);
          expect(datagram.data['type']).to.be('new-machine');
          expect(datagram.data['tcp']).to.be(1234);
        });


        it('should keep sending new-machine datagrams after disconnect',
            function () {
          var machine = new Machine(datagram_client, tcp_server, null, null);

          machine.init();
          onTcpConnection(socket);
          datagram = null;
          datagram_count = 0;

          onClose(false);
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
    var onData;

    beforeEach(function () {
      datagram_client = {
        send: function (datagram) {}
      };
      socket = {
        on: function (type, listener) {
          if (type === 'data') {
            onData = listener;
          }
        }
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

      var machine = new Machine(datagram_client, tcp_server, app_manager, null);

      machine.init();
      onTcpConnection(socket);

      onData(JSON.stringify({
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

      var machine = new Machine(datagram_client, tcp_server, app_manager, null);

      machine.init();
      onTcpConnection(socket);

      onData(JSON.stringify({
        'type': 'stop',
        'app': 'abc',
        'branch': 'master'
      }));

      expect(stop_count).to.be(1);
      expect(app).to.be('abc');
      expect(branch).to.be('master');
    });
  });
});
