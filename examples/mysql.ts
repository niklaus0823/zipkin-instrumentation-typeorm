import * as zipkin from 'zipkin';
import * as TransportHttp from 'zipkin-transport-http';
import * as CLSContext from 'zipkin-context-cls';
import {TypeOrmInstrumentation} from '../index';
import {User as UserEntity} from './entity/User';
import {Entity, createConnection} from 'typeorm';

// Build TracerInfo
const tracerInfo = {
    tracer: new zipkin.Tracer({
        ctxImpl: new CLSContext('zipkin'),
        recorder: new zipkin.BatchRecorder({
            logger: new TransportHttp.HttpLogger({
                endpoint: `http://127.0.0.1:9411/api/v1/spans`
            })
        }),
        sampler: new zipkin.sampler.CountingSampler(1), // sample rate 0.5 will sample 1 % of all incoming requests
    }),
    serviceName: 'order',
    remoteServiceName: 'mysql',
    port: 0
};

async function getUser(): Promise<UserEntity> {
    // create parent TraceId
    let ctx = {};
    ctx[zipkin.HttpHeaders.TraceId] = new zipkin.TraceId();

    // build entities
    const entities = [];
    entities.push({UserEntity: UserEntity});

    // create typeorm db connection
    const conn = await createConnection({
        type: 'mysql',
        host: '127.0.0.1',
        port: 3306,
        username: 'root',
        password: 'root',
        database: 'name',
        entities: entities,
        synchronize: true,
        logging: false
    });
    const proxyConn = TypeOrmInstrumentation.proxyConnection(conn);

    return await proxyConn.proxyQueryBuilder(UserEntity, 'user', tracerInfo, ctx)
        .where(`user.id=:id`, {id: '1000'})
        .getOne();
}

getUser()
    .then(res => console.log(res))
    .catch(err => console.log(err));