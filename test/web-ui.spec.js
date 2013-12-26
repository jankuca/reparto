var http = require('http');

var WebUi = require('../app/web-ui');


describe('WebUi', function () {
  var router = null;
  var request_listener_count = 0;
  var error_listener_count = 0;
  var onRequest;
  var onError;

  beforeEach(function () {
    request_listener_count = 0;
    error_listener_count = 0;
    onRequest = null;
    onError = null;

    router = {
      when: function (method, url, target) {},
      on: function (type, listener) {
        switch (type) {
        case 'request':
          request_listener_count += 1;
          onRequest = listener;
          break;
        case 'error':
          error_listener_count += 1;
          onError = listener;
          break;
        }
      }
    };
  });


  it('should handle routed HTTP requests', function () {
    var web_ui = new WebUi(router, null, null);

    web_ui.init();
    expect(request_listener_count).to.be(1);
    expect(onRequest).to.be.a('function');
  });


  it('should handle unknown HTTP requests', function () {
    var web_ui = new WebUi(router, null, null);

    web_ui.init();
    expect(error_listener_count).to.be(1);
    expect(onError).to.be.a('function');
  });


  it('should respond to unknown requests with a status code from the router',
      function () {
    var code;

    var web_ui = new WebUi(router, null, null);
    web_ui.init();

    var req = new http.IncomingMessage();
    req.method = 'GET';
    req.url = '/abc';
    var res = {
      writeHead: function (_code, _headers) {
        code = _code;
      },
      write: function () {},
      end: function () {}
    };
    onError(401, req, res);
    expect(code).to.be(401);
  });
});
