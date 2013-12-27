
var GithubHandler = require('../app/github-handler');


describe('GithubHandler', function () {
  it('should understand a Github update', function () {
    var github_handler = new GithubHandler();

    var info = {
      'before': 'aaa',
      'after': 'ccc',
      'commits': [],
      'compare': 'https://github.com/jankuca/reparto/compare/aaa...ccc',
      'pusher': {},
      'ref': 'refs/heads/master',
      'repository': {
        'url': 'https://github.com/jankuca/reparto'
      }
    };
    expect(github_handler.canHandleUpdate(info)).to.be(true);
  });


  describe('update notification parser', function () {
    var info;

    beforeEach(function () {
      info = {
        'before': 'aaa',
        'after': 'ccc',
        'commits': [
          {
            'author': {
              'name': 'Jan Kuca',
              'username': 'jankuca'
            },
            'comitter': {
              'name': 'Jan Kuca',
              'username': 'jankuca'
            },
            'id': 'bbb',
            'message': 'fix a',
            'added': [],
            'modified': [ 'a.txt' ],
            'removed': [],
            'url': 'https://github.com/jankuca/reparto/commit/bbb'
          },
          {
            'author': {
              'name': 'Jan Kuca',
              'username': 'jankuca'
            },
            'comitter': {
              'name': 'Jan Kuca',
              'username': 'jankuca'
            },
            'id': 'ccc',
            'message': 'fix b',
            'added': [],
            'modified': [ 'b.txt' ],
            'removed': [],
            'url': 'https://github.com/jankuca/reparto/commit/ccc'
          }
        ],
        'compare': 'https://github.com/jankuca/reparto/compare/aaa...ccc',
        'pusher': {
          'name': 'Jan Kuca'
        },
        'ref': 'refs/heads/master',
        'repository': {
          'url': 'https://github.com/jankuca/reparto',
          'fork': false,
          'is_private': false,
          'owner': {
            'name': 'jankuca',
          },
          'name': 'reparto'
        },
      };
    });


    it('should parse out a repository URL', function () {
      var github_handler = new GithubHandler();

      var update = github_handler.parseUpdateNotification(info);
      expect(update).to.be.ok();
      expect(update.url).to.be('git://github.com/jankuca/reparto.git');
      expect(update.branches).to.eql({
        'master': 'ccc'
      });
    });
  });
});
