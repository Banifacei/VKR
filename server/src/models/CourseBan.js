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
import { Course } from './Course.js';
let CourseBan = class CourseBan extends Model {
};
__decorate([
    ForeignKey(() => Course),
    Column({ type: DataType.INTEGER, allowNull: false }),
    __metadata("design:type", Number)
], CourseBan.prototype, "courseId", void 0);
__decorate([
    ForeignKey(() => User),
    Column({ type: DataType.INTEGER, allowNull: false }),
    __metadata("design:type", Number)
], CourseBan.prototype, "userId", void 0);
__decorate([
    Column({ type: DataType.TEXT, allowNull: true }),
    __metadata("design:type", String)
], CourseBan.prototype, "reason", void 0);
__decorate([
    ForeignKey(() => User),
    Column({ type: DataType.INTEGER, allowNull: true }),
    __metadata("design:type", Number)
], CourseBan.prototype, "bannedBy", void 0);
__decorate([
    BelongsTo(() => Course),
    __metadata("design:type", Course)
], CourseBan.prototype, "course", void 0);
__decorate([
    BelongsTo(() => User, 'userId'),
    __metadata("design:type", User)
], CourseBan.prototype, "user", void 0);
CourseBan = __decorate([
    Table({ tableName: 'course_bans' })
], CourseBan);
export { CourseBan };
