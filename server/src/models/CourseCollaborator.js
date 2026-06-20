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
import { Course } from './Course.js';
import { User } from './User.js';
let CourseCollaborator = class CourseCollaborator extends Model {
};
__decorate([
    ForeignKey(() => Course),
    Column({ type: DataType.INTEGER, allowNull: false }),
    __metadata("design:type", Number)
], CourseCollaborator.prototype, "courseId", void 0);
__decorate([
    ForeignKey(() => User),
    Column({ type: DataType.INTEGER, allowNull: false }),
    __metadata("design:type", Number)
], CourseCollaborator.prototype, "userId", void 0);
__decorate([
    Column({ type: DataType.STRING, defaultValue: 'editor' }),
    __metadata("design:type", String)
], CourseCollaborator.prototype, "role", void 0);
__decorate([
    BelongsTo(() => Course),
    __metadata("design:type", Course)
], CourseCollaborator.prototype, "course", void 0);
__decorate([
    BelongsTo(() => User),
    __metadata("design:type", User)
], CourseCollaborator.prototype, "user", void 0);
CourseCollaborator = __decorate([
    Table({ tableName: 'course_collaborators' })
], CourseCollaborator);
export { CourseCollaborator };
