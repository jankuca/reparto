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

  this.log('waiting for machines');
};


Cluster.prototype.handleMessage_ = function (message, info) {
  switch (message['type']) {
  case 'new-machine':
    if (!message['tcp']) {
      this.log('invalid new-machine datagram received, missing TCP port info');
    } else {
      this.log('new-machine datagram received (%s:%s)',
          info.address, message['tcp']);
      this.addMachine_(info.address, message['tcp']);
    }
    break;
  }
};


Cluster.prototype.addMachine_ = function (address, tcp_port) {
  var key = address + ':' + tcp_port;

  var status = this.machine_statuses_[key];
  if (!status) {
    this.log('adding new machine (%s)', key);

    this.machine_statuses_[key] = 'new';
    this.connectToMachine_(address, tcp_port);
  }
};


Cluster.prototype.connectToMachine_ = function (address, port) {
  var self = this;
  var key = address + ':' + port;

  self.log('connecting to %s', key);

  var socket = this.tcp_.connect(address, port);
  this.machine_connections_[key] = socket;
  this.machine_statuses_[key] = 'connecting';

  socket.on('connect', function () {
    self.machine_statuses_[key] = 'up';
    self.log('machine %s is up', key);
  });

  socket.on('close', function (had_err) {
    self.machine_statuses_[key] = 'down';
    self.log('machine %s is down', key);

    if (!had_err) {
      self.connectToMachine_(address, port);
    }
  });

  socket.on('error', function (err) {
    setTimeout(self.connectToMachine_.bind(self, address, port), 1000);
  });
};


module.exports = Cluster;
