var events = require('events');
var stream = require('stream');

var BundleInstaller = require('../app/bundle-installer');


describe('BundleInstaller', function () {
  var git_input = '';
  var git_stdout = null;
  var git_stderr = null;
  var git_proc = null;
  var repository = null;
  var ended = false;

  beforeEach(function () {
    git_input = '';

    git_proc = new events.EventEmitter();
    git_proc.stdout = new events.EventEmitter();
    git_proc.stderr = new events.EventEmitter();
    git_proc.stdin = {
      write: function (chunk) { git_input += chunk; },
      end: function () { ended = true; }
    };

    repository = {
      unbundleFromStream: function () {
        return git_proc;
      }
    };
  });


  it('should be a writable stream', function () {
    var installer = new BundleInstaller(null);

    expect(installer).to.be.a(stream.Writable);
  });


  it('should pipe bundle contents to the repository', function () {
    var installer = new BundleInstaller(repository);
    installer.write(new Buffer('abc'));

    expect(git_input).to.be('abc');
  });


  it('should close git input on end of bundle', function () {
    var installer = new BundleInstaller(repository);
    installer.write(new Buffer('abc'));
    installer.end();

    expect(ended).to.be(true);
  });


  it('should reset the repository to the bundle HEAD after unbundling',
      function () {
    var reset = false;
    var rev;
    var options;
    repository.reset = function (_rev, _options) {
      reset = true;
      rev = _rev;
      options = _options;
    };

    var installer = new BundleInstaller(repository);
    installer.write(new Buffer('abc'));
    installer.end();

    git_proc.stdout.emit('data', new Buffer('abcdef123456 HEAD'));
    git_proc.emit('exit', 0);

    expect(reset).to.be(true);
    expect(rev).to.be('abcdef123456');
    expect(options.hard).to.be(true);
  });


  it('should support bundles with more than one head', function () {
    var reset = false;
    var rev;
    var options;
    repository.reset = function (_rev, _options) {
      reset = true;
      rev = _rev;
      options = _options;
    };

    var installer = new BundleInstaller(repository);
    installer.write(new Buffer('abc'));
    installer.end();

    git_proc.stdout.emit('data', new Buffer(
        '12345abcde12 nothead\n' +
        'abcdef123456 HEAD\n' +
        '56234abcdefa again-not-head'));
    git_proc.emit('exit', 0);

    expect(reset).to.be(true);
    expect(rev).to.be('abcdef123456');
  });
});
