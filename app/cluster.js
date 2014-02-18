var async = require('async');
var log = require('../lib/log');


var Cluster = function (datagram_server, tcp, config, codebase_manager) {
  this.datagram_server_ = datagram_server;
  this.tcp_ = tcp;
  this.config_ = config;
  this.codebase_manager_ = codebase_manager;

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
    this.handleRoleMessage_(socket, message);
    break;
  case 'versions':
    this.handleVersionMessage_(socket, message);
    break;
  case 'connection-challenge':
    this.handleChallengeMessage_(socket, message);
    break;
  }
};


Cluster.prototype.handleRoleMessage_ = function (socket, message) {
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


Cluster.prototype.handleVersionMessage_ = function (socket, message) {
  var self = this;

  var getCurrentVersion = function (app, done) {
    self.codebase_manager_.getCurrentVersion(app, done);
  };

  var remote_versions = message['apps'] || {};
  var remote_apps = Object.keys(remote_versions);

  async.map(remote_apps, getCurrentVersion, function (err, versions) {
    var instructions = {
      remove: [],
      install: {},
      upgrade: {}
    };

    Object.keys(remote_versions).forEach(function (app, i) {
      var version = versions[i];
      var remote_version = remote_versions[app];

      if (!remote_version) {
        if (version) {
          instructions.install[app] = version;
        }
      } else {
        if (!version) {
          instructions.remove.push(app);
        } else if (remote_version !== version) {
          instructions.upgrade[app] = version;
        }
      }
    });

    self.instructMachineToModifyApps_(socket, instructions);
  });
};


Cluster.prototype.instructMachineToModifyApps_ = function (
    socket, instructions) {
  if (instructions.remove && instructions.remove.length > 0) {
    socket.write(JSON.stringify({
      'type': 'remove',
      'apps': instructions.remove
    }));
  }
  if (instructions.install && Object.keys(instructions.install).length > 0) {
    socket.write(JSON.stringify({
      'type': 'install',
      'apps': instructions.install
    }));
  }
  if (instructions.upgrade && Object.keys(instructions.upgrade).length > 0) {
    socket.write(JSON.stringify({
      'type': 'upgrade',
      'apps': instructions.upgrade
    }));
  }
};


Cluster.prototype.handleChallengeMessage_ = function (socket, message) {
  var machine = socket.address();
  var codebase_manager = this.codebase_manager_;

  var app = message['app'];
  var rev_list = message['bundle'].slice();
  if (!rev_list[0]) {
    rev_list.shift();
  }

  var socket = this.tcp_.connect(machine.port, machine.address);
  socket.once('connect', function () {
    socket.write(JSON.stringify({
      'challenge': message['id'],
      'app': app,
      'bundle': message['bundle']
    }) + '\n');

    var stream = codebase_manager.createBundleStream(app, rev_list.join('..'));
    stream.pipe(socket);
  });
};


module.exports = Cluster;
