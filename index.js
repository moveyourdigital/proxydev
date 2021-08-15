const http = require('http');
const httpProxy = require('http-proxy');
const proxy = httpProxy.createProxyServer({});
const config = require('./config.json');
const port = process.env.PORT || 80;

const server = http.createServer(function(req, res) {
  const upstream = config.upstreams[req.headers.host];
  proxy.web(req, res, { target: upstream });
});

console.log(`listening on port ${port}`);
server.listen(port);
