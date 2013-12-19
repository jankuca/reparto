
var Datagram = require('../lib/datagram');


var Machine = function (datagram_client, tcp_server, app_manager, git) {
  this.datagram_client_ = datagram_client;
  this.tcp_server_ = tcp_server;
  this.app_manager_ = app_manager;
  this.git_ = git;
};


Machine.prototype.init = function () {
  this.tcp_server_.on('connection', this.handleTcpConnection_.bind(this));
  this.notifyServer_();
};


Machine.prototype.notifyServer_ = function () {
  var datagram = new Datagram({
    'type': 'new-machine'
  });
  this.datagram_client_.send(datagram, function (err) {
    console.log(err, 'sent');
  });
};


Machine.prototype.handleTcpConnection_ = function (socket) {
  console.log('connection accepted');
};


module.exports = Machine;
