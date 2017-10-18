import * as zipkin from 'zipkin';

export interface TraceInfo {
    tracer: zipkin.Tracer | false;
    serviceName?: string;
    remoteServiceName?: string;
    port?: number;
}

export declare class TypeOrmInstrumentation {
    public static proxyConnection<T>(conn: T, info?: TraceInfo, ctx?: object): T;
}