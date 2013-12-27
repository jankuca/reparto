var crypto = require('crypto');
var path = require('path');


var RepositoryTable = function (git) {
  this.git_ = git;

  this.dirname_ = null;
};


RepositoryTable.prototype.setDirectory = function (dirname) {
  this.dirname_ = dirname;
};


RepositoryTable.prototype.getRepository = function (repo_url) {
  var repo_hash = crypto.createHash('md5');
  repo_hash.update(repo_url);

  var repo_slug = repo_url.split('/').slice(-1)[0].split('.')[0];
  var basename = repo_hash.digest('hex') + '-' + repo_slug;
  var repo_dirname = path.join(this.dirname_, basename);

  var repository = this.git_.createRepository(repo_dirname);
  return repository;
};


module.exports = RepositoryTable;
