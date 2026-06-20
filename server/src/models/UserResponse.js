var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { InteractiveEvent } from './InteractiveEvent.js';
import { Video } from './Video.js';
import { User } from './User.js';
let UserResponse = class UserResponse extends Model {
};
__decorate([
    ForeignKey(() => User),
    Column({ type: DataType.INTEGER }),
    __metadata("design:type", Number)
], UserResponse.prototype, "userId", void 0);
__decorate([
    BelongsTo(() => User),
    __metadata("design:type", User)
], UserResponse.prototype, "user", void 0);
__decorate([
    ForeignKey(() => Video),
    Column({ type: DataType.INTEGER }),
    __metadata("design:type", Number)
], UserResponse.prototype, "videoId", void 0);
__decorate([
    ForeignKey(() => InteractiveEvent),
    Column({ type: DataType.INTEGER }),
    __metadata("design:type", Number)
], UserResponse.prototype, "eventId", void 0);
__decorate([
    Column({ type: DataType.STRING }),
    __metadata("design:type", String)
], UserResponse.prototype, "answer", void 0);
__decorate([
    Column({ type: DataType.BOOLEAN }),
    __metadata("design:type", Boolean)
], UserResponse.prototype, "isCorrect", void 0);
__decorate([
    Column({ type: DataType.INTEGER, allowNull: true }),
    __metadata("design:type", Object)
], UserResponse.prototype, "similarity", void 0);
__decorate([
    BelongsTo(() => Video),
    __metadata("design:type", Video)
], UserResponse.prototype, "video", void 0);
__decorate([
    BelongsTo(() => InteractiveEvent),
    __metadata("design:type", InteractiveEvent)
], UserResponse.prototype, "event", void 0);
UserResponse = __decorate([
    Table({ tableName: 'user_responses' })
], UserResponse);
export { UserResponse };
