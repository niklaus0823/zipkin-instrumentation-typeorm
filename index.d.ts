import * as zipkin from 'zipkin';

export interface TraceInfo {
    tracer: zipkin.Tracer;
    serviceName?: string;
    remoteServiceName?: string;
    port?: number;
}

export declare class TypeOrmInstrumentation {
    public static proxyConnection<T>(conn: T, ctx: object, info: TraceInfo): T;
}