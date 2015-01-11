var proxyPath = '/orchestrate';

module.exports = function(app) {
  // For options, see:
  // https://github.com/nodejitsu/node-http-proxy
  var proxy = require('http-proxy').createProxyServer({});
  var path = require('path');

  app.use(proxyPath, function(req, res, next) {
    proxy.web(req, res, { target: 'https://api.orchestrate.io/' });
  });
};
