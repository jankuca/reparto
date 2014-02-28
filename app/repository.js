
var Repository = function (dirname) {
  this.dirname_ = dirname;
};


Repository.prototype.getDirectory = function () {
  return this.dirname_;
};


Repository.prototype.fetch = function (remote, callback) {
  this.exec('fetch', String(remote), callback);
};


Repository.prototype.clean = function (options, callback) {
  var command_options = {
    'd': Boolean(options.directories),
    'f': (options.force !== false)
  };

  this.exec('clean', command_options, callback);
};


Repository.prototype.reset = function (rev, options, callback) {
  this.exec('reset', String(rev), options, callback);
};


Repository.prototype.readBlob = function (filename, rev, callback) {
  if (arguments.length === 2) {
    callback = arguments[1];
    rev = 'HEAD';
  }

  this.exec('show', rev + ':' + filename, callback);
};


Repository.prototype.listDirectory = function (dirname, rev, callback) {
  if (arguments.length === 2) {
    callback = arguments[1];
    rev = 'HEAD';
  }

  this.exec('ls-tree', rev + ':' + dirname, function (err, contents, message) {
    if (err) {
      return callback(err, '', message);
    }

    var items = contents.trim().split('\n');
    items = items.map(function (item) {
      return item.split('\t').slice(-1)[0];
    });
    items = items.map(function (basename) {
      return path.join('/', dirname, basename);
    });

    callback(null, items);
  });
};


Repository.prototype.getRevisionSha = function (rev, callback) {
  this.exec('parse-rev', rev, callback);
};


Repository.prototype.createBundleStream = function (rev_list) {
  var args = [ 'bundle', 'create', '-', rev_list ];
  var proc = child_process.spawn('git', args);
  return proc.stdout;
};


Repository.prototype.unbundleFromStream = function (bundle_stream, callback) {
  var args = [ 'bundle', 'unbundle', '/dev/stdin' ];
  var proc = child_process.spawn('git', args);

  if (bundle_stream) {
    bundle_stream.pipe(proc.stdin);
  }

  if (callback) {
    var result = '';
    var err_message = '';
    proc.stdout.on('data', function (chunk) {
      result += String(chunk);
    });
    proc.stderr.on('data', function (chunk) {
      err_message += String(chunk);
    });
    proc.once('exit', function (code) {
      var err = null;
      if (code !== 0) {
        err = new Error('Command failed: ' + err_message);
      }
      callback(err, result, err_message);
    });
  }

  return proc;
};


Repository.prototype.exec = function (var_args, callback) {
  var args = Array.prototype.slice.call(arguments, 0, arguments.length - 1);
  args = this.createArgs_.apply(this, args);
  callback = arguments[arguments.length - 1];

  var options = {
    cwd: this.dirname_
  };

  child_process.execFile('git', args, options, callback);
};


Repository.prototype.createArgs_ = function (var_args) {
  var args = [];

  Array.prototype.forEach.call(arguments, function (options) {
    if (typeof options === 'object') {
      Object.keys(options).forEach(function (option) {
        var value = options[option];
        if (value !== false) {
          args.push(option.length === 1 ? '-' + option : '--' + option);
          if (value !== null && typeof value !== true) {
            args.push(String(value));
          }
        }
      });
    } else {
      args.push(String(options));
    }
  });

  return args;
};


module.exports = Repository;
