var events = require('events');
var util = require('util');


var Router = function (http_server) {
  events.EventEmitter.call(this);

  this.http_server_ = http_server;

  this.routes_ = [];
};

util.inherits(Router, events.EventEmitter);


Router.prototype.when = function (method, pattern, target) {
  var rx_source = pattern;
  var param_keys = [];

  rx_source = rx_source.replace(/:([a-z][a-z0-9_]*)/g, function (match, key) {
    param_keys.push(key);
    return '([^/]+)';
  });

  this.routes_.push({
    method: method,
    pattern: pattern,
    rx: new RegExp('^' + rx_source + '$'),
    param_keys: param_keys,
    target: target
  });
};


Router.prototype.addRoutes = function (routes) {
  Object.keys(routes).forEach(function (rule) {
    var parts = rule.split(' ');
    this.when(parts[0], parts.slice(1).join(' '), routes[rule]);
  }, this);
};


Router.prototype.init = function () {
  this.http_server_.on('request', this.handleRequest_.bind(this));
};


Router.prototype.handleRequest_ = function (req, res) {
  var url = req.url;
  var routes = this.routes_;

  for (var i = 0, ii = routes.length; i < ii; ++i) {
    var route = routes[i];
    var match = url.match(route.rx);
    if (match) {
      var params = {};
      route.param_keys.forEach(function (key, i) {
        params[key] = match[i + 1];
      });

      this.emitRequest_(route.target, params, req, res);
      return;
    }
  }

  this.emitError_(404, req, res);
};


Router.prototype.emitRequest_ = function (target, params, req, res) {
  this.emit('request', target, params, req, res);
};


Router.prototype.emitError_ = function (code, req, res) {
  this.emit('error', code, req, res);
};


module.exports = Router;
