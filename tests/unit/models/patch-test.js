import {
  moduleForModel,
  test
} from 'ember-qunit';
import Pretender from 'pretender';
import Ember from 'ember';

var server;

moduleForModel('biker', 'Patch', {
  needs: ['model:bike', 'adapter:application', 'serializer:application'],
  teardown: function() {
    if (server) {
      server.shutdown();
      server = null;
    }
  }
});

test('patches a record', function() {
  server = new Pretender(function() {
    this.patch('/orchestrate/v0/bikers/035ab997adffe604', function(request) {
      var headers = request.requestHeaders;
      var json = JSON.parse(request.requestBody);

      equal(headers['If-Match'], '"82eafab14dc84ee4"', 'has correct if-match');
      equal(headers['Content-Type'], 'application/merge-patch+json;charset=utf-8', 'has correct content-type');
      deepEqual(json, { name: 'Steven' }, 'has correct JSON');
      return [201, {
        'location': '/v0/bikers/035ab997adffe604/refs/82eafab14dc84ed3'
      }, {}];
    });
  });

  var store = this.store();

  return Ember.run(function() {
    store.push('biker', {
      id: '035ab997adffe604',
      ref: '82eafab14dc84ee4',
      name: 'Steve'
    });

    return store.find('biker', '035ab997adffe604').then(function(biker) {
      biker.set('name', 'Steven');
      return biker.save().then(function(biker) {
        ok(biker, 'record updated');
        ok(biker.get('id'), '035ab997adffe604', 'record loaded');
        equal(biker.get('name'), 'Steven', 'record attribute was updated');
        equal(biker.get('ref'), '82eafab14dc84ed3', 'record ref was updated');
      });
    });
  });
});
