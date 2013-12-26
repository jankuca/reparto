var log = require('../lib/log');


var WebUi = function (router, cluster, codebase_manager) {
  this.router_ = router;
  this.cluster_ = cluster;
  this.codebase_manager_ = codebase_manager;
};


WebUi.prototype.log = log.create('web-ui');


WebUi.prototype.init = function () {
  this.router_.when('POST', '/api/codebase/update', 'api:codebase:update');

  this.router_.on('request', this.handleRequest_.bind(this));
  this.router_.on('error', this.handleError_.bind(this));
};


WebUi.prototype.handleRequest_ = function (target, params, req, res) {
  this.log('%s %s -> %s', req.method, req.url, target);

  switch (target) {
  case 'api:codebase:update':
    this.handleCodebaseUpdateRequest_(req, res);
    break;
  }
};


WebUi.prototype.handleError_ = function (code, req, res) {
  this.log('%s %s -> %d', req.method, req.url, code);

  res.writeHead(code);
  res.write('Status: ' + code);
  res.end();
};


WebUi.prototype.handleCodebaseUpdateRequest_ = function (req, res) {
  var self = this;

  var json = '';
  req.on('data', function (chunk) {
    json += chunk;
  });

  req.once('end', function () {
    var info;
    try {
      info = JSON.parse(json);
    } catch (err) {
      self.log('Invalid api:codebase:update request');
      res.writeHead(400);
      res.end();
      return;
    }

    var updater = self.codebase_manager_.createUpdater(info);
    if (!updater) {
      self.log('Unknown api:codebase:update request type');
      res.writeHead(415);
      res.end();
      return;
    }

    self.codebase_manager_.update(updater, function (err) {
      res.writeHead(err ? 500 : 200);
      res.end();
    });
  });
};


module.exports = WebUi;
