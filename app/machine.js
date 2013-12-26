var log = require('../lib/log');

var Datagram = require('../lib/datagram');


var Machine = function (datagram_client, tcp_server, app_manager, git) {
  this.datagram_client_ = datagram_client;
  this.tcp_server_ = tcp_server;
  this.app_manager_ = app_manager;
  this.git_ = git;

  this.in_cluster_ = false;
  this.server_finding_timeout_ = 0;
};


Machine.prototype.log = log.create('machine');


Machine.prototype.init = function () {
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

  socket.on('data', this.handleServerMessage_.bind(this));

  socket.on('close', function (had_err) {
    self.in_cluster_ = false;
    self.findServer_();
  });
};


Machine.prototype.handleServerMessage_ = function (json) {
  var message = JSON.parse(json);

  switch (message['type']) {
  case 'start':
    this.app_manager_.start(message['app'], message['branch']);
    break;
  case 'stop':
    this.app_manager_.stop(message['app'], message['branch']);
    break;
  }
};


module.exports = Machine;
