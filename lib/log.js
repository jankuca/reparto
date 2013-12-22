
var log = {};

log.create = function (key) {
  var pad = function (num) {
    var str = String(num);
    while (str.length < 2) {
      str = '0' + str;
    }
    return str;
  };

  return function () {
    var now = new Date();
    var date = [ now.getMonth() + 1, now.getDate() ];
    var time = [ now.getHours(), now.getMinutes(), now.getSeconds() ];
    var ts = date.join('/') + ' ' + time.map(pad).join(':');

    var prefix = '\033[0;36m' + ts + '\033[0m - \033[2;37m' + key + ':\033[0m';

    var args = Array.prototype.slice.call(arguments);
    if (typeof args[0] === 'string') {
      args[0] = prefix + ' ' + args[0];
    } else {
      args.unshift(prefix);
    }

    console.log.apply(null, args);
  };
};


module.exports = log;
