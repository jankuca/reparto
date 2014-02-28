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

  if (this.in_cluster_) {
    // challenge response connection
    this.handleChallengeResponseConnection_(socket);
    return;
  }

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


Machine.prototype.handleChallengeResponseConnection_ = function (socket) {
  var self = this;
  var challenge_header_json = '';

  socket.on('data', function readChallengeResponseHeader(json) {
    challenge_header_json += json;
    if (challenge_header_json.trim().substr(0, 1) !== '{') {
      socket.destroy();
      return;
    }

    if (/\}\n$/.test(challenge_header_json)) {
      socket.removeListener('data', readChallengeResponseHeader);

      var header = null;
      try {
        header = JSON.parse(challenge_header_json);
      } catch (err) {
        socket.destroy();
        return;
      }

      self.handleChallengeResponse_(socket, header);
    }
  });
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


Machine.prototype.handleChallengeResponse_ = function (socket, header) {
  if (!header['challenge']) {
    socket.destroy();
    return;
  }

  var challenge = this.challenges_[header['challenge']];
  if (!challenge || challenge.app !== header['app'] ||
      challenge.local_version !== header['bundle'][0] ||
      challenge.version !== header['bundle'][1]) {
    socket.destroy();
    delete this.challenges_[header['challenge']];
    return;
  }

  var installer = this.app_manager_.createBundleInstaller(challenge.app);
  socket.pipe(installer);
};


module.exports = Machine;
