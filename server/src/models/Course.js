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
import { Video } from './Video.js';
import { CourseTest } from './CourseTest.js';
import { User } from './User.js';
import { CourseEnrollment } from './CourseEnrollment.js';
let Course = class Course extends Model {
};
__decorate([
    Column({ type: DataType.STRING, allowNull: false }),
    __metadata("design:type", String)
], Course.prototype, "title", void 0);
__decorate([
    Column({ type: DataType.TEXT, allowNull: true }),
    __metadata("design:type", String)
], Course.prototype, "description", void 0);
__decorate([
    Column({ type: DataType.STRING, allowNull: false }),
    __metadata("design:type", String)
], Course.prototype, "instructor", void 0);
__decorate([
    Column({ type: DataType.STRING, allowNull: true }),
    __metadata("design:type", String)
], Course.prototype, "coverImage", void 0);
__decorate([
    ForeignKey(() => User),
    Column({ type: DataType.INTEGER, allowNull: true }),
    __metadata("design:type", Number)
], Course.prototype, "ownerId", void 0);
__decorate([
    BelongsTo(() => User),
    __metadata("design:type", User)
], Course.prototype, "owner", void 0);
__decorate([
    HasMany(() => Video),
    __metadata("design:type", Array)
], Course.prototype, "videos", void 0);
__decorate([
    HasMany(() => CourseTest),
    __metadata("design:type", Array)
], Course.prototype, "tests", void 0);
__decorate([
    Column({ type: DataType.STRING, defaultValue: 'open' }),
    __metadata("design:type", String)
], Course.prototype, "enrollmentType", void 0);
__decorate([
    HasMany(() => CourseEnrollment),
    __metadata("design:type", Array)
], Course.prototype, "enrollments", void 0);
__decorate([
    Column({ type: DataType.BOOLEAN, defaultValue: false }),
    __metadata("design:type", Boolean)
], Course.prototype, "allowTeachersFreeAccess", void 0);
__decorate([
    Column({ type: DataType.INTEGER, defaultValue: 0 }),
    __metadata("design:type", Number)
], Course.prototype, "orderIndex", void 0);
Course = __decorate([
    Table({ tableName: 'courses' })
], Course);
export { Course };
