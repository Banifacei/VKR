import { Table, Column, Model, DataType, ForeignKey, BelongsTo, Unique } from 'sequelize-typescript';
import { User } from './User.js';
import { Course } from './Course.js';

@Table({ tableName: 'course_ratings', indexes: [{ unique: true, fields: ['courseId', 'userId'] }] })
export class CourseRating extends Model {
    @ForeignKey(() => Course)
    @Column({ type: DataType.INTEGER, allowNull: false })
    declare courseId: number;

    @ForeignKey(() => User)
    @Column({ type: DataType.INTEGER, allowNull: false })
    declare userId: number;

    @Column({ type: DataType.INTEGER, allowNull: false })
    declare rating: number; // 1–5

    @Column({ type: DataType.TEXT, allowNull: true })
    declare review: string | null;

    @BelongsTo(() => User)
    declare user: User;

    @BelongsTo(() => Course)
    declare course: Course;
}
