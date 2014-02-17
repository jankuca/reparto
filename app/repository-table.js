var path = require('path');

var Repository = require('./repository');


var RepositoryTable = function (config) {
  this.config_ = config;

  this.dirname_ = null;
};


RepositoryTable.prototype.setDirectory = function (dirname) {
  this.dirname_ = dirname;
};


RepositoryTable.prototype.getRepository = function (repo_id) {
  var repo_dirname = path.join(this.dirname_, repo_id);
  var repository = new Repository(repo_dirname);

  return repository;
};


RepositoryTable.prototype.getRepositoryByUrl = function (repo_url, callback) {
  var self = this;

  this.config_.get('apps', { 'remote': repo_url }, function (err, app) {
    if (err || !app) {
      return callback(err || null, null);
    }

    var repository = self.getRepository(app['_id']);
    callback(null, repository);
  });
};


module.exports = RepositoryTable;
