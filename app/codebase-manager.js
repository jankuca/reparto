var async = require('async');


var CodebaseManager = function (repository_table) {
  this.repository_table_ = repository_table;

  this.remote_handlers_ = [];
};


CodebaseManager.prototype.addRemoteHandler = function (remote_handler) {
  this.remote_handlers_.push(remote_handler);
};


CodebaseManager.prototype.parseUpdateNotification = function (info) {
  var remote_handlers = this.remote_handlers_;
  for (var i = 0, ii = remote_handlers.length; i < ii; ++i) {
    var remote_handler = remote_handlers[i];
    if (remote_handler.canHandleUpdate(info)) {
      return remote_handler.parseUpdateNotification(info);
    }
  }

  return null;
};


CodebaseManager.prototype.update = function (update_info, callback) {
  var repository = this.repository_table_.getRepositoryByUrl(update_info.url);
  if (!repository) {
    return callback(new Error('No local repository'));
  }

  async.series([
    function (callback) {
      repository.fetch('origin', callback);
    },
    function (callback) {
      repository.clean({ directories: true, force: true }, callback);
    },
    function (callback) {
      repository.reset('origin/master', { hard: true }, callback);
    }
  ], callback);
};


CodebaseManager.prototype.getCurrentVersion = function (app, callback) {
  var repository = this.repository_table_.getRepository(app);
  if (!repository) {
    return callback(null, null);
  }

  repository.getRevisionSha('refs/heads/master', function (err, sha) {
    callback(err, err ? null : sha);
  });
};


CodebaseManager.prototype.createBundleStream = function (app, rev_list) {
  var repository = this.repository_table_.getRepository(app);
  if (!repository) {
    return null;
  }

  return repository.createBundleStream(rev_list);
};


module.exports = CodebaseManager;
