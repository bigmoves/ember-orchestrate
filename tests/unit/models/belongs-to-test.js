import {
  moduleForModel,
  test
} from 'ember-qunit';
import Pretender from 'pretender';
import Ember from 'ember';

var server;

moduleForModel('bike', 'Bike : BelongsTo', {
  needs: ['model:biker', 'serializer:application', 'adapter:application'],
  teardown: function() {
    if (server) {
      server.shutdown();
      server = null;
    }
  }
});

test('biker#belongsTo biker loads biker', function() {
  var store = this.store();

  server = new Pretender(function() {
    this.get('/orchestrate/bikes/bike-1', function(request) {
      return [200, {}, {
        type: 'road'
      }];
    });

    this.get('/orchestrate/bikes/bike-1/relations/biker', function(request) {
      return [200, {}, {
        count: 1,
        results: [{
          path: {
            key: '1',
          },
          value: {
            name: 'Steve'
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
    return store.find('bike', 'bike-1').then(function(bike) {
      return bike.get('biker');
    }).then(function(biker) {
      ok(biker, 'gets biker');
      ok(biker.get('id'), 'biker is loaded');
      ok(biker.get('name'), 'biker has an attribute');
    });
  });
});

