
var ApplicationManager = require('../app/application-manager');


describe('ApplicationManager', function () {
  var shell = null;
  var shell_command_count = 0;
  var last_shell_command = null;
  var shell_exec_callback;

  beforeEach(function () {
    shell = {
      exec: function (command, options, callback) {
        shell_command_count += 1;
        last_shell_command = command;
        shell_exec_callback(command, options, callback);
      }
    };
    shell_command_count = 0;
    last_shell_command = null;
    shell_exec_callback = function () {};
  });


  it('should start an app via upstart on command', function () {
    var app_manager = new ApplicationManager(shell);

    app_manager.start('abc', 'master');
    expect(shell_command_count).to.be(1);
    expect(last_shell_command).to.be('start "app/abc/master"');
  });


  it('should stop an app via upstart on command', function () {
    var app_manager = new ApplicationManager(shell);

    app_manager.stop('abc', 'master');
    expect(shell_command_count).to.be(1);
    expect(last_shell_command).to.be('stop "app/abc/master"');
  });


  describe('get*Status(es)', function () {
    var statuses = null;
    var status_callback_count = 0;
    var result;

    beforeEach(function () {
      statuses = {};
      status_callback_count = 0;
      result = null;

      shell_exec_callback = function (command, options, callback) {
        var confs = Object.keys(statuses).map(function (job_key) {
          return job_key + '.conf';
        });

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
      };

      onResult = function (err, _result) {
        expect(err).to.be(null);
        status_callback_count += 1;
        result = _result;
      };
    });


    it('should return app status on command using upstart', function () {
      var app_manager = new ApplicationManager(shell);

      statuses['app/abc/master'] = true;
      app_manager.getStatus('abc', 'master', onResult);
      expect(shell_command_count).to.be(1);
      expect(status_callback_count).to.be(1);
      expect(last_shell_command).to.be('status "app/abc/master"');
      expect(result).to.be(true);

      statuses['app/abc/master'] = false;
      app_manager.getStatus('abc', 'master', onResult);
      expect(shell_command_count).to.be(2);
      expect(status_callback_count).to.be(2);
      expect(result).to.be(false);
    });


    it('should return app statuses for each branch on command using upstart',
        function () {
      statuses['app/abc/master'] = false;
      statuses['app/abc/slave'] = true;
      statuses['app/efg/master'] = true;

      var app_manager = new ApplicationManager(shell);

      app_manager.getAllAppStatuses('abc', onResult);
      expect(shell_command_count).to.be(3); // 1 ls + 2 status
      expect(status_callback_count).to.be(1);
      expect(result).to.eql({ 'master': false, 'slave': true });

      app_manager.getAllAppStatuses('efg', onResult);
      expect(shell_command_count).to.be(5); // + 1 ls + 1 status
      expect(status_callback_count).to.be(2);
      expect(result).to.eql({ 'master': true });
    });


    it('should return all app statuses on command using upstart', function () {
      statuses['app/abc/master'] = false;
      statuses['app/abc/slave'] = true;
      statuses['app/efg/master'] = true;

      var app_manager = new ApplicationManager(shell);

      app_manager.getAllStatuses(onResult);
      expect(shell_command_count).to.be(4); // 1 ls + 3 status
      expect(status_callback_count).to.be(1);
      expect(result).to.eql({
        'abc': { 'master': false, 'slave': true },
        'efg': { 'master': true }
      });
    });
  });
});
