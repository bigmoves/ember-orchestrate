import Ember from 'ember';

var Promise = Ember.RSVP.Promise;
var get = Ember.get;

export default Ember.Mixin.create({
  createRecord: function(store, type, record) {
    var data = {};
    var serializer = store.serializerFor(type.typeKey);
    var adapter = this;

    serializer.serializeIntoHash(data, type, record);

    return new Promise(function(resolve) {
      adapter.ajax(adapter.buildURL(type, record), 'POST', {
        data: data
      }).then(function() {
        var headers = adapter.get('parsedHeaders');
        var parts = headers.location.split('/');
        var json = {
          path: {
            key: parts[6]
          },
          value: data,
          timestamp: Number(parts[6])
        };
        resolve(json);
      });
    });
  },

  updateRecord: function(store, type, record) {
    var data = {};
    var serializer = store.serializerFor(type.typeKey);
    var adapter = this;

    serializer.serializeIntoHash(data, type, record);

    var timestamp = get(record, 'timestamp');
    var ordinal = get(record, 'ordinal');

    return new Promise(function(resolve) {
      adapter.ajax(adapter.buildURL(type, record, timestamp, ordinal), 'PUT', {
        data: data
      }).then(function() {
        var headers = adapter.get('parsedHeaders');
        var parts = headers.location.split('/');
        var json = {
          path: {
            key: parts[6]
          },
          value: data,
          timestamp: Number(parts[6])
        };
        resolve(json);
      });
    });
  },

  deleteRecord: function(store, type, record) {
    var timestamp = get(record, 'timestamp');
    var ordinal = get(record, 'ordinal');

    return this.ajax(this.buildURL(type, record, timestamp, ordinal)+'?purge=true', 'DELETE');
  },

  buildURL: function(type, record, timestamp, ordinal) {
    var url = [],
        host = get(this, 'host'),
        prefix = this.urlPrefix(),
        parentRecord = this._getParentRecord(type, record);

    url.push(this.pathForType(parentRecord.type.typeKey));
    url.push(parentRecord.id);
    url.push('events');
    url.push(parentRecord.name);

    if (timestamp && ordinal) {
      url.push(new Date(timestamp).valueOf());
      url.push(ordinal);
    }

    if (prefix) { url.unshift(prefix); }

    url = url.join('/');
    if (!host && url) { url = '/' + url; }

    return url;
  },

  _getParentRecord: function(type, record) {
    var parentRecord;

    type.eachRelationship(function(key, relationship) {
      if (relationship.kind === 'belongsTo') {
        parentRecord = record.constructor.inverseFor(relationship.key);
        parentRecord.id = get(record, parentRecord.type.typeKey+'.id');
      }
    });

    // Todo: Show an error if the parentRecord is undefined.

    return parentRecord;
  }
});
