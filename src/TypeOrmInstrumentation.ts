import * as zipkin from 'zipkin';
import {Connection, Repository, ObjectType, SelectQueryBuilder} from 'typeorm';

export interface TraceInfo {
    tracer: zipkin.Tracer | false;
    serviceName?: string;
    remoteServiceName?: string;
    port?: number;
}

export interface ProxyConnection extends Connection {
    proxyQueryBuilder?: <Entity>(target: ObjectType<Entity> | string, alias: string, info?: TraceInfo, ctx?: object) => SelectQueryBuilder<Entity>;
}

const defaultTraceInfo: TraceInfo = {
    tracer: false,
    serviceName: 'unknown',
    remoteServiceName: 'unknown',
    port: 0,
};

export class TypeOrmInstrumentation {
    public static proxyConnection(conn: Connection): ProxyConnection {

        conn['proxyQueryBuilder'] = function <Entity>(target: ObjectType<Entity> | string, alias: string, info: TraceInfo = defaultTraceInfo, ctx?: object) {
            const repository = conn['getRepository'].apply(conn, [target]) as Repository<Entity>;
            const queryBuilder = repository['createQueryBuilder'].apply(repository, [alias]);

            if (info.tracer === false) {
                return queryBuilder;
            }

            // Set value
            const tracer = info.tracer as zipkin.Tracer;
            const serviceName = info.serviceName || 'unknown';
            const port = info.port || 0;

            // Set parent traceId
            if (ctx
                && ctx.hasOwnProperty(zipkin.HttpHeaders.TraceId)
                && ctx[zipkin.HttpHeaders.TraceId] instanceof zipkin.TraceId) {
                tracer.setId(ctx[zipkin.HttpHeaders.TraceId]);
            }

            Object.getOwnPropertyNames(Object.getPrototypeOf(queryBuilder)).forEach((property) => {

                const original = queryBuilder[property];
                if (property == 'stream'
                    || property == 'executeCountQuery'
                    || property == 'loadRawResults') {

                    queryBuilder[property] = function () {
                        // create SpanId
                        tracer.setId(tracer.createChildId());
                        const traceId = tracer.id;

                        tracer.scoped(() => {
                            tracer.recordServiceName(serviceName);
                            tracer.recordRpc(`db`);
                            tracer.recordBinary('db_sql', queryBuilder['getSql']());
                            tracer.recordAnnotation(new zipkin.Annotation.ClientSend());
                            tracer.recordAnnotation(new zipkin.Annotation.LocalAddr({port}));

                            if (traceId.flags !== 0 && traceId.flags != null) {
                                tracer.recordBinary(zipkin.HttpHeaders.Flags, traceId.flags.toString());
                            }
                        });

                        const call = original.apply(queryBuilder, arguments) as Promise<any>;
                        return call.then((res) => {
                            tracer.scoped(() => {
                                tracer.setId(traceId);
                                tracer.recordBinary('db_end', `Succeed`);
                                tracer.recordBinary('db_response', JSON.stringify(res));
                                tracer.recordAnnotation(new zipkin.Annotation.ClientRecv());
                            });
                            return res;
                        }).catch((err) => {
                            tracer.scoped(() => {
                                tracer.setId(traceId);
                                tracer.recordBinary('db_sql', `Error`);
                                tracer.recordBinary('rpc_end_response', JSON.stringify(err));
                                tracer.recordAnnotation(new zipkin.Annotation.ClientRecv());
                            });
                            throw err
                        });
                    };
                }
            });

            return queryBuilder;
        };

        return conn;
    }
}
