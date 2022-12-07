"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = __importDefault(require("http"));
const https_1 = __importDefault(require("https"));
const http_proxy_1 = __importDefault(require("http-proxy"));
// @ts-expect-error
const ssl_root_cas_1 = __importDefault(require("ssl-root-cas"));
exports.default = async ({ upstreams, ports, ssl, onError, onListen, onRequest, }) => {
    const proxy = http_proxy_1.default.createProxyServer({});
    https_1.default.globalAgent.options.ca = ssl_root_cas_1.default.create();
    const errorHandler = (error, req, res) => {
        res
            .writeHead(500, {
            "Content-Type": "application/json",
        })
            .end(JSON.stringify({
            error,
        }));
        error instanceof Error
            ? onError(error)
            : typeof error === "string"
                ? onError(new Error(error))
                : onError(new Error("Unknown error occurred"));
    };
    https_1.default
        .createServer({
        key: ssl.key,
        cert: ssl.cert,
    }, function (req, res) {
        try {
            if (req.headers.host === undefined) {
                throw new Error(`${req.headers.host} cannot be undefined`);
            }
            if (!(req.headers.host in upstreams)) {
                throw new Error(`${req.headers.host} is not configured as upstream`);
            }
            if (!(req.headers["X-Forwarded-Proto"])) {
                req.headers["X-Forwarded-Proto"] = "https";
            }
            const upstream = upstreams[req.headers.host];
            // const url = new Url(upstream)
            // const request = http.request(url, function(r) {
            //   console.log(r)
            // })
            // req.pipe(request)
            // req.on("end", function () {
            //   request.end()
            // })
            proxy.web(req, res, { target: upstream, secure: false });
        }
        catch (error) {
            errorHandler(error, req, res);
        }
    })
        .on("error", onError)
        .on("request", onRequest)
        .on("listening", () => onListen("https", ports.https))
        .on('upgrade', function (req, socket, head) {
        if (req.headers.host === undefined) {
            throw new Error(`${req.headers.host} cannot be undefined`);
        }
        if (!(req.headers.host in upstreams)) {
            throw new Error(`${req.headers.host} is not configured as upstream`);
        }
        if (!(req.headers["X-Forwarded-Proto"])) {
            req.headers["X-Forwarded-Proto"] = "https";
        }
        const upstream = upstreams[req.headers.host];
        proxy.ws(req, socket, head, { target: upstream, secure: false });
    })
        .listen(ports.https);
    http_1.default
        .createServer(function (req, res) {
        res.writeHead(301, {
            Location: "https://" + req.headers["host"] + req.url,
        });
        res.end();
    })
        .on("error", onError)
        .on("request", onRequest)
        .on("listening", () => onListen("http", ports.http))
        .listen(ports.http);
};
