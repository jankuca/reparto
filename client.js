var dgram = require('dgram');
var net = require('net');
var os = require('os');
var shell = require('shelljs');

var ApplicationManager = require('./app/application-manager');
var DatagramClient = require('./lib/datagram-client');
var Machine = require('./app/machine');
var RepositoryTable = require('./app/repository-table');


var datagram_socket = dgram.createSocket('udp4');
var datagram_client = new DatagramClient(datagram_socket);
var tcp_server = net.createServer();
var repository_table = new RepositoryTable();

var app_manager = new ApplicationManager(shell, repository_table);
var machine = new Machine(datagram_client, tcp_server, app_manager);


datagram_client.setServerPort(process.env['PORT_DATAGRAM_SERVER'] || 5001);
datagram_client.bind(
    process.env['PORT_DATAGRAM_CLIENT'] || 5002,
    process.env['DATAGRAM_ADDRESS'] || '230.1.2.3');
repository_table.setDirectory(process.env['GIT_DIRNAME'] || os.tmpdir());


tcp_server.listen(process.env['PORT_TCP'] || 5003);

var roles = process.env['ROLES'] ? process.env['ROLES'].split(',') : [];
machine.init(process.env['ENVIRONMENT'] || '_default', roles);
