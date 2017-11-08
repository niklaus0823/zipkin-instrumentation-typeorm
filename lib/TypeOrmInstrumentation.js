"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const zipkin = require("zipkin");
const defaultTraceInfo = {
    tracer: false,
    serviceName: 'unknown',
    port: 0,
};
class TypeOrmInstrumentation {
    static proxyConnection(conn, info = defaultTraceInfo, ctx) {
        if (info.tracer === false || conn['proxy'] == true) {
            return conn;
        }
        const tracer = info.tracer;
        const serviceName = info.serviceName || 'unknown';
        const remoteService = info.remoteService || null;
        const port = info.port || 0;
        if (ctx
            && ctx.hasOwnProperty(zipkin.HttpHeaders.TraceId)
            && ctx[zipkin.HttpHeaders.TraceId] instanceof zipkin.TraceId) {
            tracer.setId(ctx[zipkin.HttpHeaders.TraceId]);
        }
        const getRepositoryOriginal = conn['getRepository'];
        conn['getRepository'] = function () {
            const repository = getRepositoryOriginal.apply(conn, arguments);
            if (conn['proxy'] == true) {
                return repository;
            }
            const createQueryBuilderOriginal = conn['createQueryBuilder'];
            conn['createQueryBuilder'] = function () {
                const queryBuilder = createQueryBuilderOriginal.apply(conn, arguments);
                Object.getOwnPropertyNames(Object.getPrototypeOf(queryBuilder)).forEach((property) => {
                    if (property == 'stream'
                        || property == 'executeCountQuery'
                        || property == 'loadRawResults') {
                        const original = queryBuilder[property];
                        queryBuilder[property] = function () {
                            // create SpanId
                            tracer.setId(tracer.createChildId());
                            const traceId = tracer.id;
                            tracer.scoped(() => {
                                tracer.recordServiceName(serviceName);
                                tracer.recordRpc(`db`);
                                tracer.recordBinary('db_sql', queryBuilder['getSql']());
                                tracer.recordAnnotation(new zipkin.Annotation.ClientSend());
                                tracer.recordAnnotation(new zipkin.Annotation.LocalAddr({ port }));
                                if (traceId.flags !== 0 && traceId.flags != null) {
                                    tracer.recordBinary(zipkin.HttpHeaders.Flags, traceId.flags.toString());
                                }
                                if (remoteService) {
                                    tracer.recordAnnotation(new zipkin.Annotation.ServerAddr({
                                        serviceName: remoteService.serviceName,
                                        host: new zipkin.InetAddress(remoteService.host),
                                        port: remoteService.port
                                    }));
                                }
                            });
                            const call = original.apply(queryBuilder, arguments);
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
                                    tracer.recordBinary('db_end', `Error`);
                                    tracer.recordBinary('db_response', err.message);
                                    tracer.recordAnnotation(new zipkin.Annotation.ClientRecv());
                                });
                                throw err;
                            });
                        };
                    }
                });
                conn['proxy'] = true;
                return queryBuilder;
            };
            return repository;
        };
        return conn;
    }
}
exports.TypeOrmInstrumentation = TypeOrmInstrumentation;
