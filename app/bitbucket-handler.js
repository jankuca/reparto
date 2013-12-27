var util = require('util');

var RemoteHandler = require('./remote-handler');


var BitbucketHandler = function () {
  RemoteHandler.call(this);
};

util.inherits(BitbucketHandler, RemoteHandler);


BitbucketHandler.prototype.canHandleUpdate = function (info) {
  var canon_url = info['canon_url'];
  return /\Sbitbucket.org/.test(canon_url || '');
};


BitbucketHandler.prototype.parseUpdateNotification = function (info) {
  var repo_info = info['repository'];
  var path = repo_info['absolute_url'].replace(/\/$/, '.git');

  var branches = {};
  info['commits'].forEach(function (commit) {
    var branch = commit['branch'];
    branches[branch] = commit['raw_node'];
  });

  return {
    branches: branches,
    url: 'git://bitbucket.org' + path
  };
};


module.exports = BitbucketHandler;
