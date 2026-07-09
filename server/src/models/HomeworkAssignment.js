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
import { Course } from './Course.js';
import { HomeworkSubmission } from './HomeworkSubmission.js';
let HomeworkAssignment = class HomeworkAssignment extends Model {
};
__decorate([
    Column({ type: DataType.STRING(20), allowNull: false, defaultValue: 'standalone' }),
    __metadata("design:type", String)
], HomeworkAssignment.prototype, "type", void 0);
__decorate([
    Column({ type: DataType.STRING(10), allowNull: true }),
    __metadata("design:type", Object)
], HomeworkAssignment.prototype, "entityType", void 0);
__decorate([
    Column({ type: DataType.INTEGER, allowNull: true }),
    __metadata("design:type", Object)
], HomeworkAssignment.prototype, "entityId", void 0);
__decorate([
    ForeignKey(() => Course),
    Column({ type: DataType.INTEGER, allowNull: false }),
    __metadata("design:type", Number)
], HomeworkAssignment.prototype, "courseId", void 0);
__decorate([
    BelongsTo(() => Course),
    __metadata("design:type", Course)
], HomeworkAssignment.prototype, "course", void 0);
__decorate([
    Column({ type: DataType.STRING, allowNull: false }),
    __metadata("design:type", String)
], HomeworkAssignment.prototype, "title", void 0);
__decorate([
    Column({ type: DataType.TEXT, allowNull: true }),
    __metadata("design:type", Object)
], HomeworkAssignment.prototype, "description", void 0);
__decorate([
    Column({ type: DataType.JSONB, defaultValue: [] }),
    __metadata("design:type", Array)
], HomeworkAssignment.prototype, "taskFiles", void 0);
__decorate([
    Column({ type: DataType.STRING, allowNull: true }),
    __metadata("design:type", Object)
], HomeworkAssignment.prototype, "taskLink", void 0);
__decorate([
    Column({ type: DataType.DATE, allowNull: false }),
    __metadata("design:type", Date)
], HomeworkAssignment.prototype, "deadline", void 0);
__decorate([
    Column({ type: DataType.BOOLEAN, defaultValue: false }),
    __metadata("design:type", Boolean)
], HomeworkAssignment.prototype, "strictDeadline", void 0);
__decorate([
    Column({ type: DataType.BOOLEAN, defaultValue: false }),
    __metadata("design:type", Boolean)
], HomeworkAssignment.prototype, "allowResubmit", void 0);
__decorate([
    Column({ type: DataType.JSONB, allowNull: true }),
    __metadata("design:type", Object)
], HomeworkAssignment.prototype, "allowedFileTypes", void 0);
__decorate([
    Column({ type: DataType.BOOLEAN, defaultValue: true }),
    __metadata("design:type", Boolean)
], HomeworkAssignment.prototype, "showFeedbackToStudent", void 0);
__decorate([
    Column({ type: DataType.JSONB, defaultValue: [] }),
    __metadata("design:type", Array)
], HomeworkAssignment.prototype, "reminderDays", void 0);
__decorate([
    Column({ type: DataType.INTEGER, defaultValue: 100 }),
    __metadata("design:type", Number)
], HomeworkAssignment.prototype, "maxScore", void 0);
__decorate([
    Column({ type: DataType.INTEGER, defaultValue: 0 }),
    __metadata("design:type", Number)
], HomeworkAssignment.prototype, "orderIndex", void 0);
__decorate([
    Column({ type: DataType.BOOLEAN, defaultValue: false }),
    __metadata("design:type", Boolean)
], HomeworkAssignment.prototype, "isPublished", void 0);
__decorate([
    ForeignKey(() => User),
    Column({ type: DataType.INTEGER, allowNull: false }),
    __metadata("design:type", Number)
], HomeworkAssignment.prototype, "createdBy", void 0);
__decorate([
    BelongsTo(() => User),
    __metadata("design:type", User)
], HomeworkAssignment.prototype, "creator", void 0);
__decorate([
    HasMany(() => HomeworkSubmission),
    __metadata("design:type", Array)
], HomeworkAssignment.prototype, "submissions", void 0);
__decorate([
    Column({ type: DataType.BOOLEAN, defaultValue: false }),
    __metadata("design:type", Boolean)
], HomeworkAssignment.prototype, "allowCodeSubmission", void 0);
__decorate([
    Column({ type: DataType.JSONB, defaultValue: [] }),
    __metadata("design:type", Array)
], HomeworkAssignment.prototype, "allowedCodeLanguages", void 0);
__decorate([
    Column({ type: DataType.BOOLEAN, defaultValue: true }),
    __metadata("design:type", Boolean)
], HomeworkAssignment.prototype, "recordCodeHistory", void 0);
__decorate([
    Column({ type: DataType.INTEGER, allowNull: true }),
    __metadata("design:type", Object)
], HomeworkAssignment.prototype, "codeHistoryDeleteDays", void 0);
__decorate([
    Column({ type: DataType.TEXT, allowNull: true }),
    __metadata("design:type", Object)
], HomeworkAssignment.prototype, "codeTemplate", void 0);
HomeworkAssignment = __decorate([
    Table({ tableName: 'homework_assignments' })
], HomeworkAssignment);
export { HomeworkAssignment };
