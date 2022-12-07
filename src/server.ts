import http from "http";
import https from "https";
import httpProxy from "http-proxy";
// @ts-expect-error
import rootCas from "ssl-root-cas";

export type Pem = string | Buffer;
export type Domain = string;
export type URL = string;

export default async ({
  upstreams,
  ports,
  ssl,
  onError,
  onListen,
  onRequest,
}: {
  upstreams: Record<Domain, URL>;
  ports: {
    https: number;
    http: number;
  };
  ssl: {
    key: Pem;
    cert: Pem;
  };
  onError: (error: Error) => void;
  onListen: (server: "http" | "https", port: number) => void;
  onRequest: http.RequestListener;
}) => {
  const proxy = httpProxy.createProxyServer({});

  https.globalAgent.options.ca = rootCas.create();

  const errorHandler = (
    error: string | Error | unknown,
    req: http.IncomingMessage,
    res: http.ServerResponse
  ) => {
    res
      .writeHead(500, {
        "Content-Type": "application/json",
      })
      .end(
        JSON.stringify({
          error,
        })
      );

    error instanceof Error
      ? onError(error)
      : typeof error === "string"
      ? onError(new Error(error))
      : onError(new Error("Unknown error occurred"));
  };

  https
    .createServer(
      {
        key: ssl.key,
        cert: ssl.cert,
      },
      function (req, res) {
        try {
          if (req.headers.host === undefined) {
            throw new Error(`${req.headers.host} cannot be undefined`);
          }

          if (!(req.headers.host in upstreams)) {
            throw new Error(
              `${req.headers.host} is not configured as upstream`
            );
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
        } catch (error) {
          errorHandler(error, req, res);
        }
      }
    )
    .on("error", onError)
    .on("request", onRequest)
    .on("listening", () => onListen("https", ports.https))
    .on('upgrade', function (req, socket, head) {
      if (req.headers.host === undefined) {
        throw new Error(`${req.headers.host} cannot be undefined`);
      }

      if (!(req.headers.host in upstreams)) {
        throw new Error(
          `${req.headers.host} is not configured as upstream`
        );
      }
      
      if (!(req.headers["X-Forwarded-Proto"])) {
        req.headers["X-Forwarded-Proto"] = "https";
      }

      const upstream = upstreams[req.headers.host];

      proxy.ws(req, socket, head, { target: upstream, secure: false });
    })
    .listen(ports.https);

  http
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
