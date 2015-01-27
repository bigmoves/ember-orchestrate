import {
  test,
  moduleForModel
} from "ember-qunit";
import Pretender from "pretender";
import Ember from "ember";

var server;

moduleForModel('biker', 'Metadata', {
  needs: ['model:bike', 'serializer:application', 'adapter:application'],
  teardown: function() {
    if (server) {
      server.shutdown();
      server = null;
    }
  }
});

test('loads meta data from a collection resource', function() {
  server = new Pretender(function() {
    this.get('/orchestrate/v0/bikers', function() {
      return [200, {}, {
        count: 10,
        total_count: 40,
        results: [{
          path: {
            key: 'biker-1',
          },
          value: {
            name: 'Steve'
          }
        }],
        next: '/v0/bikers?limit=10&offset=20'
      }];
    });
  });

  var store = this.store();
  return store.find('biker').then(function(bikers) {
    var meta = store.metadataFor('biker');

    deepEqual(meta, {
      count: 10,
      total_count: 40,
      next: '/bikers?limit=10&offset=20'
    });
  });
});

test('biker#hasMany loads meta data', function() {
  var store = this.store();

  server = new Pretender(function() {
    this.get('/orchestrate/v0/bikers/biker-1', function(request) {
      return [200, {}, {
        path: {
          key: 'biker-1',
        },
        value: {
          name: 'Steve'
        }
      }];
    });

    this.get('/orchestrate/v0/bikers/biker-1/relations/bikes', function(request) {
      return [200, {}, {
        count: 10,
        results: [{
          path: {
            key: 'bike-1',
          },
          value: {
            type: 'road'
          }
        }, {
          path: {
            key: 'bike-2',
          },
          value: {
            type: 'fixie'
          }
        }],
        next: '/v0/bikers/biker-1/relations/bikes?limit=10&offset=20'
      }];
    });
  });

  return Ember.run(function() {
    return store.find('biker', 'biker-1').then(function(biker) {
      return biker.get('bikes');
    }).then(function(bikes) {
      var meta = store.metadataFor('bike')['biker-1'];

      deepEqual(meta, {
        next: '/bikers/biker-1/relations/bikes?limit=10&offset=20'
      });
    });
  });
});
