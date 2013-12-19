
var Datagram = require('../lib/datagram');


var Machine = function (datagram_client) {
  this.datagram_client_ = datagram_client;
};


Machine.prototype.init = function () {
  var datagram = new Datagram({
    'type': 'new-machine'
  });
  this.datagram_client_.send(datagram, function (err) {
    console.log(err, 'sent');
  });
};


module.exports = Machine;
