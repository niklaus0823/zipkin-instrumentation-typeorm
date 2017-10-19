import * as zipkin from 'zipkin';
import {Connection, ObjectType, SelectQueryBuilder} from 'typeorm';

export interface TraceInfo {
    tracer: zipkin.Tracer | false;
    serviceName?: string;
    remoteServiceName?: string;
    port?: number;
}

export interface ProxyConnection extends Connection {
    proxyQueryBuilder?: <Entity>(target: ObjectType<Entity> | string, alias: string, info?: TraceInfo, ctx?: object) => SelectQueryBuilder<Entity>;
}

export class TypeOrmInstrumentation {
    public static proxyConnection(conn: Connection): ProxyConnection;
}