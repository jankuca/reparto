var dgram = require('dgram');
var http = require('http');
var os = require('os');


var DatagramServer = require('./lib/datagram-server');
var Tcp = require('./lib/tcp');

var BitbucketHandler = require('./app/bitbucket-handler');
var Cluster = require('./app/cluster');
var CodebaseManager = require('./app/codebase-manager');
var ConfigRepository = require('./app/config-repository');
var GithubHandler = require('./app/github-handler');
var RepositoryTable = require('./app/repository-table');
var Router = require('./app/router');
var WebUi = require('./app/web-ui');


var datagram_socket = dgram.createSocket('udp4');
var datagram_server = new DatagramServer(datagram_socket);
var http_server = http.createServer();
var tcp = new Tcp();

var router = new Router(http_server);
var repository_table = new RepositoryTable(config);
var codebase_manager = new CodebaseManager(repository_table);
var config = new ConfigRepository();
var cluster = new Cluster(datagram_server, tcp, config, codebase_manager);
var web_ui = new WebUi(router, cluster, codebase_manager);


datagram_server.bind(process.env['PORT_DATAGRAM_SERVER'] || 5001);
repository_table.setDirectory(process.env['GIT_DIRNAME'] || os.tmpdir());
config.setRepository(repository_table.getRepository('_config'));


var github_handler = new GithubHandler();
codebase_manager.addRemoteHandler(github_handler);
var bitbucket_handler = new BitbucketHandler();
codebase_manager.addRemoteHandler(bitbucket_handler);


http_server.listen(process.env['PORT'] || 5000);
web_ui.init();
cluster.init();
router.init();
