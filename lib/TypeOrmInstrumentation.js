"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const zipkin = require("zipkin");
class TypeOrmInstrumentation {
    static proxyConnection(conn, ctx, info) {
        const tracer = info.tracer;
        const serviceName = info.serviceName || 'unknown';
        const port = info.port || 0;
        if (tracer === false) {
            return conn;
        }
        if (ctx
            && ctx.hasOwnProperty(zipkin.HttpHeaders.TraceId)
            && ctx[zipkin.HttpHeaders.TraceId] instanceof zipkin.TraceId) {
            tracer.setId(ctx[zipkin.HttpHeaders.TraceId]);
        }
        Object.getOwnPropertyNames(Object.getPrototypeOf(conn)).forEach((property) => {
            const original = conn[property];
            if (property == 'stream'
                || property == 'executeCountQuery'
                || property == 'loadRawResults') {
                conn[property] = function () {
                    // create SpanId
                    tracer.setId(tracer.createChildId());
                    const traceId = tracer.id;
                    tracer.scoped(() => {
                        tracer.recordServiceName(serviceName);
                        tracer.recordRpc(`db`);
                        tracer.recordBinary('db_sql', conn['getSql']());
                        tracer.recordAnnotation(new zipkin.Annotation.ClientSend());
                        tracer.recordAnnotation(new zipkin.Annotation.LocalAddr({ port }));
                        if (traceId.flags !== 0 && traceId.flags != null) {
                            tracer.recordBinary(zipkin.HttpHeaders.Flags, traceId.flags.toString());
                        }
                    });
                    const call = original.apply(conn, arguments);
                    call.then((res) => {
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
                        throw err;
                    });
                    return original.apply(conn, arguments);
                };
            }
        });
        return conn;
    }
}
exports.TypeOrmInstrumentation = TypeOrmInstrumentation;
//# sourceMappingURL=TypeOrmInstrumentation.js.map