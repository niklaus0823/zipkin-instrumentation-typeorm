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