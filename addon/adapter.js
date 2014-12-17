import Ember from 'ember';
import DS from 'ember-data';

var get = Ember.get;
var Promise = Ember.RSVP.Promise;
var pluralize = Ember.String.pluralize;

export default DS.RESTAdapter.extend({
  host: '/orchestrate',

  apiKey: null,

  headers: function() {
    return {
      'Authorization': 'Basic ' + this.get('apiKey')
    };
  }.property('apiKey'),

  find: function(store, type, id, record) {
    var adapter = this;

    return new Promise(function(resolve) {
      adapter.ajax(adapter.buildURL(type.typeKey, id, record), 'GET')
        .then(function(data) {
          var json = {
            path: { key: id },
            value: data
          };
          resolve(json);
        });
    });
  },

  createRecord: function(store, type, record) {
    var data = {};
    var serializer = store.serializerFor(type.typeKey);
    var adapter = this;

    serializer.serializeIntoHash(data, type, record, { includeId: true });

    return new Promise(function(resolve) {
      adapter.ajax(adapter.buildURL(type.typeKey, null, record), 'POST', { data: data })
        .then(function() {
          var promises = [];
          var headers = adapter.get('parsedHeaders');
          var parts = headers.location.split('/');
          var json = {
            path: {
              key: parts[3]
            },
            value: data
          };

          type.eachRelationship(function(key, relationship) {
            if (relationship.kind === 'belongsTo') {
              var parentCollection = pluralize(key);
              var parentKey = get(record, key+'.id');
              var kind = pluralize(type.typeKey);
              var url = adapter.buildURL(parentCollection+'/'+parentKey+'/relation/'+kind);
              promises.push(adapter.ajax(url, 'PUT'));
            }
          });

          return Ember.RSVP.all(promises).then(function() {
            return resolve(json);
          });
        });
    });
  },

  updateRecord: function(store, type, record) {
    var data = {};
    var serializer = store.serializerFor(type.typeKey);
    var adapter = this;

    serializer.serializeIntoHash(data, type, record);

    var id = get(record, 'id');

    return new Promise(function(resolve) {
      adapter.ajax(adapter.buildURL(type.typeKey, id, record), 'PUT', { data: data })
        .then(function() {
          var headers = adapter.get('parsedHeaders');
          var parts = headers.location.split('/');
          var json = {
            path: {
              key: parts[3]
            },
            value: data
          };
          resolve(json);
        });
    });
  },

  findHasMany: function(store, record, url, relationship) {
    //var id   = get(record, 'id');
    //var type = record.constructor.typeKey;

    return this.ajax(this.buildURL(url), 'GET');
  },

  ajaxError: function(jqXHR, responseText, errorThrown) {
    this.set('responseHeaders', jqXHR.getAllResponseHeaders());

    var isObject = jqXHR !== null && typeof jqXHR === 'object';

    if (isObject) {
      jqXHR.then = null;
      if (!jqXHR.errorThrown) {
        jqXHR.errorThrown = errorThrown;
      }
    }

    return jqXHR;
  },

  ajaxSuccess: function(jqXHR, jsonPayload) {
    this.set('responseHeaders', jqXHR.getAllResponseHeaders());
    return jsonPayload;
  },

  parsedHeaders: function() {
    var headers = {};
    var splitHeaders = this.get('responseHeaders').split('\r\n');

    for (var i = 0; i < splitHeaders.length; i++) {
      var headerValuePair = splitHeaders[i].split(':');
        if (headerValuePair[1] != null) {
          var headerName = headerValuePair[0].trim();
          var headerValue = headerValuePair[1].trim();
          headers[headerName] = headerValue;
        }
    }
    return headers;
  }.property('responseHeaders'),

  ajax: function(url, type, options) {
    var adapter = this;

    return new Ember.RSVP.Promise(function(resolve, reject) {
      var hash = adapter.ajaxOptions(url, type, options);

      hash.success = function(json, textStatus, jqXHR) {
        json = adapter.ajaxSuccess(jqXHR, json);
        if (json instanceof DS.InvalidError) {
          Ember.run(null, reject, json);
        } else {
          Ember.run(null, resolve, json);
        }
      };

      hash.error = function(jqXHR, textStatus, errorThrown) {
        // Orchestrate sends an empty body back on a successful POST and PUT
        // which is not valid json so we need to manually resolve the promise.
        if (jqXHR.status === 201) {
          return Ember.run(null, resolve, adapter.ajaxSuccess(jqXHR));
        }
        Ember.run(null, reject, adapter.ajaxError(jqXHR, jqXHR.responseText, errorThrown));
      };

      Ember.$.ajax(hash);
    }, 'DS: RESTAdapter#ajax ' + type + ' to ' + url);
  }

});
