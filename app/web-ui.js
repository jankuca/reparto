var log = require('../lib/log');


var WebUi = function (router, cluster, git) {
  this.router_ = router;
  this.cluster_ = cluster;
  this.git_ = git;
};


WebUi.prototype.log = log.create('web-ui');


WebUi.prototype.init = function () {
  this.router_.on('request', this.handleRequest_.bind(this));
  this.router_.on('error', this.handleError_.bind(this));
};


WebUi.prototype.handleRequest_ = function (target, params, req, res) {
  this.log('%s %s -> %s', req.method, req.url, target);
};


WebUi.prototype.handleError_ = function (code, req, res) {
  this.log('%s %s -> %d', req.method, req.url, code);

  res.writeHead(code);
  res.write('Status: ' + code);
  res.end();
};


module.exports = WebUi;
