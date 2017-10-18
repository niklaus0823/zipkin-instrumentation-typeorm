# typeorm

Typeorm db connection and instrumentation that adds Zipkin tracing to the application.

## Install

```bash
$ npm install --save zipkin-instrumentation-typeorm
```

## API

### proxyConnection([conn], [info], [ctx])

#### conn

Type: `typeorm.SelectQueryBuilder`<br>

Allows to build complex sql queries in a fashion way and execute those queries.

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
import {TypeOrmInstrumentation} from 'typeorm-zpikin';
import {Entity, Column, PrimaryGeneratedColumn, createConnection} from 'typeorm';

// Typeorm Entity
@Entity()
export class OrderEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column('text')
    price: string;

    @Column('text', {name: 'create_time'})
    createTime: string;
}

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

export async function getOrder(ctx?: Object): Promise<OrderEntity> {
    // build entities
    const entities = [];
    entities.push({OrderEntity: OrderEntity});

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

    // get typeorm SelectQueryBuilder
    const builder = conn
        .getRepository(OrderEntity)
        .createQueryBuilder('order')
        .where(`order.id=:id`, {id: '1000'});

    const builderProxy = TypeOrmInstrumentation.proxyConnection(builder, tracerInfo, ctx);
    return await builderProxy.getOne();
}
```