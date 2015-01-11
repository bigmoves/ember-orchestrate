import {
  moduleForModel,
  test
} from 'ember-qunit';
import Pretender from 'pretender';
import Ember from 'ember';

var server;

moduleForModel('biker', 'Biker : HasMany', {
  needs: ['model:bike', 'serializer:application', 'adapter:application'],
  teardown: function() {
    if (server) {
      server.shutdown();
      server = null;
    }
  }
});

test('biker#hasMany bikes loads bikes', function() {
  var store = this.store();

  server = new Pretender(function() {
    this.get('/v0/bikers/1', function(request) {
      return [200, {}, {
        path: {
          key: '1',
        },
        value: {
          name: 'Steve'
        }
      }];
    });

    this.get('/v0/bikers/1/relations/bikes', function(request) {
      return [200, {}, {
        count: 2,
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

  return Ember.run(function() {
    return store.find('biker', 1).then(function(biker) {
      return biker.get('bikes');
    }).then(function(bikes) {
      ok(bikes, 'gets bikes');
      equal(bikes.get('length'), 2, 'has 2 bikes');
      var bike = bikes.get('firstObject');
      equal(bike.get('id'), 'bike-1');
      equal(bike.get('type'), 'road');
    });
  });
});

