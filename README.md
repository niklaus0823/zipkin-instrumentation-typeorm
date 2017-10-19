# typeorm

Typeorm db connection and instrumentation that adds Zipkin tracing to the application.

## Install

```bash
$ npm install --save zipkin-instrumentation-typeorm
```

## API

### proxyConnection([conn])

#### conn

Type: `typeorm.SelectQueryBuilder`<br>

Allows to build complex sql queries in a fashion way and execute those queries.

### proxyConnection.proxyQueryBuilder([target], [alias], [info], [ctx])

#### target

Type: `ObjectType<Entity>`<br>

Represents some Type of the Object. see: [typeorm.Connection::getRepository](https://github.com/typeorm/typeorm/blob/master/src/connection/Connection.ts)

#### alias

Type: `string`<br>

Database sheet name alias. see: [typeorm.Repository::createQueryBuilder](https://github.com/typeorm/typeorm/blob/master/src/repository/Repository.ts)

#### info
##### tracer

Type: `zipkin.Tracer` or `false`<br>
Default: `false`

##### serviceName

Type: `string`<br>
Default: `unknown`

##### remoteServiceName

Type: `string`<br>
Default: `unknown`

##### port

Type: `number`<br>
Default: `0`

#### ctx
Type: `object`<br>

Example: ctx[zipkin.HttpHeaders.TraceId] = new zipkin.TraceId();

## Examples

### Typeorm DB Connection Proxy

This library will wrap grpc client proxy to record traces.

```typescript
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
```