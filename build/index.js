#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const bandersnatch_1 = require("bandersnatch");
const child_process_1 = require("child_process");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const server_1 = __importDefault(require("./server"));
const getConfig = (filepath) => {
    const absFilePath = path_1.default.isAbsolute(filepath)
        ? filepath
        : path_1.default.resolve(process.cwd(), filepath);
    console.log(`[INFO] Reading config file from ${absFilePath}`);
    const content = fs_1.default.readFileSync(absFilePath).toString("utf-8");
    if (!content) {
        throw new Error("Config file is empty or non-existent");
    }
    try {
        const config = JSON.parse(content);
        if (!config) {
            throw new Error("Invalid JSON in provided config file");
        }
        return config;
    }
    catch (e) {
        throw e;
    }
};
(async () => {
    const app = (0, bandersnatch_1.program)({
        version: true,
        description: "Proxy pass tool for development",
    });
    app
        .add((0, bandersnatch_1.command)(["generate", "g"])
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
        .action(async ({ config, certs }) => {
        const configs = getConfig(config);
        const { sni } = configs;
        const certFile = `${certs}/cert.pem`;
        const keyFile = `${certs}/key.pem`;
        const domains = sni.join(" ");
        console.info(`[INFO] Output from mkcert:`);
        (0, child_process_1.execSync)(`mkcert -cert-file ${certFile} -key-file ${keyFile} ${domains}`);
    }))
        .add((0, bandersnatch_1.command)(["start", "server", "s"])
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
        .action(async ({ config, certs }) => {
        const configs = getConfig(config);
        const { upstreams } = configs;
        const sslKey = fs_1.default.readFileSync(`${certs}/key.pem`);
        const sslCert = fs_1.default.readFileSync(`${certs}/cert.pem`);
        if (!sslKey) {
            throw new Error("SSL key file not found. Did you generate the certificate?");
        }
        if (!sslCert) {
            throw new Error("SSL certificate file not found. Did you generate the certificate?");
        }
        await (0, server_1.default)({
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
            onListen: (server, port) => console.info(`[INFO] Server ${server} listening on port ${port}`),
            onRequest: (req, res) => {
                console.info(`[INFO] ${req.method} ${req.url} (${req.headers.host}) ${res.statusCode}`);
            },
        });
    }))
        .default((0, bandersnatch_1.command)("usage")
        .action(() => console.info("Proxy pass tool for development\n\nType help for usage"))
        .hidden())
        .run()
        .catch((error) => {
        console.error("[Failed]", String(error));
        if (!app.isRepl()) {
            process.exit(1);
        }
    });
})();
