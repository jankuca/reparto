var async = require('async');
var log = require('../lib/log');


var Cluster = function (datagram_server, tcp, config) {
  this.datagram_server_ = datagram_server;
  this.tcp_ = tcp;
  this.config_ = config;

  this.machine_connections_ = {};
  this.machine_statuses_ = {};
};


Cluster.prototype.log = log.create('cluster');


Cluster.prototype.init = function () {
  this.datagram_server_.on('message', this.handleMessage_.bind(this));

  this.log('waiting for machines');
};


Cluster.prototype.handleMessage_ = function (datagram, info) {
  var message = datagram.data;

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

  socket.on('message', function (json) {
    var message = JSON.parse(json);
    self.handleTcpMessage_(socket, message);
  });

  socket.on('error', function (err) {
    setTimeout(self.connectToMachine_.bind(self, address, port), 1000);
  });
};


Cluster.prototype.handleTcpMessage_ = function (socket, message) {
  var self = this;

  switch (message['type']) {
  case 'role':
    var listRoleApps = this.listRoleApps_.bind(this);
    async.map(message['roles'], listRoleApps, function (err, app_lists) {
      var apps = [];
      Object.keys(app_lists).forEach(function (app) {
        apps = apps.concat(app_lists[app]);
      });

      socket.write(JSON.stringify({
        'type': 'apps',
        'apps': apps
      }));
    });
    break;
  }
};


Cluster.prototype.listRoleApps_ = function (role_id, done) {
  this.config_.get('roles', role_id, function (err, role) {
    if (err) {
      self.log('failed to list apps for role (%s)', role_id);
      return done(err, []);
    }
    done(null, role ? role['apps'] || [] : []);
  });
};


module.exports = Cluster;
