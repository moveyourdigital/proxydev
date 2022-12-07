#!/usr/bin/env node

import { program, command } from "bandersnatch";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import server, { Domain, URL } from "./server";

interface Config {
  sni: string[];
  upstreams: Record<Domain, URL>;
}

const getConfig = (filepath: string) => {
  const absFilePath = path.isAbsolute(filepath)
    ? filepath
    : path.resolve(process.cwd(), filepath);

  console.log(`[INFO] Reading config file from ${absFilePath}`);

  const content = fs.readFileSync(absFilePath).toString("utf-8");

  if (!content) {
    throw new Error("Config file is empty or non-existent");
  }

  try {
    const config: Config = JSON.parse(content);

    if (!config) {
      throw new Error("Invalid JSON in provided config file");
    }

    return config;
  } catch (e) {
    throw e;
  }
};

(async () => {
  const app = program({
    version: true,
    description: "Proxy pass tool for development",
  });

  app
    .add(
      command(["generate", "g"])
        .option("config", {
          description: "Path to the config JSON file",
          default: "./proxydev.config.json",
          type: "string",
          alias: "c",
        })
        .option("certs", {
          description: "Base path to store certificates",
          default: ".",
          type: "string",
        })
        .description("Generate certificate based on configs")
        .action(
          async ({ config, certs }: { config: string; certs: string }) => {
            const configs = getConfig(config);

            const { sni } = configs;

            const certFile = `${certs}/cert.pem`;
            const keyFile = `${certs}/key.pem`;

            const domains = sni.join(" ");

            console.info(`[INFO] Output from mkcert:`);
            execSync(
              `mkcert -cert-file ${certFile} -key-file ${keyFile} ${domains}`
            );
          }
        )
    )

    .add(
      command(["start", "server", "s"])
        .option("config", {
          description: "Path to the config JSON file",
          default: "./proxydev.config.json",
          type: "string",
          alias: "c",
        })
        .option("certs", {
          description: "Base path of certificates",
          default: ".",
          type: "string",
        })
        .description("Starts proxy server")
        .action(
          async ({ config, certs }: { config: string; certs: string }) => {
            const configs = getConfig(config);

            const { upstreams } = configs;

            const sslKey = fs.readFileSync(`${certs}/key.pem`);
            const sslCert = fs.readFileSync(`${certs}/cert.pem`);

            if (!sslKey) {
              throw new Error(
                "SSL key file not found. Did you generate the certificate?"
              );
            }

            if (!sslCert) {
              throw new Error(
                "SSL certificate file not found. Did you generate the certificate?"
              );
            }

            await server({
              upstreams,
              ports: {
                http: Number(process.env.HTTP_PORT) || 80,
                https: Number(process.env.HTTPS_PORT) || 443,
              },
              ssl: {
                key: sslKey,
                cert: sslCert,
              },
              onError: (error) => {
                console.error(`[Error] ${error.message}`);
              },
              onListen: (server, port) =>
                console.info(
                  `[INFO] Server ${server} listening on port ${port}`
                ),
              onRequest: (req, res) => {
                console.info(
                  `[INFO] ${req.method} ${req.url} (${req.headers.host}) ${res.statusCode}`
                );
              },
            });
          }
        )
    )

    .default(
      command("usage")
        .action(() => console.info("Proxy pass tool for development\n\nType help for usage"))
        .hidden()
    )

    .run()
    .catch((error: any) => {
      console.error("[Failed]", String(error));

      if (!app.isRepl()) {
        process.exit(1);
      }
    });
})();
