import Ember from 'ember';
import DS from 'ember-data';
import ManyArrayMixin from './mixins/many-array';
import RecordArrayMixin from './mixins/record-array';
import PromiseArrayMixin from './mixins/promise-array';

DS.PromiseArray.reopen(PromiseArrayMixin);
DS.ManyArray.reopen(ManyArrayMixin);
DS.RecordArray.reopen(RecordArrayMixin);

var get = Ember.get;
var set = Ember.set;
var Promise = Ember.RSVP.Promise;
var pluralize = Ember.String.pluralize;

export default DS.RESTAdapter.extend({
  namespace: 'v0',

  apiKey: null,

  defaultLimit: 100,

  headers: function() {
    return {
      'Authorization': 'Basic ' + window.btoa(this.get('apiKey'))
    };
  }.property('apiKey').volatile(),

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

  findAll: function(store, type) {
    var defaultLimit = get(this, 'defaultLimit');
    var query = {
      limit: defaultLimit
    };

    return this.ajax(this.buildURL(type.typeKey), 'GET', { data: query });
  },

  _queryCache: {},

  findQuery: function(store, type, query, recordArray, deferred, next) {
    var adapter = this;
    var url = this.buildURL(type.typeKey);
    var queryCache = get(this, '_queryCache');
    var defaultLimit = get(this, 'defaultLimit');

    query = query || {};
    query = {
      query: query.query || '*',
      limit: query.limit || defaultLimit,
      sort: query.sort || 'key'
    };

    if (!deferred) {
      deferred = Ember.RSVP.defer();
    }

    if (next) {
      url = next;
    }

    this.ajax(url, 'GET', { data: query })
      .then(function(data) {
        if (!queryCache[type.typeKey]) {
          queryCache[type.typeKey] = data;
        } else {
          queryCache[type.typeKey].total_count = data.total_count;
          queryCache[type.typeKey].count += data.count;
          queryCache[type.typeKey].results.pushObjects(data.results);
        }

        if (queryCache.count < query.limit &&
            queryCache.count < queryCache.total_count) {
          adapter.findQuery(store, type, query, recordArray, deferred, data.next);
        } else {
          deferred.resolve(queryCache[type.typeKey]);
          queryCache[type.typeKey] = null;
        }
      }).catch(function(err) {
        deferred.reject(err);
      });

    return deferred.promise;
  },

  createRecord: function(store, type, record) {
    var data = {};
    var serializer = store.serializerFor(type.typeKey);
    var adapter = this;

    serializer.serializeIntoHash(data, type, record, { includeId: true });

    return new Promise(function(resolve) {
      adapter.ajax(adapter.buildURL(type.typeKey, null, record), 'POST', {
        data: data
      }).then(function() {
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
          var relationshipType = record.constructor.determineRelationshipType(relationship);

          if (relationshipType === 'oneToNone') {
            promises.push(adapter.graphOneToNone(type, record, json, relationship));
          } else if (relationshipType === 'oneToMany') {
            promises.push(adapter.graphOneToMany(type, record, json, relationship));
          } else if (relationshipType === 'manyToMany') {
            promises.push(adapter.graphManyToMany(type, record, json, relationship));
          }

          // Todo: support manyToNone
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
      adapter.ajax(adapter.buildURL(type.typeKey, id, record), 'PUT', {
        data: data
      }).then(function() {
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

  deleteRecord: function(store, type, record) {
    var id = get(record, 'id');

    return this.ajax(this.buildURL(type.typeKey, id, record)+'?purge=true', 'DELETE');
  },

  // deletes the relation for both sides of a many-to-many relationship
  deleteRelation: function(store, type, record, relationship) {
    var id = get(record, 'id');
    var inverseKey = relationship.inverseKey;
    var inverseId = get(relationship, 'record.id');
    var collection = pluralize(inverseKey);
    var promises = [];

    promises.push(this.ajax(this.buildURL(type.typeKey, id, record)+'/relation/'+inverseKey+'/'+collection+'/'+inverseId+'?purge=true', 'DELETE'));
    promises.push(this.ajax(this.urlPrefix()+'/'+collection+'/'+inverseId+'/relation/'+pluralize(type.typeKey)+'/'+pluralize(type.typeKey)+'/'+id+'?purge=true', 'DELETE'));

    return Ember.RSVP.all(promises);
  },

  graphOneToNone: function(type, record, json, relationship) {
    var key = relationship.key;
    var collection = pluralize(key);
    var kind = pluralize(type.typeKey);
    var belongsTo = get(record, key);
    var belongsToId = get(belongsTo, 'id');
    var urlPrefix = this.urlPrefix();

    var oneToNoneUrl = urlPrefix+'/'+kind+'/'+json.path.key+'/relation/'+key+'/'+collection+'/'+belongsToId;

    return Ember.RSVP.resolve(this.ajax(oneToNoneUrl, 'PUT'));
  },

  graphOneToMany: function(type, record, json, relationship) {
    var key = relationship.key;
    var collection = pluralize(key);
    var kind = pluralize(type.typeKey);
    var belongsTo = get(record, key);
    var belongsToId = get(belongsTo, 'id');
    var urlPrefix = this.urlPrefix();
    var promises = [];

    // /comments/commentID/relation/post/posts/postId
    var belongsToUrl = urlPrefix+'/'+kind+'/'+json.path.key+'/relation/'+key+'/'+collection+'/'+belongsToId;
    promises.push(this.ajax(belongsToUrl, 'PUT'));

    // /posts/postId/relation/comments/comments/commentId
    var hasManyUrl = urlPrefix+'/'+collection+'/'+belongsToId+'/relation/'+kind+'/'+kind+'/'+json.path.key;
    promises.push(this.ajax(hasManyUrl, 'PUT'));

    return Ember.RSVP.all(promises);
  },

  graphManyToMany: function(type, record, json, relationship) {
    var adapter = this;
    var key = relationship.key;
    var collection = pluralize(key);
    var kind = pluralize(type.typeKey);
    var hasManyIds = get(record, key).mapBy('id');
    var urlPrefix = this.urlPrefix();
    var promises = [];

    hasManyIds.forEach(function(id) {
      // /tags/tagId/relation/posts/posts/postId
      var hasManyFromUrl = urlPrefix+'/'+kind+'/'+json.path.key+'/relation/'+collection+'/'+collection+'/'+id;
      promises.push(adapter.ajax(hasManyFromUrl, 'PUT'));

      // /posts/postId/relation/tags/tags/tagId
      var hasManyToUrl = urlPrefix+'/'+collection+'/'+id+'/relation/'+kind+'/'+kind+'/'+json.path.key;
      promises.push(adapter.ajax(hasManyToUrl, 'PUT'));
    });

    return Ember.RSVP.all(promises);
  },

  findBelongsTo: function(store, record, url, relationship) {
    var adapter = this;
    return new Promise(function(resolve) {
      adapter.ajax(adapter.urlPrefix()+'/'+url, 'GET').then(function(data) {
        resolve(data.results[0]);
      });
    });
  },

  findHasMany: function(store, record, url, relationship) {
    var adapter = this;
    var defaultLimit = get(this, 'defaultLimit');
    var query = { limit: defaultLimit };

    return new Promise(function(resolve) {
      adapter.ajax(adapter.urlPrefix()+'/'+url, 'GET', {
        data: query
      }).then(function(data) {
        var meta = {};
        meta[get(record, 'id')] = {
          next: data.next && data.next.slice(3)
        };
        store.metaForType(relationship.type.typeKey, meta);

        // Can't have duplicate ids in the store so each ref needs to use its
        // ref id instead
        if (relationship.options.ref) {
          data.results.map(function(result) {
            result.path.key = result.path.ref;
            return result;
          });
        }

        resolve(data);
      });
    });
  },

  urlPrefix: function() {
    var host = get(this, 'host');
    var namespace = get(this, 'namespace');
    var url = [];

    if (url.host) {
      url.push(host);
    }
    url.push(namespace);

    return url.join('/');
  },

  ajaxError: function(jqXHR, responseText, errorThrown) {
    set(this, 'responseHeaders', jqXHR.getAllResponseHeaders());

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
    set(this, 'responseHeaders', jqXHR.getAllResponseHeaders());
    return jsonPayload;
  },

  parsedHeaders: function() {
    var headers = {};
    var splitHeaders = get(this, 'responseHeaders').split('\r\n');

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
