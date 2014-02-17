
var CodebaseManager = require('../app/codebase-manager');


describe('CodebaseManager', function () {
  it('should allow custom remote server handler registration', function () {
    var codebase_manager = new CodebaseManager(null);

    var remote_handler = {};
    codebase_manager.addRemoteHandler(remote_handler);
  });


  it('should loop through registered remote server handlers on update',
      function () {
    var count = 0;
    var info;

    var cannotHandleUpdate = function (_info) {
      expect(_info).to.be(info);
      count += 1;
      return false;
    };

    var codebase_manager = new CodebaseManager(null);
    codebase_manager.addRemoteHandler({ canHandleUpdate: cannotHandleUpdate });
    codebase_manager.addRemoteHandler({ canHandleUpdate: cannotHandleUpdate });
    codebase_manager.addRemoteHandler({ canHandleUpdate: cannotHandleUpdate });

    info = {};
    codebase_manager.parseUpdateNotification(info);
    expect(count).to.be(3);
  });


  it('should stop the server handler loop when one can handle the update',
      function () {
    var count = 0;
    var update_info = {};
    var parse_count = 0;
    var info;

    var canHandleUpdate = function (_info) {
      expect(_info).to.be(info);
      count += 1;
      return true;
    };
    var cannotHandleUpdate = function (_info) {
      expect(_info).to.be(info);
      count += 1;
      return false;
    };

    var remote_handler = {
      canHandleUpdate: canHandleUpdate,
      parseUpdateNotification: function (_info) {
        expect(_info).to.be(info);
        parse_count += 1;
        return update_info;
      }
    };

    var codebase_manager = new CodebaseManager(null);
    codebase_manager.addRemoteHandler({ canHandleUpdate: cannotHandleUpdate });
    codebase_manager.addRemoteHandler(remote_handler);
    codebase_manager.addRemoteHandler({ canHandleUpdate: cannotHandleUpdate });

    info = {};
    var parsed = codebase_manager.parseUpdateNotification(info);
    expect(parsed).to.be(update_info);
    expect(parse_count).to.be(1);
    expect(count).to.be(2);
  });


  it('should update the local codebase', function () {
    var repository_count = 0;
    var result_count = 0;
    var git_log = [];

    var repository = {
      fetch: function (remote, callback) {
        expect(remote).to.be('origin');
        git_log.push('fetch');
        callback(null);
      },
      clean: function (options, callback) {
        expect(options.directories).to.be(true);
        expect(options.force).to.be(true);
        git_log.push('clean');
        callback(null);
      },
      reset: function (target, options, callback) {
        expect(target).to.be('origin/master');
        expect(options.hard).to.be(true);
        git_log.push('reset');
        callback(null);
      }
    };

    var repository_table = {
      getRepositoryByUrl: function (url) {
        expect(url).to.be(update_info.url);
        repository_count += 1;
        return repository;
      }
    };
    var codebase_manager = new CodebaseManager(repository_table);

    var update_info = {
      branches: { 'master': 'aaa' },
      url: 'git://bitbucket.org/jankuca/reparto.git'
    };
    codebase_manager.update(update_info, function (err) {
      expect(err).to.be(null);
      result_count += 1;
    });

    expect(repository_count).to.be(1);
    expect(result_count).to.be(1);
    expect(git_log).to.eql([ 'fetch', 'clean', 'reset' ]);
  });
});
