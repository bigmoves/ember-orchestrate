import {
  moduleForModel,
  test
} from 'ember-qunit';
import Pretender from 'pretender';
import Ember from 'ember';

var server;

moduleForModel('biker', 'Biker model', {
  needs: ['model:bike', 'adapter:application', 'serializer:application'],
  teardown: function(){
    if (server) {
      server.shutdown();
      server = null;
    }
  }
});

test('loads a collection', function() {
  server = new Pretender(function() {
    this.get('/orchestrate/v0/bikers', function() {
      return [200, {}, {
        count: 1,
        results: [{
          path: {
            key: '1'
          },
          value: {
            name: 'Steve'
          }
        }]
      }];
    });
  });

  return this.store().find('biker').then(function(bikers) {
    ok(bikers, 'records found');
    ok(bikers.get('length') > 0, 'many records found');
    ok(bikers.get('firstObject.id'), '1', 'record loaded');
  });
});

test('loads a single record', function() {
  server = new Pretender(function() {
    this.get('/orchestrate/v0/bikers/1', function() {
      return [200, {}, {
        name: 'Steve'
      }];
    });
  });

  var store = this.store();

  return Ember.run(function() {
    return store.find('biker', 1).then(function(biker) {
      ok(biker, 'record found');
      ok(biker.get('id'), '1', 'record loaded');
      ok(biker.get('name'), 'Steve', 'record has an attribute');
    });
  });
});

test('creates a record', function() {
  server = new Pretender(function() {
    this.post('/orchestrate/v0/bikers', function(request) {
      var json = JSON.parse(request.requestBody);
      deepEqual(json, { name: 'Steve' }, 'POSTs correct JSON');
      return [201, {
        'location': '/v0/bikers/035ab997adffe604/refs/82eafab14dc84ed3'
      }, {}];
    });
  });

  var store = this.store();

  return Ember.run(function() {
    var bikerData = { name: 'Steve' };
    var biker = store.createRecord('biker', bikerData);

    return biker.save().then(function(biker) {
      ok(biker, 'record created');
      ok(biker.get('id'), '035ab997adffe604', 'record loaded');
      ok(biker.get('name'), 'Steve', 'record has an attribute');
    });
  });
});

test('updates a record', function() {
  server = new Pretender(function() {
    this.put('/orchestrate/v0/bikers/035ab997adffe604', function(request) {
      var json = JSON.parse(request.requestBody);
      deepEqual(json, { name: 'Steven' }, 'PUTs correct JSON');
      return [201, {
        'location': '/v0/bikers/035ab997adffe604/refs/82eafab14dc84ed3'
      }, {}];
    });
  });

  var store = this.store();

  return Ember.run(function() {
    store.push('biker', {
      id: '035ab997adffe604',
      name: 'Steve'
    });

    return store.find('biker', '035ab997adffe604').then(function(biker) {
      biker.set('name', 'Steven');
      return biker.save().then(function(biker) {
        ok(biker, 'record updated');
        ok(biker.get('id'), '035ab997adffe604', 'record loaded');
        equal(biker.get('name'), 'Steven', 'record attribute was updated');
      });
    });
  });
});
