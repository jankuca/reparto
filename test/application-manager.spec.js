
var ApplicationManager = require('../app/application-manager');


describe('ApplicationManager', function () {
  it('should start an app via upstart on command', function () {
    var count = 0;
    var _command;

    var shell = {
      exec: function (command, options, callback) {
        count += 1;
        _command = command;
      }
    };
    var app_manager = new ApplicationManager(shell);

    app_manager.start('abc', 'master');
    expect(count).to.be(1);
    expect(_command).to.be('start "app$abc$master"');
  });


  it('should stop an app via upstart on command', function () {
    var count = 0;
    var _command;

    var shell = {
      exec: function (command, options, callback) {
        count += 1;
        _command = command;
      }
    };
    var app_manager = new ApplicationManager(shell);

    app_manager.stop('abc', 'master');
    expect(count).to.be(1);
    expect(_command).to.be('stop "app$abc$master"');
  });


  it('should return app status on command using upstart', function () {
    var exec_count = 0;
    var status_count = 0;
    var _command;
    var _running;

    var running = true;

    var shell = {
      exec: function (command, options, callback) {
        exec_count += 1;
        _command = command;
        callback(0, running ? 'start/running' : 'stop/waiting');
      }
    };
    var app_manager = new ApplicationManager(shell);

    app_manager.getStatus('abc', 'master', function (err, running) {
      status_count += 1;
      _running = running;
    });
    expect(exec_count).to.be(1);
    expect(status_count).to.be(1);
    expect(_command).to.be('status "app$abc$master"');
    expect(_running).to.be(true);

    running = false;
    app_manager.getStatus('abc', 'master', function (err, running) {
      status_count += 1;
      _running = running;
    });
    expect(exec_count).to.be(2);
    expect(status_count).to.be(2);
    expect(_running).to.be(false);
  });


  it('should return app statuses for each branch on command using upstart',
      function () {
    var count = 0;
    var _statuses;

    var onResult = function (err, result) {
      count += 1;
      _statuses = result;
    };

    var statuses = {
      'app$abc$master': false,
      'app$abc$slave': true,
      'app$efg$master': true
    };
    var confs = Object.keys(statuses).map(function (job_key) {
      return job_key + '.conf';
    });

    var shell = {
      exec: function (command, options, callback) {
        var executable = command.split(/\s+/)[0];
        switch (executable) {
        case 'ls':
          callback(0, confs.join('\n') + '\n');
          break;
        case 'status':
          var job_key = command.split(/\s+/)[1].replace(/^"|"$/g, '');
          callback(0, statuses[job_key] ? 'start/running' : 'stop/waiting');
          break;
        }
      }
    };
    var app_manager = new ApplicationManager(shell);

    app_manager.getAllAppStatuses('abc', onResult);
    expect(count).to.be(1);
    expect(_statuses).to.eql({ 'master': false, 'slave': true });

    app_manager.getAllAppStatuses('efg', onResult);
    expect(count).to.be(2);
    expect(_statuses).to.eql({ 'master': true });
  });


  it('should return all app statuses on command using upstart', function () {
    var count = 0;
    var _statuses;

    var statuses = {
      'app$abc$master': false,
      'app$abc$slave': true,
      'app$efg$master': true
    };
    var confs = Object.keys(statuses).map(function (job_key) {
      return job_key + '.conf';
    });

    var shell = {
      exec: function (command, options, callback) {
        var executable = command.split(/\s+/)[0];
        switch (executable) {
        case 'ls':
          callback(0, confs.join('\n') + '\n');
          break;
        case 'status':
          var job_key = command.split(/\s+/)[1].replace(/^"|"$/g, '');
          callback(0, statuses[job_key] ? 'start/running' : 'stop/waiting');
          break;
        }
      }
    };
    var app_manager = new ApplicationManager(shell);

    app_manager.getAllStatuses(function (err, result) {
      count += 1;
      _statuses = result;
    });
    expect(count).to.be(1);
    expect(_statuses).to.eql({
      'abc': { 'master': false, 'slave': true },
      'efg': { 'master': true }
    });
  });
});
