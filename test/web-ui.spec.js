var events = require('events');

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

    var req = new events.EventEmitter();
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


  describe('codebase updates', function () {
    var update_request = null;
    var update_response = null;
    var update_status_code = null;

    var sendCodebaseUpdateRequest = function (body) {
      update_request = new events.EventEmitter();
      update_request.method = 'POST';
      update_request.url = '/api/codebase/update';

      update_response = {
        writeHead: function (_code, _headers) {
          update_status_code = _code;
        },
        write: function () {},
        end: function () {}
      };

      onRequest('api:codebase:update', {}, update_request, update_response);

      if (typeof body !== 'undefined') {
        update_request.emit('data', new Buffer(body));
      }
      update_request.emit('end');
    };

    beforeEach(function () {
      update_status_code = null;
    });


    it('should reject codebase update notifications of an unknown structure',
        function () {
      var notification_count = 0;
      var info;

      var codebase_manager = {
        parseUpdateNotification: function (_info) {
          expect(_info).to.eql(info);
          notification_count += 1;
          return null;
        }
      };

      var web_ui = new WebUi(router, null, codebase_manager);
      web_ui.init();

      info = { 'abc': 'fake' };
      sendCodebaseUpdateRequest(JSON.stringify(info));
      expect(notification_count).to.be(1);
      expect(update_status_code).to.be(415);
    });


    it('should accept codebase update notifications of a known structure',
        function () {
      var update_info = {};
      var notification_count = 0;
      var update_call_count = 0;
      var info;

      var codebase_manager = {
        parseUpdateNotification: function (_info) {
          expect(_info).to.eql(info);
          notification_count += 1;
          return update_info;
        },
        update: function (_update_info, callback) {
          expect(_update_info).to.be(update_info);
          expect(callback).to.be.a('function');
          update_call_count += 1;
          callback(null);
        }
      };

      var web_ui = new WebUi(router, null, codebase_manager);
      web_ui.init();

      info = {
        'canon_url': 'https://bitbucket.org',
        'commits': [],
        'repository': {},
        'user': 'ian'
      };
      sendCodebaseUpdateRequest(JSON.stringify(info));
      expect(notification_count).to.be(1);
      expect(update_call_count).to.be(1);
      expect(update_status_code).to.be(200);
    });
  });
});
