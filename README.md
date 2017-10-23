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
import {TypeOrmInstrumentation} from '../index';
import {User as UserEntity} from './entity/User';
import {Entity, createConnection} from 'typeorm';

// build entities
const entities = [];
entities.push({UserEntity: UserEntity});

// create zipkin Tracer
const tracer = new zipkin.Tracer({
    ctxImpl: new zipkin.ExplicitContext(),
    recorder: new zipkin.ConsoleRecorder()
});

async function getUser(): Promise<UserEntity> {
    const conn = await createConnection({
        type: 'sqlite',
        database: './User.db',
        entities: entities,
    });

    const proxyConn = TypeOrmInstrumentation.proxyConnection(conn, {tracer});

    return await proxyConn.getRepository(UserEntity)
        .createQueryBuilder('user')
        .where(`user.id=:id`, {id: '1000'})
        .getOne();
}

getUser()
    .then(res => console.log(res))
    .catch(err => console.log(err));
```