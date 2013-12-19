var events = require('events');
var util = require('util');


var DatagramServer = function (socket) {
  events.EventEmitter.call(this);

  this.socket_ = socket;

  this.port_ = 0;
  this.multicast_address_ = '';
};

util.inherits(DatagramServer, events.EventEmitter);


DatagramServer.prototype.bind = function (port, multicast_address) {
  this.port_ = port;

  var socket = this.socket_;
  socket.bind(port, function () {
    socket.addMembership(process.env['DATAGRAM_ADDRESS'] || '230.1.2.3');
  });

  this.socket_.on('message', this.handleMessage_.bind(this));
};


DatagramServer.prototype.handleMessage_ = function (message, info) {
  var data = JSON.parse(message);

  this.emit('message', data, info);
};


module.exports = DatagramServer;
