var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Table, Column, Model, DataType, HasMany } from 'sequelize-typescript';
import { UserResponse } from './UserResponse.js';
import { UserVideoProgress } from './UserVideoProgress.js';
import { CourseEnrollment } from './CourseEnrollment.js';
let User = class User extends Model {
};
__decorate([
    Column({ type: DataType.STRING, allowNull: false }),
    __metadata("design:type", String)
], User.prototype, "email", void 0);
__decorate([
    Column({ type: DataType.STRING, allowNull: false }),
    __metadata("design:type", String)
], User.prototype, "password", void 0);
__decorate([
    Column({ type: DataType.STRING }),
    __metadata("design:type", String)
], User.prototype, "firstName", void 0);
__decorate([
    Column({ type: DataType.STRING }),
    __metadata("design:type", String)
], User.prototype, "lastName", void 0);
__decorate([
    Column({ type: DataType.STRING }),
    __metadata("design:type", String)
], User.prototype, "middleName", void 0);
__decorate([
    Column({ type: DataType.STRING }),
    __metadata("design:type", String)
], User.prototype, "phone", void 0);
__decorate([
    Column({ type: DataType.STRING }),
    __metadata("design:type", String)
], User.prototype, "avatarUrl", void 0);
__decorate([
    Column({ type: DataType.STRING, defaultValue: 'student' }),
    __metadata("design:type", String)
], User.prototype, "role", void 0);
__decorate([
    Column({ type: DataType.STRING, defaultValue: 'active' }),
    __metadata("design:type", String)
], User.prototype, "status", void 0);
__decorate([
    Column({ type: DataType.TEXT, allowNull: true }),
    __metadata("design:type", Object)
], User.prototype, "banReason", void 0);
__decorate([
    Column({ type: DataType.DATE }),
    __metadata("design:type", Date)
], User.prototype, "lastLogin", void 0);
__decorate([
    Column({ type: DataType.STRING, defaultValue: 'local' }),
    __metadata("design:type", String)
], User.prototype, "authProvider", void 0);
__decorate([
    Column({ type: DataType.JSONB, defaultValue: {} }),
    __metadata("design:type", Object)
], User.prototype, "themeConfig", void 0);
__decorate([
    Column({ type: DataType.STRING, allowNull: true }),
    __metadata("design:type", Object)
], User.prototype, "resetToken", void 0);
__decorate([
    Column({ type: DataType.DATE, allowNull: true }),
    __metadata("design:type", Object)
], User.prototype, "resetTokenExpiry", void 0);
__decorate([
    Column({ type: DataType.STRING, allowNull: true }),
    __metadata("design:type", Object)
], User.prototype, "emailVerificationToken", void 0);
__decorate([
    Column({ type: DataType.DATE, allowNull: true }),
    __metadata("design:type", Object)
], User.prototype, "emailVerificationExpiry", void 0);
__decorate([
    Column({ type: DataType.BOOLEAN, defaultValue: false }),
    __metadata("design:type", Boolean)
], User.prototype, "onboardingCompleted", void 0);
__decorate([
    Column({ type: DataType.BOOLEAN, defaultValue: false }),
    __metadata("design:type", Boolean)
], User.prototype, "homeworkDismissed", void 0);
__decorate([
    Column({ type: DataType.BOOLEAN, defaultValue: false }),
    __metadata("design:type", Boolean)
], User.prototype, "isDemo", void 0);
__decorate([
    HasMany(() => UserResponse),
    __metadata("design:type", Array)
], User.prototype, "responses", void 0);
__decorate([
    HasMany(() => UserVideoProgress),
    __metadata("design:type", Array)
], User.prototype, "progress", void 0);
__decorate([
    HasMany(() => CourseEnrollment),
    __metadata("design:type", Array)
], User.prototype, "enrollments", void 0);
User = __decorate([
    Table({ tableName: 'users', indexes: [{ unique: true, fields: ['email'], name: 'users_email_key' }] })
], User);
export { User };
