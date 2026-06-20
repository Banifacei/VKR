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
import { Video } from './Video.js';
let InteractiveEvent = class InteractiveEvent extends Model {
};
__decorate([
    Column({ type: DataType.FLOAT, allowNull: false }),
    __metadata("design:type", Number)
], InteractiveEvent.prototype, "time", void 0);
__decorate([
    Column({ type: DataType.STRING, allowNull: false }),
    __metadata("design:type", String)
], InteractiveEvent.prototype, "type", void 0);
__decorate([
    Column({ type: DataType.TEXT, allowNull: false }),
    __metadata("design:type", String)
], InteractiveEvent.prototype, "question", void 0);
__decorate([
    Column({ type: DataType.JSONB, allowNull: true }),
    __metadata("design:type", Object)
], InteractiveEvent.prototype, "options", void 0);
__decorate([
    Column({ type: DataType.TEXT, allowNull: true }),
    __metadata("design:type", String)
], InteractiveEvent.prototype, "correctAnswer", void 0);
__decorate([
    Column({ type: DataType.BOOLEAN, defaultValue: false }),
    __metadata("design:type", Boolean)
], InteractiveEvent.prototype, "isStrict", void 0);
__decorate([
    Column({ type: DataType.INTEGER, defaultValue: 1 }),
    __metadata("design:type", Number)
], InteractiveEvent.prototype, "weight", void 0);
__decorate([
    Column({ type: DataType.FLOAT, allowNull: true }),
    __metadata("design:type", Number)
], InteractiveEvent.prototype, "rewindTo", void 0);
__decorate([
    Column({ type: DataType.TEXT, allowNull: true }),
    __metadata("design:type", String)
], InteractiveEvent.prototype, "explanation", void 0);
__decorate([
    Column({ type: DataType.INTEGER, defaultValue: 50 }),
    __metadata("design:type", Number)
], InteractiveEvent.prototype, "aiThreshold", void 0);
__decorate([
    Column({ type: DataType.INTEGER, allowNull: true }),
    __metadata("design:type", Number)
], InteractiveEvent.prototype, "timeLimit", void 0);
__decorate([
    ForeignKey(() => Video),
    Column({ type: DataType.INTEGER }),
    __metadata("design:type", Number)
], InteractiveEvent.prototype, "videoId", void 0);
__decorate([
    BelongsTo(() => Video),
    __metadata("design:type", Video)
], InteractiveEvent.prototype, "video", void 0);
InteractiveEvent = __decorate([
    Table({ tableName: 'interactive_events' })
], InteractiveEvent);
export { InteractiveEvent };
