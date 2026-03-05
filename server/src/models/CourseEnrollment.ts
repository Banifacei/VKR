import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { User } from './User.js';
import { Course } from './Course.js';

@Table({ tableName: 'course_enrollments' })
export class CourseEnrollment extends Model {
    @ForeignKey(() => User)
    @Column({ type: DataType.INTEGER, allowNull: false })
    declare userId: number;

    @ForeignKey(() => Course)
    @Column({ type: DataType.INTEGER, allowNull: false })
    declare courseId: number;

    // Статусы: 'pending' (ожидает), 'approved' (зачислен), 'rejected' (отклонен)
    @Column({ type: DataType.STRING, defaultValue: 'pending' })
    declare status: string; 

    @BelongsTo(() => User)
    declare user: User;

    @BelongsTo(() => Course)
    declare course: Course;
}