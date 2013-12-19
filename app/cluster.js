

var Cluster = function (datagram_server) {
  this.datagram_server_ = datagram_server;
};


Cluster.prototype.init = function () {
  this.datagram_server_.on('message', this.handleMessage_.bind(this));
};


Cluster.prototype.handleMessage_ = function (message, info) {
  console.log(info, message);
};


module.exports = Cluster;
