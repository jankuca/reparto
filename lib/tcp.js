var net = require('net');


var Tcp = function () {
  this.port_ = 0;
};


Tcp.prototype.setPort = function (port) {
  this.port_ = port;
};


Tcp.prototype.connect = function (address, port) {
  var socket = net.connect(port || this.port_, address);
  return socket;
};


module.exports = Tcp;
