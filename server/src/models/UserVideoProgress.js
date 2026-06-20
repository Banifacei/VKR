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
import { User } from './User.js';
import { Video } from './Video.js';
let UserVideoProgress = class UserVideoProgress extends Model {
};
__decorate([
    ForeignKey(() => User),
    Column({ type: DataType.INTEGER, allowNull: false }),
    __metadata("design:type", Number)
], UserVideoProgress.prototype, "userId", void 0);
__decorate([
    ForeignKey(() => Video),
    Column({ type: DataType.INTEGER, allowNull: false }),
    __metadata("design:type", Number)
], UserVideoProgress.prototype, "videoId", void 0);
__decorate([
    Column({ type: DataType.FLOAT, defaultValue: 0 }),
    __metadata("design:type", Number)
], UserVideoProgress.prototype, "lastTime", void 0);
__decorate([
    Column({ type: DataType.BOOLEAN, defaultValue: false }),
    __metadata("design:type", Boolean)
], UserVideoProgress.prototype, "isWatched", void 0);
__decorate([
    BelongsTo(() => User),
    __metadata("design:type", User)
], UserVideoProgress.prototype, "user", void 0);
__decorate([
    BelongsTo(() => Video),
    __metadata("design:type", Video)
], UserVideoProgress.prototype, "video", void 0);
__decorate([
    Column({ type: DataType.INTEGER, defaultValue: 0 }),
    __metadata("design:type", Number)
], UserVideoProgress.prototype, "attemptsUsed", void 0);
UserVideoProgress = __decorate([
    Table({ tableName: 'user_video_progress' })
], UserVideoProgress);
export { UserVideoProgress };
