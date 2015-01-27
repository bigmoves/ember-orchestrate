import Ember from 'ember';
import DS from 'ember-data';
import { setMeta } from './utils/meta';

var pluralize = Ember.String.pluralize;

export default DS.RESTSerializer.extend({
  extractArray: function(store, primaryType, rawPayload) {
    var storePayload = {};
    storePayload[pluralize(primaryType.typeKey)] = rawPayload.results;

    return this._super(store, primaryType, storePayload);
  },

  extractSingle: function(store, primaryType, rawPayload, recordId) {
    var storePayload = {};
    storePayload[primaryType.typeKey] = rawPayload;

    return this._super(store, primaryType, storePayload, recordId);
  },

  extractMeta: function(store, type, payload) {
    if (payload && payload.count) {
      setMeta(store, type, { count: payload.count });
      delete payload.count;
    }

    if (payload && payload.total_count) {
      setMeta(store, type, { total_count: payload.total_count });
      delete payload.total_count;
    }

    if (payload && payload.next) {
      setMeta(store, type, { next: payload.next.slice(3) });
      delete payload.next;
    }
  },

  serializeIntoHash: function(hash, type, record, options) {
    Ember.merge(hash, this.serialize(record, options));
  },

  serialize: function(record, options) {
    var json = {};

    record.eachAttribute(function(key, attribute) {
      this.serializeAttribute(record, json, key, attribute);
    }, this);

    delete json.timestamp;
    delete json.ordinal;

    return json;
  },

  normalize: function(type, hash, property) {
    var json = {};

    // key/value
    if (hash.path && hash.value) {
      json = hash.value;
      json.id = hash.path.key;
    }

    // event
    if (hash.timestamp) {
      json.id = hash.timestamp;
      json.timestamp = hash.timestamp;
      json.ordinal = hash.path.ordinal_str;
    }

    return this._super(type, json, property);
  },

  normalizeRelationships: function(type, hash) {
    hash.links = {};

    type.eachRelationship(function(key, relationship) {
      if (relationship.kind === 'belongsTo') {
        hash.links[key] = pluralize(type.typeKey)+'/'+hash.id+'/relations/'+key;
      }
      else if (relationship.options.event && relationship.kind === 'hasMany') {
        hash.links[key] = pluralize(type.typeKey)+'/'+hash.id+'/events/'+key;
      }
      else if (relationship.options.ref && relationship.kind === 'hasMany') {
        hash.links[key] = pluralize(type.typeKey)+'/'+hash.id+'/refs/?values=true';
      }
      else if (relationship.kind === 'hasMany') {
        hash.links[key] = pluralize(type.typeKey)+'/'+hash.id+'/relations/'+key;
      }
    });
  }

});
