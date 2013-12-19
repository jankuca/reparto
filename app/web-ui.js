

var WebUi = function (router, cluster, git) {
  this.router_ = router;
  this.cluster_ = cluster;
  this.git_ = git;
};


WebUi.prototype.init = function () {
  this.router_.on('request', this.handleRequest_.bind(this));
  this.router_.on('error', this.handleError_.bind(this));

  this.router_.init();
};


WebUi.prototype.handleRequest_ = function (target, params, req, res) {
  console.log(target, params);
};


WebUi.prototype.handleError_ = function (code, req, res) {
  res.writeHead(code);
  res.write('Status: ' + code);
  res.end();
};


module.exports = WebUi;
