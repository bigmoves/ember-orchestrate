import Ember from 'ember';

var get = Ember.get;

export default Ember.Mixin.create({
  hasNext: function() {
    return get(this, 'content.hasNext');
  }.property('content.hasNext')
});
