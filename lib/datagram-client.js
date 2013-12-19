

var DatagramClient = function (socket) {
  this.socket_ = socket;

  this.port_ = 0;
  this.server_port_ = 0;
  this.multicast_address_ = '';
};


DatagramClient.prototype.bind = function (port, multicast_address) {
  this.port_ = port;
  this.multicast_address_ = multicast_address;

  var socket = this.socket_;
  socket.bind(port, function () {
    socket.setMulticastTTL(5);
  });
};


DatagramClient.prototype.setServerPort = function (server_port) {
  this.server_port_ = server_port;
};


DatagramClient.prototype.send = function (datagram, callback) {
  var buffer = datagram.toBuffer();
  var port = this.server_port_;
  var address = this.multicast_address_;

  this.socket_.send(buffer, 0, buffer.length, port, address, callback);
};


module.exports = DatagramClient;
