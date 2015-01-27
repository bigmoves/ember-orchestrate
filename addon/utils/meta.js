export function setMeta(store, type, meta) {
  if (store.setMetadataFor) { // Ember Data after 1.14.1 adds this method
    store.setMetadataFor(type, meta);
  } else {
    store.metaForType(type, meta);
  }
}
