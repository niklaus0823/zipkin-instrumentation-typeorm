import * as zipkin from 'zipkin';

export interface MiddlewareOptions {
    tracer: zipkin.Tracer;
    serviceName?: string;
    remoteServiceName?: string;
    port?: number;
}

export declare class TypeOrmInstrumentation {
    public static proxyConnection<T>(conn: T, ctx: Object, options: MiddlewareOptions): T;
}