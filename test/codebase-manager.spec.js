
var CodebaseManager = require('../app/codebase-manager');


describe('CodebaseManager', function () {
  it('should allow custom remote server handler registration', function () {
    var codebase_manager = new CodebaseManager();

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

    var codebase_manager = new CodebaseManager();
    codebase_manager.addRemoteHandler({ canHandleUpdate: cannotHandleUpdate });
    codebase_manager.addRemoteHandler({ canHandleUpdate: cannotHandleUpdate });
    codebase_manager.addRemoteHandler({ canHandleUpdate: cannotHandleUpdate });

    info = {};
    codebase_manager.createUpdater(info);
    expect(count).to.be(3);
  });


  it('should stop the server handler loop when one can handle the update',
      function () {
    var count = 0;
    var updater;
    var updater_count = 0;
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
      createUpdater: function (_info) {
        expect(_info).to.be(info);
        updater_count += 1;
        return updater;
      }
    };

    var codebase_manager = new CodebaseManager();
    codebase_manager.addRemoteHandler({ canHandleUpdate: cannotHandleUpdate });
    codebase_manager.addRemoteHandler(remote_handler);
    codebase_manager.addRemoteHandler({ canHandleUpdate: cannotHandleUpdate });

    info = {};
    var _updater = codebase_manager.createUpdater(info);
    expect(_updater).to.be(updater);
    expect(count).to.be(2);
  });
});
