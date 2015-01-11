import Ember from 'ember';

var get = Ember.get;
var set = Ember.set;

export default Ember.Mixin.create({
  didLoad: function() {
    var type = get(this, 'type');
    var store = get(this, 'store');
    var meta = store.metadataFor(type.typeKey);
    var recordId = get(this.relationship.record, 'id');
    var metaForRecord = get(meta, recordId);
    set(this, 'meta', metaForRecord);
  }.observes('isLoaded'),

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
