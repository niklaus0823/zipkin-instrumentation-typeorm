"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const zipkin = require("zipkin");
const TransportHttp = require("zipkin-transport-http");
const CLSContext = require("zipkin-context-cls");
const index_1 = require("../index");
const typeorm_1 = require("typeorm");
// Typeorm Entity
let OrderEntity = class OrderEntity {
};
__decorate([
    typeorm_1.PrimaryGeneratedColumn(),
    __metadata("design:type", Number)
], OrderEntity.prototype, "id", void 0);
__decorate([
    typeorm_1.Column('text'),
    __metadata("design:type", String)
], OrderEntity.prototype, "price", void 0);
__decorate([
    typeorm_1.Column('text', { name: 'create_time' }),
    __metadata("design:type", String)
], OrderEntity.prototype, "createTime", void 0);
OrderEntity = __decorate([
    typeorm_1.Entity()
], OrderEntity);
exports.OrderEntity = OrderEntity;
// Build TracerInfo
const tracerInfo = {
    tracer: new zipkin.Tracer({
        ctxImpl: new CLSContext('zipkin'),
        recorder: new zipkin.BatchRecorder({
            logger: new TransportHttp.HttpLogger({
                endpoint: `http://127.0.0.1:9411/api/v1/spans`
            })
        }),
        sampler: new zipkin.sampler.CountingSampler(1),
    }),
    serviceName: 'order',
    remoteServiceName: 'mysql',
    port: 0
};
function getOrder(ctx) {
    return __awaiter(this, void 0, void 0, function* () {
        // build entities
        const entities = [];
        entities.push({ OrderEntity: OrderEntity });
        // create typeorm db connection
        const conn = yield typeorm_1.createConnection({
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
            .where(`order.id=:id`, { id: '1000' });
        const builderProxy = index_1.TypeOrmInstrumentation.proxyConnection(builder, ctx, tracerInfo);
        return yield builderProxy.getOne();
    });
}
exports.getOrder = getOrder;
//# sourceMappingURL=mysql.js.map