var os = require('os');
var path = require('path');

var RepositoryTable = require('../app/repository-table');


describe('RepositoryTable', function () {
  it('should allow dirname changes', function () {
    var table = new RepositoryTable(null);
    table.setDirectory('/tmp');
  });


  it('should ask for a repository object and return it', function () {
    var repo_dirname;
    var repository = {};
    var git = {
      createRepository: function (_repo_dirname) {
        repo_dirname = _repo_dirname;
        return repository;
      }
    };

    var table = new RepositoryTable(git);
    table.setDirectory('/tmp');

    var _repo = table.getRepository('git://github.com/jankuca/reparto.git');
    expect(repo_dirname).to.be.a('string');
    expect(_repo).to.be(repository);
  });


  it('should place repositories directly into the specified base directory',
      function () {
    var dirname = path.join(os.tmpdir(), 'repos');
    var repo_dirname;
    var git = {
      createRepository: function (_repo_dirname) {
        repo_dirname = _repo_dirname;
        return {};
      }
    };

    var table = new RepositoryTable(git);
    table.setDirectory(dirname);

    table.getRepository('git://github.com/jankuca/reparto.git');
    var basename = path.basename(repo_dirname);
    var rel = path.relative(dirname, repo_dirname);
    expect(rel.substr('..')).to.not.be('..');
    expect(path.join(dirname, basename)).to.be(repo_dirname);
  });
});
