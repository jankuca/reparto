

var Cluster = function (datagram_server, tcp) {
  this.datagram_server_ = datagram_server;
  this.tcp_ = tcp;

  this.machine_connections_ = {};
};


Cluster.prototype.init = function () {
  this.datagram_server_.on('message', this.handleMessage_.bind(this));
};


Cluster.prototype.handleMessage_ = function (message, info) {
  console.log(info, message);

  switch (message['type']) {
  case 'new-machine':
    this.addMachine_(info.address);
    break;
  }
};


Cluster.prototype.addMachine_ = function (address) {
  var socket = this.machine_connections_[address];
  if (!socket) {
    this.connectToMachine_(address);
  }
};


Cluster.prototype.connectToMachine_ = function (address) {
  console.log('connect to ' + address);

  var socket = this.tcp_.connect(address);
  this.machine_connections_[address] = socket;
};


module.exports = Cluster;
