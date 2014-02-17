var git = require('nodegit');


var ConfigRepository = function (repo) {
  this.repo_ = repo;
};


ConfigRepository.prototype.get = function (collection, selector, callback) {
  this.getJsonCollection_(collection, function (err, jsons, commit) {
    if (err) {
      return callback(err);
    }

    if (typeof selector === 'object') {
      Object.keys(jsons).some(function (key) {
        var item = JSON.parse(jsons[key]);
        var matches = Object.keys(selector).every(function (key) {
          return (item[key] === selector[key]);
        });
        if (matches) {
          callback(null, item);
          return true;
        }
      });
    } else {
      var json = jsons[selector] || 'null';
      callback(null, JSON.parse(json));
    }
  });
};


ConfigRepository.prototype.set = function (collection, key, value, callback) {
  var self = this;

  this.getJsonCollection_(collection, function (err, jsons, commit) {
    if (err) {
      return callback(err);
    }

    var item = JSON.parse(jsons[key] || '{}');
    if (typeof item !== 'object' || item === null) {
      item = { 'value': item };
    }

    self.mergeObjects_(item, value);
    item['_id'] = key;

    jsons[key] = JSON.stringify(item);
    self.saveJsonCollection_(collection, jsons, commit,
        function (err, new_commit_id) {
      callback(err || null);
    });
  });
};


ConfigRepository.prototype.mergeObjects_ = function (item, value) {
  if (typeof value === 'object') {
    Object.keys(value).forEach(function (col) {
      item[col] = value[col];
    });
  } else {
    item['value'] = value;
  }
};


ConfigRepository.prototype.getCollectionFilename_ = function (collection) {
  return 'config/' + collection;
};


ConfigRepository.prototype.getJsonCollection_ = function (
    collection, callback) {
  var filename = this.getCollectionFilename_(collection);
  this.readFile_(filename, function (err, blob, commit) {
    if (err) {
      return callback(err, null, commit);
    }
    if (!blob) {
      return callback(err, {}, commit);
    }

    var data = {};
    var contents = blob.content().toString().replace(/\n$/, '');
    contents.split('\n').forEach(function (line) {
      line.replace(/^(\S+)\s/, function (match, id) {
        data[id] = line.substr(match.length);
      });
    });

    callback(null, data, commit);
  });
};


ConfigRepository.prototype.saveJsonCollection_ = function (
    collection, jsons, commit, callback) {
  var repo = this.repo_;
  var filename = this.getCollectionFilename_(collection);
  var lines = Object.keys(jsons).map(function (key) {
    return key + ' ' + jsons[key];
  });

  commit.getTree(function (err, tree) {
    var builder = tree.builder();
    var buffer = new Buffer(lines.join('\n') + '\n');

    builder.insertBlob(filename, buffer);
    builder.write(function (err, new_tree_id) {
      var author = git.Signature.create(
        'ConfigRepository',
        'config@example.com',
        Math.round(Date.now() / 1000),
        1
      );
      var message = 'save ' + filename;

      repo.createCommit(
          null, author, author, message, new_tree_id, [ commit ], callback);
    });
  });
};


ConfigRepository.prototype.readFile_ = function (path, callback) {
  this.repo_.getMaster(function (err, commit) {
    if (err) {
      return callback(err, null, commit || null);
    }

    commit.getEntry(path, function (err, file) {
      if (err || !file) {
        return callback(err || null, null, commit);
      }

      file.getBlob(function (err, blob) {
        callback(err, blob || null, commit);
      });
    });
  });
};


module.exports = ConfigRepository;
