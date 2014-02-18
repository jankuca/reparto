var log = require('../lib/log');
var uuid = require('node-uuid');

var Datagram = require('../lib/datagram');


var Machine = function (datagram_client, tcp_server, app_manager) {
  this.datagram_client_ = datagram_client;
  this.tcp_server_ = tcp_server;
  this.app_manager_ = app_manager;

  this.environment_ = '_default';
  this.roles_ = [];

  this.in_cluster_ = false;
  this.server_finding_timeout_ = 0;
  this.challenges_ = {};
};


Machine.prototype.log = log.create('machine');


/**
 * @param {string|null} environment
 * @param {Array.<string>|string} roles
 */
Machine.prototype.init = function (environment, roles) {
  if (environment) {
    this.environment_ = environment;
  }
  if (roles) {
    this.roles_ = (typeof roles === 'string') ? [ roles ] : roles.slice();
  }

  this.tcp_server_.on('connection', this.handleServerConnection_.bind(this));
  this.findServer_();
};


Machine.prototype.findServer_ = function () {
  var self = this;

  this.sendNewMachineDatagram_();

  clearTimeout(this.server_finding_timeout_);
  this.server_finding_timeout_ = setTimeout(function () {
    if (!self.in_cluster_ && self.server_finding_timeout_) {
      self.findServer_();
    }
  }, 1000);
};


Machine.prototype.sendNewMachineDatagram_ = function () {
  var self = this;

  var datagram = new Datagram({
    'type': 'new-machine',
    'tcp': this.tcp_server_.address().port
  });
  this.datagram_client_.send(datagram, function (err) {
    if (err) {
      self.log('new-machine datagram failed to be sent (' + err.message + ')');
    } else {
      self.log('new-machine datagram sent');
    }
  });
};


Machine.prototype.handleServerConnection_ = function (socket) {
  var self = this;

  this.log('connection accepted');

  clearTimeout(this.server_finding_timeout_);
  this.in_cluster_ = true;
  this.server_finding_timeout_ = 0;

  socket.on('data', function (json) {
    self.handleServerMessage_(socket, json);
  });
  socket.once('close', function (had_err) {
    self.in_cluster_ = false;
    self.findServer_();
  });

  this.sendRoleMessage_(socket);
};


Machine.prototype.handleServerMessage_ = function (socket, json) {
  var message = JSON.parse(json);

  switch (message['type']) {
  case 'install':
    Object.keys(message['apps']).forEach(function (app) {
      var target_version = message['apps'][app];
      this.challengeServer_(socket, app, target_version);
    }, this);
    break;
  case 'start':
    this.app_manager_.start(message['app'], message['branch']);
    break;
  case 'stop':
    this.app_manager_.stop(message['app'], message['branch']);
    break;
  }
};


Machine.prototype.sendRoleMessage_ = function (socket) {
  var self = this;

  var message = {
    'type': 'role',
    'environment': this.environment_,
    'roles': this.roles_
  };

  socket.write(JSON.stringify(message), 'utf8', function () {
    self.log('role message sent');
  });
};


Machine.prototype.challengeServer_ = function (socket, app, version) {
  var self = this;

  this.app_manager_.getCurrentVersion(app, function (err, local_version) {
    var challenge_id = self.createChallenge_(app, local_version, version);
    var message = {
      'type': 'connection-challenge',
      'id': challenge_id,
      'app': app,
      'bundle': [ local_version, version ]
    };

    socket.write(JSON.stringify(message), 'utf8', function () {
      self.log('role message sent');
    });
  });
};


Machine.prototype.createChallenge_ = function (app, local_version, version) {
  var id = uuid.v4().replace(/-/g, '');

  this.challenges_[id] = {
    app: app,
    local_version: local_version,
    version: version
  };

  return id;
};


module.exports = Machine;
