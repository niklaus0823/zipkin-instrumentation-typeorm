import * as zipkin from 'zipkin';
import {Connection} from 'typeorm';

export interface TraceInfo {
    tracer: zipkin.Tracer | false;
    serviceName?: string;
    port?: number;
    remoteService?: {
        serviceName?: string;
        host?: string;
        port?: number;
    };
}

export class TypeOrmInstrumentation {
    public static proxyConnection(conn: Connection, info?: TraceInfo, ctx?: object): Connection;
}