var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Table, Column, Model, DataType, ForeignKey, BelongsTo, HasMany } from 'sequelize-typescript';
import { User } from './User.js';
import { Video } from './Video.js';
let VideoComment = class VideoComment extends Model {
};
__decorate([
    ForeignKey(() => Video),
    Column({ type: DataType.INTEGER, allowNull: false }),
    __metadata("design:type", Number)
], VideoComment.prototype, "videoId", void 0);
__decorate([
    ForeignKey(() => User),
    Column({ type: DataType.INTEGER, allowNull: false }),
    __metadata("design:type", Number)
], VideoComment.prototype, "userId", void 0);
__decorate([
    Column({ type: DataType.TEXT, allowNull: false }),
    __metadata("design:type", String)
], VideoComment.prototype, "text", void 0);
__decorate([
    Column({ type: DataType.INTEGER, allowNull: true, defaultValue: null }),
    __metadata("design:type", Object)
], VideoComment.prototype, "parentId", void 0);
__decorate([
    BelongsTo(() => User),
    __metadata("design:type", User)
], VideoComment.prototype, "user", void 0);
__decorate([
    BelongsTo(() => Video),
    __metadata("design:type", Video)
], VideoComment.prototype, "video", void 0);
__decorate([
    HasMany(() => VideoComment, { foreignKey: 'parentId', as: 'replies' }),
    __metadata("design:type", Array)
], VideoComment.prototype, "replies", void 0);
VideoComment = __decorate([
    Table({ tableName: 'video_comments' })
], VideoComment);
export { VideoComment };
