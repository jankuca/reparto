var os = require('os');
var path = require('path');

var Repository = require('../app/repository');
var RepositoryTable = require('../app/repository-table');


describe('RepositoryTable', function () {
  var createConfigRepository = function (data) {
    return {
      get: function (collection, key, callback) {
        var collection = data[collection] || {};
        var item = collection[key] || null;
        callback(null, item);
      },
      set: function (collection, key, value, callback) {
        data[collection] = data[collection] || {};
        value['_id'] = key;
        data[collection][key] = value;
        callback(null);
      }
    };
  };


  it('should allow dirname changes', function () {
    var table = new RepositoryTable(null);
    table.setDirectory('/tmp');
  });


  it('should ask for a repository object by name and return it', function () {
    var config = createConfigRepository({
      'apps': { 'abc': { 'remote': 'git://example.com/abc.git' }}
    });

    var table = new RepositoryTable(config);
    var dirname = os.tmpdir();
    table.setDirectory(dirname);

    var repository = table.getRepository('abc');
    expect(repository).to.be.a(Repository);
  });


  it('should ask for a repository object by URL and return it', function () {
    var repo_url = 'git://example.com/abc.git';
    var config = {
      get: function (collection, key, callback) {
        callback(null, { '_id': 'abc', 'remote': repo_url });
      },
      set: function () {}
    };

    var table = new RepositoryTable(config);
    table.setDirectory(os.tmpdir());

    var count = 0;
    table.getRepositoryByUrl(repo_url, function (err, repo) {
      count += 1;
      expect(err).to.be(null);
      expect(repo).to.be.a(Repository);
    });
    expect(count).to.be(1);
  });


  it('should place repositories directly into the specified base directory',
      function () {
    var config = createConfigRepository({
      'apps': { 'abc': { 'remote': 'git://example.com/abc.git' }}
    });

    var table = new RepositoryTable(config);
    var dirname = path.join(os.tmpdir(), 'repos');
    table.setDirectory(dirname);

    var repo = table.getRepository('abc');
    expect(repo).to.be.a(Repository);
    expect(repo.getDirectory()).to.be(path.join(dirname, 'abc'));
  });
});
