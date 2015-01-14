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

test('bike#belongsTo biker loads biker', function() {
  var store = this.store();

  server = new Pretender(function() {
    this.get('/orchestrate/v0/bikes/bike-1', function(request) {
      return [200, {}, {
        type: 'road'
      }];
    });

    this.get('/orchestrate/v0/bikes/bike-1/relations/biker', function(request) {
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

test('bike#belongsTo biker creates relations for bike and biker', function() {
  var store = this.store();

  server = new Pretender(function() {
    this.post('/orchestrate/v0/bikes', function(request) {
      return [201, {
        'location': '/v0/bikes/035ab997adffe604/refs/82eafab14dc84ed3'
      }, {}];
    });

    this.put('/orchestrate/v0/bikes/035ab997adffe604/relation/biker/bikers/1', function(request) {
      ok(true, 'handled request to relate bike to bikers');
      return [201, {}, {}];
    });

    this.put('/orchestrate/v0/bikers/1/relation/bikes/bikes/035ab997adffe604', function(request) {
      ok(true, 'handled request to relate biker to bike');
      return [201, {}, {}];
    });
  });

  server.unhandledRequest = function(verb, path, request) {
    ok(false, 'unhandled request for ' + verb + ' ' + path);
  };

  server.handledRequest = function(verb, path, request) {
    console.log('handled request for ' + verb + ' ' + path, request);
  };

  return Ember.run(function() {
    var biker = store.push('biker', {
      id: '1',
      name: 'Steve'
    });

    var bike = store.createRecord('bike', {
      type: 'fixie',
      biker: biker
    });

    return bike.save().then(function(bike) {
      ok(bike, 'record created');
    });
  });
});

