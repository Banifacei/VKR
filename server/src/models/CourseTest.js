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
import { Course } from './Course.js';
import { TestQuestion } from './TestQuestion.js';
import { UserTestResult } from './UserTestResult.js';
let CourseTest = class CourseTest extends Model {
};
__decorate([
    Column({ type: DataType.STRING, allowNull: false }),
    __metadata("design:type", String)
], CourseTest.prototype, "title", void 0);
__decorate([
    Column({ type: DataType.TEXT, allowNull: true }),
    __metadata("design:type", String)
], CourseTest.prototype, "description", void 0);
__decorate([
    Column({ type: DataType.INTEGER, defaultValue: 3 }),
    __metadata("design:type", Number)
], CourseTest.prototype, "maxAttempts", void 0);
__decorate([
    Column({ type: DataType.INTEGER, defaultValue: 80 }),
    __metadata("design:type", Number)
], CourseTest.prototype, "passingScore", void 0);
__decorate([
    ForeignKey(() => Course),
    Column({ type: DataType.INTEGER, allowNull: false }),
    __metadata("design:type", Number)
], CourseTest.prototype, "courseId", void 0);
__decorate([
    BelongsTo(() => Course),
    __metadata("design:type", Course)
], CourseTest.prototype, "course", void 0);
__decorate([
    HasMany(() => TestQuestion),
    __metadata("design:type", Array)
], CourseTest.prototype, "questions", void 0);
__decorate([
    Column({ type: DataType.BOOLEAN, defaultValue: false }),
    __metadata("design:type", Boolean)
], CourseTest.prototype, "hideResults", void 0);
__decorate([
    HasMany(() => UserTestResult) // <--- ДОБАВЬ ЭТУ СТРОКУ
    ,
    __metadata("design:type", Array)
], CourseTest.prototype, "results", void 0);
__decorate([
    Column({ type: DataType.INTEGER, defaultValue: 0 }),
    __metadata("design:type", Number)
], CourseTest.prototype, "orderIndex", void 0);
__decorate([
    Column({ type: DataType.BOOLEAN, defaultValue: false }),
    __metadata("design:type", Boolean)
], CourseTest.prototype, "isHidden", void 0);
__decorate([
    Column({ type: DataType.DATE, allowNull: true }),
    __metadata("design:type", Object)
], CourseTest.prototype, "unlockDate", void 0);
__decorate([
    Column({ type: DataType.BOOLEAN, defaultValue: false }),
    __metadata("design:type", Boolean)
], CourseTest.prototype, "shuffleQuestions", void 0);
__decorate([
    Column({ type: DataType.BOOLEAN, defaultValue: false }),
    __metadata("design:type", Boolean)
], CourseTest.prototype, "shuffleAnswers", void 0);
__decorate([
    Column({ type: DataType.INTEGER, allowNull: true }),
    __metadata("design:type", Object)
], CourseTest.prototype, "timeLimit", void 0);
CourseTest = __decorate([
    Table({ tableName: 'course_tests' })
], CourseTest);
export { CourseTest };
