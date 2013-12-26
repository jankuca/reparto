
var log = require('../lib/log');
log.silent = true;


global.expect = require('expect.js');


var timeout_queue = [];

global.setTimeout = function (callback, timeout) {
  return timeout_queue.push({
    timeout: timeout,
    callback: callback
  });
};

global.clearTimeout = function (id) {
  if (!id) return;
  timeout_queue[id - 1] = null;
};

global.setTimeout.clear = function () {
  timeout_queue.forEach(function (item, index) {
    timeout_queue[index] = null;
  });
};

global.setTimeout.flush = function (ms) {
  timeout_queue.forEach(function (item, index) {
    if (!item) return;
    if (typeof ms !== 'number' || item.timeout <= ms) {
      timeout_queue[index] = null;
      item.callback.call(null);
    } else if (typeof ms === 'number') {
      item.timeout -= ms;
    }
  });
};
