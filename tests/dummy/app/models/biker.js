import DS from 'ember-data';

export default DS.Model.extend({
  name: DS.attr('string'),
  bikes: DS.hasMany('bike', {async: true})
});
