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
import { HomeworkAssignment } from './HomeworkAssignment.js';
let HomeworkSubmission = class HomeworkSubmission extends Model {
};
__decorate([
    ForeignKey(() => HomeworkAssignment),
    Column({ type: DataType.INTEGER, allowNull: false }),
    __metadata("design:type", Number)
], HomeworkSubmission.prototype, "assignmentId", void 0);
__decorate([
    BelongsTo(() => HomeworkAssignment),
    __metadata("design:type", HomeworkAssignment)
], HomeworkSubmission.prototype, "assignment", void 0);
__decorate([
    ForeignKey(() => User),
    Column({ type: DataType.INTEGER, allowNull: false }),
    __metadata("design:type", Number)
], HomeworkSubmission.prototype, "studentId", void 0);
__decorate([
    BelongsTo(() => User, { foreignKey: 'studentId', as: 'student' }),
    __metadata("design:type", User)
], HomeworkSubmission.prototype, "student", void 0);
__decorate([
    Column({ type: DataType.JSONB, defaultValue: [] }),
    __metadata("design:type", Array)
], HomeworkSubmission.prototype, "files", void 0);
__decorate([
    Column({ type: DataType.TEXT, allowNull: true }),
    __metadata("design:type", Object)
], HomeworkSubmission.prototype, "textAnswer", void 0);
__decorate([
    Column({ type: DataType.DATE, allowNull: false, defaultValue: DataType.NOW }),
    __metadata("design:type", Date)
], HomeworkSubmission.prototype, "submittedAt", void 0);
__decorate([
    Column({ type: DataType.BOOLEAN, defaultValue: false }),
    __metadata("design:type", Boolean)
], HomeworkSubmission.prototype, "isLate", void 0);
__decorate([
    Column({ type: DataType.STRING, defaultValue: 'submitted' }),
    __metadata("design:type", String)
], HomeworkSubmission.prototype, "status", void 0);
__decorate([
    Column({ type: DataType.FLOAT, allowNull: true }),
    __metadata("design:type", Object)
], HomeworkSubmission.prototype, "grade", void 0);
__decorate([
    Column({ type: DataType.TEXT, allowNull: true }),
    __metadata("design:type", Object)
], HomeworkSubmission.prototype, "teacherComment", void 0);
__decorate([
    Column({ type: DataType.DATE, allowNull: true }),
    __metadata("design:type", Object)
], HomeworkSubmission.prototype, "gradedAt", void 0);
__decorate([
    ForeignKey(() => User),
    Column({ type: DataType.INTEGER, allowNull: true }),
    __metadata("design:type", Object)
], HomeworkSubmission.prototype, "gradedBy", void 0);
__decorate([
    BelongsTo(() => User, { foreignKey: 'gradedBy', as: 'grader' }),
    __metadata("design:type", User)
], HomeworkSubmission.prototype, "grader", void 0);
HomeworkSubmission = __decorate([
    Table({ tableName: 'homework_submissions' })
], HomeworkSubmission);
export { HomeworkSubmission };
