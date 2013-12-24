
var Cluster = require('../app/cluster');


describe('Cluster', function () {
  it('should start listening for datagrams', function () {
    var count = 0;
    var mock_method = function (type, listener) {
      count += 1;
      expect(type).to.be('message');
      expect(listener).to.be.a('function');
    };

    var datagram_server = { on: mock_method };
    var cluster = new Cluster(datagram_server, null);

    cluster.init();
    expect(count).to.be(1);
  });
});
