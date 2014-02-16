var async = require('async');


var ApplicationManager = function (shell) {
  this.shell_ = shell;
};


ApplicationManager.prototype.start = function (app, branch, callback) {
  var job_key = 'app/' + app + '/' + branch;
  var command = 'start "' + job_key + '"';

  this.shell_.exec(command, { async: true }, function (code, output) {
    if (code !== 0) {
      callback(new Error('Failed to start the app: ' + output));
    } else {
      callback(null);
    }
  });
};


ApplicationManager.prototype.stop = function (app, branch, callback) {
  var job_key = 'app/' + app + '/' + branch;
  var command = 'stop "' + job_key + '"';

  this.shell_.exec(command, { async: true }, function (code, output) {
    if (code !== 0) {
      callback(new Error('Failed to stop the app: ' + output));
    } else {
      callback(null);
    }
  });
};


ApplicationManager.prototype.getStatus = function (app, branch, callback) {
  var job_key = 'app/' + app + '/' + branch;
  var command = 'status "' + job_key + '"';

  this.shell_.exec(command, { async: true }, function (code, output) {
    if (code !== 0) {
      callback(new Error('Failed to stop the app: ' + output), null);
    } else {
      var full_status = output.split(',')[0].split('/');
      var goal = full_status[0];
      var state = full_status[1];

      var running = Boolean(goal === 'start' && state === 'running');
      callback(null, running);
    }
  });
};


ApplicationManager.prototype.getAllAppStatuses = function (app, callback) {
  var self = this;
  var command = 'ls /etc/init | grep ".conf"';

  this.shell_.exec(command, { async: true }, function (code, output) {
    if (code !== 0) {
      callback(new Error('Failed to stop the app: ' + output), null);
    } else {
      var list = output.trim().split('\n');
      list = list.filter(function (basename) {
        var filter = new RegExp('^app/' + app + '/');
        return filter.test(basename);
      });

      var branches = list.map(function (basename) {
        var branch = basename;
        branch = branch.substr(4 + app.length + 1); // strip "app/APPNAME/"
        branch = branch.substr(0, branch.length - 5); // strip ".conf"
        return branch;
      });

      var getBranchStatus = function (branch, callback) {
        self.getStatus(app, branch, callback);
      };

      async.map(branches, getBranchStatus, function (err, statuses) {
        if (err) {
          callback(err, null);
        } else {
          var result = {};
          branches.forEach(function (branch, i) {
            result[branch] = statuses[i];
          });
          callback(null, result);
        }
      });
    }
  });
};


ApplicationManager.prototype.getAllStatuses = function (callback) {
  var self = this;
  var command = 'ls /etc/init | grep ".conf"';

  this.shell_.exec(command, { async: true }, function (code, output) {
    if (code !== 0) {
      callback(new Error('Failed to stop the app: ' + output), null);
    } else {
      var list = output.trim().split('\n');
      list = list.filter(function (basename) {
        return /^app\//.test(basename);
      });

      var jobs = list.map(function (basename) {
        var job_key = basename;
        job_key = job_key.substr(4); // strip "app/"
        job_key = job_key.substr(0, job_key.length - 5); // strip ".conf"
        return job_key.split('/');
      });

      var getStatus = function (job, callback) {
        self.getStatus(job[0], job[1], callback);
      };

      async.map(jobs, getStatus, function (err, statuses) {
        if (err) {
          callback(err, null);
        } else {
          var result = {};
          jobs.forEach(function (job, i) {
            result[job[0]] = result[job[0]] || {};
            result[job[0]][job[1]] = statuses[i];
          });
          callback(null, result);
        }
      });
    }
  });
};


module.exports = ApplicationManager;
