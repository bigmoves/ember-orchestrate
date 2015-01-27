import {
  test,
  moduleForModel
} from "ember-qunit";
import Pretender from "pretender";
import Ember from "ember";

var server;

moduleForModel('biker', 'findQuery', {
  needs: ['model:bike', 'serializer:application', 'adapter:application'],
  teardown: function() {
    if (server) {
      server.shutdown();
      server = null;
    }
  }
});

// Note: Pretender.js doesn't work with query params in the url at the moment
// so the request urls are not what they should be. The intent here is just to
// make sure multiple requests are made if there is a next url provided on a
// resource.
test('data is loaded up to a given limit greater than 100', function() {
  server = new Pretender(function() {
    this.get('/orchestrate/v0/bikers', function(request) { // /orchestrate/v0/bikers?query=*&sort=key&limit=100
      deepEqual(request.queryParams, {
        query: '*',
        sort: 'key',
        limit: '100'
      });
      return [200, {}, {
        count: 100,
        total_count: 150,
        results: [{
          path: {
            key: 'biker-1',
          },
          value: {
            name: 'Steve'
          }
        }],
        next: '/v0/bikers/next'//'/v0/bikers?query=*&sort=key&limit=100&offset=100'
      }];
    });

    this.get('/orchestrate/v0/bikers/next', function() {
      return [200, {}, {
        count: 50,
        total_count: 150,
        results: [{
          path: {
            key: 'biker-2',
          },
          value: {
            name: 'Dave'
          }
        }]
      }];
    });
  });

  server.unhandledRequest = function(verb, path, request) {
    ok(false, 'unhandled request for ' + verb + ' ' + path);
  };

  server.handledRequest = function(verb, path, request) {
    console.log('handled request for ' + verb + ' ' + path, request);
  };

  var store = this.store();
  return store.find('biker', {limit: 150}).then(function(bikers) {
    ok(bikers.get('length') === 2, '2 records loaded');
  });
});
