
var BitbucketHandler = require('../app/bitbucket-handler');


describe('BitbucketHandler', function () {
  it('should understand a BitBucket update notification', function () {
    var bitbucket_handler = new BitbucketHandler();

    var info = {
      'canon_url': 'https://bitbucket.org',
      'commits': [],
      'repository': {},
      'user': 'jankuca'
    };
    expect(bitbucket_handler.canHandleUpdate(info)).to.be(true);
  });


  describe('update notification parser', function () {
    var info;

    beforeEach(function () {
      info = {
        'canon_url': 'https://bitbucket.org',
        'commits': [
          {
            'author': 'Jan Kuca',
            'branch': 'master',
            'files': [
              { 'type': 'modified', 'file': 'a.txt' }
            ],
            'message': 'fix a',
            'node': 'bbb',
            'parents': [ 'aaa' ],
            'raw_node': 'bbb111'
          },
          {
            'author': 'Jan Kuca',
            'branch': 'hotfix',
            'files': [
              { 'type': 'modified', 'file': 'b.txt' }
            ],
            'message': 'fix b',
            'node': 'ccc',
            'parents': [ 'aaa' ],
            'raw_node': 'ccc111'
          }
        ],
        'repository': {
          'absolute_url': '/jankuca/reparto/',
          'fork': false,
          'is_private': false,
          'name': 'Reparto',
          'owner': 'jankuca',
          'scm': 'git',
          'slug': 'reparto'
        },
        'user': 'jankuca'
      };
    });


    it('should parse out a repository URL', function () {
      var bitbucket_handler = new BitbucketHandler();

      var update = bitbucket_handler.parseUpdateNotification(info);
      expect(update).to.be.ok();
      expect(update.url).to.be('git://bitbucket.org/jankuca/reparto.git');
      expect(update.branches).to.eql({
        'master': 'bbb111',
        'hotfix': 'ccc111'
      });
    });
  });
});
