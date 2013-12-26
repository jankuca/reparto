var dgram = require('dgram');
var http = require('http');
var os = require('os');


var Cluster = require('./app/cluster');
var DatagramServer = require('./lib/datagram-server');
var Git = require('./lib/git');
var Router = require('./app/router');
var Tcp = require('./lib/tcp');
var WebUi = require('./app/web-ui');


var datagram_socket = dgram.createSocket('udp4');
var datagram_server = new DatagramServer(datagram_socket);
var http_server = http.createServer();
var git = new Git();
var tcp = new Tcp();

var router = new Router(http_server);
var cluster = new Cluster(datagram_server, tcp);
var web_ui = new WebUi(router, cluster, git);


datagram_server.bind(process.env['PORT_DATAGRAM_SERVER'] || 5001);
git.setRepositoryDirectory(process.env['GIT_DIRNAME'] || os.tmpdir());


http_server.listen(process.env['PORT'] || 5000);
web_ui.init();
cluster.init();
router.init();
