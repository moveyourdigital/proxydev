# ProxyDev

It's a simple Node.js proxy that uses `http-proxy` package, reads a `config.json` file that maps domains to upstreams and starts an HTTP server.

And, that's all! Doesn't do anything else, does **not** recovers from any error from upstream and does **not** currently serve TLS (plans for the future).

It is a simple HTTP proxy that one can use for development purposes.

### Usage
1. Create a `config.json` file in the root of this app:
```json
{
  "upstreams": {
    "api.local": "http://localhost:8081",
    "app.local": "http://localhost:8080"
  }
}
```
2. Start the app directly
```sh
npm start
```
or using Docker and map `config.json` from your host.
```
docker run --init -v "$(pwd)"/config.json:/srv/config.json -p 80:80 registry.moveyourdigital.dev/proxydev
```
