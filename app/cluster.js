var log = require('../lib/log');


var Cluster = function (datagram_server, tcp) {
  this.datagram_server_ = datagram_server;
  this.tcp_ = tcp;

  this.machine_connections_ = {};
  this.machine_statuses_ = {};
};


Cluster.prototype.log = log.create('cluster');


Cluster.prototype.init = function () {
  this.datagram_server_.on('message', this.handleMessage_.bind(this));
};


Cluster.prototype.handleMessage_ = function (message, info) {
  this.log(info, message);

  switch (message['type']) {
  case 'new-machine':
    this.addMachine_(info.address);
    break;
  }
};


Cluster.prototype.addMachine_ = function (address) {
  var status = this.machine_statuses_[address];
  if (!status) {
    this.machine_statuses_[address] = 'new';
    this.connectToMachine_(address);
  }
};


Cluster.prototype.connectToMachine_ = function (address) {
  var self = this;
  self.log('connect to ' + address);

  var socket = this.tcp_.connect(address);
  this.machine_connections_[address] = socket;
  this.machine_statuses_[address] = 'connecting';

  socket.on('connect', function () {
    self.machine_statuses_[address] = 'up';
    self.log('machines:', self.machine_statuses_);
  });

  socket.on('close', function (had_err) {
    self.machine_statuses_[address] = 'down';
    self.log('machines:', self.machine_statuses_);

    if (!had_err) {
      self.connectToMachine_(address);
    }
  });

  socket.on('error', function (err) {
    setTimeout(self.connectToMachine_.bind(self, address), 1000);
  });
};


module.exports = Cluster;
