/// <reference types="node" />
import http from "http";
import https from "https";
export declare type Pem = string | Buffer;
export declare type Domain = string;
export declare type URL = string;
declare const _default: ({ upstreams, ports, ssl, onError, onListen, onRequest, }: {
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
}) => Promise<void>;
export default _default;
