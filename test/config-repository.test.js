var async = require('async');

var ConfigRepository = require('../app/config-repository');


describe('ConfigRepository', function () {
  it('should retrieve a row from a collection', function () {
    var count = 0;
    var repo = new MockRepository();
    repo.addFile('config/abc',
        'a {"_id":"a","value":"x"}\n' +
        'b {"_id":"b","value":"y"}\n' +
        'c {"_id":"c","value":"z"}\n');

    var config = new ConfigRepository(repo);
    async.series([
      function (done) {
        config.get('abc', 'a', function (err, item) {
          count += 1;
          expect(err).to.not.be.ok();
          expect(item).to.eql({ '_id': 'a', 'value': 'x' });
          done(null);
        });
      },
      function (done) {
        config.get('abc', 'b', function (err, item) {
          count += 1;
          expect(err).to.not.be.ok();
          expect(item).to.eql({ '_id': 'b', 'value': 'y' });
          done(null);
        });
      },
      function (done) {
        config.get('abc', 'c', function (err, item) {
          count += 1;
          expect(err).to.not.be.ok();
          expect(item).to.eql({ '_id': 'c', 'value': 'z' });
          done(null);
        });
      }
    ]);

    expect(count).to.be(3);
  });


  it('should store a row in a collection', function () {
    var count = 0;
    var repo = new MockRepository();
    repo.addFile('config/abc',
        'a {"_id":"a","value":"x"}\n' +
        'b {"_id":"b","value":"y"}\n');

    var config = new ConfigRepository(repo);
    config.set('abc', 'c', { 'value': 'z' }, function (err) {
      count += 1;
      expect(err).to.not.be.ok();

      config.get('abc', 'c', function (err, item) {
        count += 1;
        expect(err).to.not.be.ok();
        expect(item).to.eql({ '_id': 'c', 'value': 'z' });
      });
    });

    expect(count).to.be(2);
  });


  it('should create a collection in it does not exist', function () {
    var count = 0;
    var repo = new MockRepository();

    var config = new ConfigRepository(repo);
    config.set('abc', 'c', { 'value': 'z' }, function (err) {
      count += 1;
      expect(err).to.not.be.ok();

      config.get('abc', 'c', function (err, item) {
        count += 1;
        expect(err).to.not.be.ok();
        expect(item).to.eql({ '_id': 'c', 'value': 'z' });
      });
    });

    expect(count).to.be(2);
  });
});


var MockRepository = function () {
  this.files = [];
  this.commits = [];

  this.createCommit(
    null,
    'Author <author@example.com>',
    'Committer <committer@example.com>',
    'commit message',
    'abcd1234',
    [ '1234abcd' ]
  );
};

MockRepository.prototype.addFile = function (path, content) {
  this.files[path] = new MockFile(content, this);
};

MockRepository.prototype.getMaster = function (callback) {
  callback(null, this.commits[this.commits.length - 1] || null);
};

MockRepository.prototype.createCommit = function (
    arg, author, committer, message, tree_id, parents, callback) {
  var commit = new MockCommit({
    author: author,
    committer: committer,
    message: message,
    tree_id: tree_id,
    parents: (parents || []).slice()
  }, this);

  this.commits.push(commit);

  if (callback) {
    callback(null, commit.id);
  }
};


var MockCommit = function (data, repo) {
  this.repo = repo;

  this.id = 'abc' + Math.round(999 * Math.random()) + '01';
  this.data = data;
};

MockCommit.prototype.getEntry = function (path, callback) {
  callback(null, this.repo.files[path] || null);
};

MockCommit.prototype.getTree = function (callback) {
  callback(null, new MockTree(this.repo));
};


var MockFile = function (content, repo) {
  this.repo = repo;

  this.content_ = content;
};

MockFile.prototype.getBlob = function (callback) {
  callback(null, new MockBlob(this.content_));
};


var MockBlob = function (content) {
  this.content_ = content;
};

MockBlob.prototype.content = function (callback) {
  return new Buffer(this.content_);
};


var MockTree = function (repo) {
  this.repo = repo;
  this.id = Math.round(99999999 * Math.random());
};

MockTree.prototype.builder = function () {
  return new MockTreeBuilder(this.repo);
};


var MockTreeBuilder = function (repo) {
  this.repo = repo;
  this.files = {};
};

MockTreeBuilder.prototype.insertBlob = function (path, buffer) {
  this.files[path] = new MockFile(buffer);
};

MockTreeBuilder.prototype.write = function (callback) {
  var repo = this.repo;
  Object.keys(this.files).forEach(function (key) {
    repo.files[key] = this.files[key];
  }, this);

  var tree = new MockTree(repo);
  callback(null, tree.id);
};
