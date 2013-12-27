var util = require('util');

var RemoteHandler = require('./remote-handler');


var GithubHandler = function () {
  RemoteHandler.call(this);
};

util.inherits(GithubHandler, RemoteHandler);


GithubHandler.prototype.canHandleUpdate = function (info) {
  var repository_link = info['repository']['url'];
  return /\Sgithub.com/.test(repository_link || '');
};


GithubHandler.prototype.parseUpdateNotification = function (info) {
  var ref_match = info['ref'].match(/^refs\/heads\/(.*)$/);
  if (!ref_match) {
    return null;
  }

  var branches = {};
  var last_commit = info['commits'].slice(-1)[0];
  branches[ref_match[1]] = last_commit['id'];

  return {
    branches: branches,
    url: info['repository']['url'].replace(/^https:\/\//, 'git://') + '.git'
  };
};


module.exports = GithubHandler;
