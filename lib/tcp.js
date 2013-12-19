var net = require('net');


var Tcp = function () {
  this.port_ = null;
};


Tcp.prototype.setPort = function (port) {
  this.port_ = port;
};


Tcp.prototype.connect = function (address) {
  var socket = net.connect(this.port_, address);
  return socket;
};


module.exports = Tcp;
