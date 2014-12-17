import Ember from 'ember';
import DS from 'ember-data';

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
      store.metaForType(type, { count: payload.count });
      delete payload.count;
    }

    if (payload && payload.total_count) {
      store.metaForType(type, { total: payload.total_count });
      delete payload.total_count;
    }
  },

  serializeIntoHash: function(hash, type, record, options) {
    Ember.merge(hash, this.serialize(record, options));
  },

  serialize: function(record, options) {
    var json = {};

    record.eachAttribute(function(name) {
      json[name] = record.get(name);
    });

    return json;
  },

  normalize: function(type, hash, property) {
    var json = {};

    if (hash.path && hash.value) {
      json = hash.value;
      json.id = hash.path.key;
    }

    return this._super(type, json, property);
  },

  normalizeRelationships: function(type, hash) {
    hash.links = {};

    type.eachRelationship(function(key, relationship) {
      // bike = { type: 'fixie', links: { biker: 'bikes/bikeId/relations/biker' } }
      if (relationship.kind === 'belongsTo') {
        hash.links[key] = pluralize(type.typeKey)+'/'+hash.id+'/relations/'+key;
      }

      // biker = { name: 'Steve', links: { bikes: 'biker/bikeId/relations/bikes' } }
      if (relationship.kind === 'hasMany') {
        hash.links[key] = pluralize(type.typeKey)+'/'+hash.id+'/relations/'+pluralize(key);
      }
    });
  }

});
