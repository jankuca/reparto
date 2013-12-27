

var RemoteHandler = function () {
};


RemoteHandler.prototype.canHandleUpdate = function (info) {
  return false;
};


RemoteHandler.prototype.createUpdater = function (info) {
  if (!this.canHandleUpdate(info)) {
    return null;
  }

  throw new Error('No updater objects instatiation logic');
};


module.exports = RemoteHandler;
