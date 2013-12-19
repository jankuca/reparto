var dgram = require('dgram');
var net = require('net');
var os = require('os');

var ApplicationManager = require('./app/application-manager');
var DatagramClient = require('./lib/datagram-client');
var Git = require('./lib/git');
var Machine = require('./app/machine');


var datagram_socket = dgram.createSocket('udp4');
var datagram_client = new DatagramClient(datagram_socket);
var git = new Git();
var tcp_server = net.createServer();

var app_manager = new ApplicationManager();
var machine = new Machine(datagram_client, app_manager, git);


datagram_client.setServerPort(process.env['PORT_DATAGRAM_SERVER'] || 5001);
datagram_client.bind(
    process.env['PORT_DATAGRAM_CLIENT'] || 5002,
    process.env['DATAGRAM_ADDRESS'] || '230.1.2.3');
git.setRepositoryDirectory(process.env['GIT_DIRNAME'] || os.tmpdir());


tcp_server.listen(process.env['PORT_TCP'] || 5003);
machine.init();
