var Blueprint = require('ember-cli/lib/models/blueprint');

module.exports = {
  description: 'Generates a proxy to the Orchestrate.io API',

  normalizeEntityName: function() {
    return '';
  },

  locals: function(options) {
    return {
      path: '/' + options.entity.name.replace(/^\//, ''),
      proxyUrl: '/orchestrate'
    };
  },

  beforeInstall: function(options) {
    var serverBlueprint = Blueprint.lookup('server', {
      ui: this.ui,
      analytics: this.analytics,
      project: this.project
    });

    return serverBlueprint.install(options);
  },

  afterInstall: function() {
    return this.addPackagesToProject([
      { name: 'http-proxy', target: '^1.1.6' }
    ]);
  }
};
