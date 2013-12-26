

var CodebaseManager = function () {
  this.remote_handlers_ = [];
};


CodebaseManager.prototype.addRemoteHandler = function (remote_handler) {
  this.remote_handlers_.push(remote_handler);
};


CodebaseManager.prototype.createUpdater = function (info) {
  var remote_handlers = this.remote_handlers_;
  for (var i = 0, ii = remote_handlers.length; i < ii; ++i) {
    var remote_handler = remote_handlers[i];
    if (remote_handler.canHandleUpdate(info)) {
      return remote_handler.createUpdater(info);
    }
  }

  return null;
};


module.exports = CodebaseManager;
