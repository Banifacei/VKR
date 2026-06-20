var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Table, Column, Model, DataType, HasMany, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { InteractiveEvent } from './InteractiveEvent.js';
import { Course } from './Course.js';
let Video = class Video extends Model {
};
__decorate([
    Column({ type: DataType.STRING, allowNull: false }),
    __metadata("design:type", String)
], Video.prototype, "title", void 0);
__decorate([
    Column({ type: DataType.STRING, allowNull: false }),
    __metadata("design:type", String)
], Video.prototype, "url", void 0);
__decorate([
    Column({ type: DataType.JSONB, defaultValue: [] }),
    __metadata("design:type", Object)
], Video.prototype, "subtitles", void 0);
__decorate([
    Column({ type: DataType.BOOLEAN, defaultValue: false }),
    __metadata("design:type", Boolean)
], Video.prototype, "hideResults", void 0);
__decorate([
    ForeignKey(() => Course),
    Column({ type: DataType.INTEGER, allowNull: true }),
    __metadata("design:type", Number)
], Video.prototype, "courseId", void 0);
__decorate([
    BelongsTo(() => Course),
    __metadata("design:type", Course)
], Video.prototype, "course", void 0);
__decorate([
    HasMany(() => InteractiveEvent),
    __metadata("design:type", Array)
], Video.prototype, "events", void 0);
__decorate([
    Column({ type: DataType.INTEGER, defaultValue: 3 }),
    __metadata("design:type", Number)
], Video.prototype, "maxAttempts", void 0);
__decorate([
    Column({ type: DataType.INTEGER, defaultValue: 0 }),
    __metadata("design:type", Number)
], Video.prototype, "orderIndex", void 0);
__decorate([
    Column({ type: DataType.BOOLEAN, defaultValue: true }),
    __metadata("design:type", Boolean)
], Video.prototype, "allowExternalTest", void 0);
__decorate([
    Column({ type: DataType.BOOLEAN, defaultValue: false }),
    __metadata("design:type", Boolean)
], Video.prototype, "isHidden", void 0);
__decorate([
    Column({ type: DataType.DATE, allowNull: true }),
    __metadata("design:type", Object)
], Video.prototype, "unlockDate", void 0);
__decorate([
    Column({ type: DataType.JSONB, defaultValue: [] }),
    __metadata("design:type", Array)
], Video.prototype, "qualityUrls", void 0);
__decorate([
    Column({ type: DataType.BOOLEAN, defaultValue: false }),
    __metadata("design:type", Boolean)
], Video.prototype, "noForwardSeek", void 0);
__decorate([
    Column({ type: DataType.STRING, allowNull: true }),
    __metadata("design:type", Object)
], Video.prototype, "hlsUrl", void 0);
Video = __decorate([
    Table({ tableName: 'videos' })
], Video);
export { Video };
