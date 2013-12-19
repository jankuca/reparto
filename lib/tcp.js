

var Tcp = function () {
  this.port_ = null;
};


Tcp.prototype.setPort = function (port) {
  this.port_ = port;
};


module.exports = Tcp;
