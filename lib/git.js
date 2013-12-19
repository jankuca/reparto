

var Git = function () {
  this.repo_base_dirname_ = null;
};


Git.prototype.setRepositoryDirectory = function (repo_base_dirname) {
  this.repo_base_dirname_ = repo_base_dirname;
};


module.exports = Git;
