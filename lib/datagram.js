

var Datagram = function (data) {
  this.data = data;
};


Datagram.prototype.toBuffer = function () {
  var json = JSON.stringify(this.data);
  var buffer = new Buffer(json);

  return buffer;
};


module.exports = Datagram;
