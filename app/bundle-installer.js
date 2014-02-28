var events = require('events');
var stream = require('stream');
var util = require('util');


var BundleInstaller = function (repository) {
  stream.Writable.call(this);

  this.repository_ = repository;

  this.unbundler_ = null;
  this.unbundle_result_ = '';
};

util.inherits(BundleInstaller, stream.Writable);


BundleInstaller.prototype.write = function (chunk) {
  if (!this.unbundler_) {
    this.unbundler_ = this.repository_.unbundleFromStream();
    this.unbundler_.stdout.on('data', this.handleUnbundleOutput_.bind(this));
    this.unbundler_.stderr.once('data', this.handleUnbundleError_.bind(this));
    this.unbundler_.once('exit', this.handleResult_.bind(this));
  }

  this.unbundler_.stdin.write(chunk);
};


BundleInstaller.prototype.end = function (chunk) {
  this.unbundler_.stdin.end(chunk);
};


BundleInstaller.prototype.handleUnbundleOutput_ = function (chunk) {
  this.unbundle_result_ += String(chunk);
};


BundleInstaller.prototype.handleUnbundleError_ = function (chunk) {
  this.emit('error', new Error(String(chunk)));
};


BundleInstaller.prototype.handleResult_ = function (code) {
  if (code === 0) {
    var heads = {};
    var head_lines = this.unbundle_result_.split('\n');
    head_lines.forEach(function (head_line) {
      var cols = head_line.split(' ');
      heads[cols[1]] = cols[0];
    });

    this.repository_.reset(heads['HEAD'], { hard: true });
  }
};


module.exports = BundleInstaller;
