var proxyPath = '/orchestrate';

module.exports = function(app) {
  // For options, see:
  // https://github.com/nodejitsu/node-http-proxy
  var proxy = require('http-proxy').createProxyServer({});
  var path = require('path');

  app.use(proxyPath, function(req, res, next) {
    var token = process.env.ORCHESTRATE_API_KEY;
    req.headers.authorization = 'Basic ' + new Buffer(token).toString('base64');
    proxy.web(req, res, { target: 'https://api.orchestrate.io/' });
  });
};
