var http = require('http');

var Router = require('../app/router');


describe('Router', function () {
  var http_server = null;
  var request_listener_count = 0;

  var createRequest = function (method, url) {
    var request = new http.IncomingMessage();
    request.method = method;
    request.url = url;
    return request;
  };

  beforeEach(function () {
    request_listener_count = 0;
    onRequest = null;

    http_server = {
      on: function (type, listener) {
        if (type === 'request') {
          expect(listener).to.be.a('function');
          onRequest = listener;
          request_listener_count += 1;
        }
      }
    };
  });


  it('should start listening for HTTP requests on init', function () {
    var router = new Router(http_server);

    router.init();
    expect(request_listener_count).to.be(1);
  });


  it('should emit "request" events on HTTP requests routed based on the rules',
      function () {
    var count = 0;
    var target;

    var router = new Router(http_server);
    router.init();
    router.when('GET', '/abc', 'A');
    router.when('POST', '/efg', 'B');

    router.on('request', function (_target) {
      count += 1;
      target = _target;
    });
    router.on('error', function (code) {
      throw new Error('No route (status code ' + code + ')');
    });

    onRequest(createRequest('GET', '/abc'));
    expect(count).to.be(1);
    expect(target).to.be('A');

    onRequest(createRequest('POST', '/efg'));
    expect(count).to.be(2);
    expect(target).to.be('B');
  });


  it('should pass the request and response objects to "request" listeners',
      function () {
    var count = 0;
    var req;
    var res;

    var router = new Router(http_server);
    router.init();
    router.when('GET', '/abc', 'A');

    router.on('request', function (_target, _params, _req, _res) {
      count += 1;
      target = _target;
      req = _req;
      res = _res;
    });

    var request = createRequest('GET', '/abc');
    var response = new http.ServerResponse(request);
    onRequest(request, response);
    expect(count).to.be(1);
    expect(req).to.be(request);
    expect(res).to.be(response);
  });


  it('should emit "error" events with status codes on unknown requests',
      function () {
    var count = 0;
    var code;

    var router = new Router(http_server);
    router.init();

    router.on('request', function (target) {
      throw new Error('Request routed to "' + target + '"');
    });
    router.on('error', function (_code) {
      count += 1;
      code = _code;
    });

    onRequest(createRequest('GET', '/abc'));
    expect(count).to.be(1);
    expect(code).to.be(404);
  });


  it('should collect request parameters from the URL', function () {
    var count = 0;
    var target;
    var params = null;

    var router = new Router(http_server);
    router.init();
    router.when('GET', '/abc/:id', 'A');
    router.when('GET', '/abc/:id/:action', 'B');
    router.when('GET', '/abc/:id/:action/x', 'C');

    router.on('request', function (_target, _params) {
      count += 1;
      target = _target;
      params = _params;
    });
    router.on('error', function (code) {
      throw new Error('No route (status code ' + code + ')');
    });

    onRequest(createRequest('GET', '/abc/123'));
    expect(count).to.be(1);
    expect(target).to.be('A');
    expect(params).to.eql({ 'id': '123' });

    onRequest(createRequest('GET', '/abc/123/delete'));
    expect(count).to.be(2);
    expect(target).to.be('B');
    expect(params).to.eql({ 'id': '123', 'action': 'delete' });

    onRequest(createRequest('GET', '/abc/123/delete/x'));
    expect(count).to.be(3);
    expect(target).to.be('C');
    expect(params).to.eql({ 'id': '123', 'action': 'delete' });
  });


  it('should match routes in the order of definition', function () {
    var count = 0;
    var target;

    var router = new Router(http_server);
    router.init();
    router.when('GET', '/abc/:id', 'A');
    router.when('GET', '/abc/:id', 'B');
    router.when('GET', '/efg/new', 'C');
    router.when('GET', '/efg/:id', 'D');

    router.on('request', function (_target) {
      count += 1;
      target = _target;
    });

    onRequest(createRequest('GET', '/abc/123'));
    expect(count).to.be(1);
    expect(target).to.be('A');

    onRequest(createRequest('GET', '/efg/new'));
    expect(count).to.be(2);
    expect(target).to.be('C');
  });
});
