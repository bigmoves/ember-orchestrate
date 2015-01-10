import Ember from 'ember';

var Promise = Ember.RSVP.Promise;
var pluralize = Ember.String.pluralize;
var get = Ember.get;

export default Ember.Mixin.create({
  loadMore: function() {
    var array = this;
    var type = get(this, 'type');
    var store = get(this, 'store');
    var meta = this.store.metadataFor(type.typeKey);
    var metaForRecord = get(meta, get(this.relationship.record, 'id'));
    var adapter = store.adapterFor(type);

    if (!metaForRecord.next) {
      return;
    }

    return new Promise(function(resolve) {
      adapter.ajax(adapter.urlPrefix()+metaForRecord.next, 'GET')
        .then(function(data) {
          var storePayload = {};
          storePayload[pluralize(type.typeKey)] = data.results;
          store.pushPayload(type.typeKey, storePayload);
          resolve(array);
        });
    });
  },

  destroyRelation: function(record) {
    var array = this;
    var store = get(this, 'store');
    var type = get(this, 'type');
    var relationship = get(this, 'relationship');
    var adapter = store.adapterFor(type.typeKey);

    return adapter.deleteRelation(store, type, record, relationship)
      .then(function() {
        array.removeObject(record);
      });
  }
});
