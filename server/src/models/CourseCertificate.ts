import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { User } from './User.js';
import { Course } from './Course.js';

@Table({ tableName: 'course_certificates' })
export class CourseCertificate extends Model {
    @ForeignKey(() => User)
    @Column({ type: DataType.INTEGER, allowNull: false })
    declare userId: number;

    @ForeignKey(() => Course)
    @Column({ type: DataType.INTEGER, allowNull: false })
    declare courseId: number;

    @Column({ type: DataType.STRING, allowNull: false, unique: true })
    declare certificateId: string;

    @BelongsTo(() => User)
    declare user: User;

    @BelongsTo(() => Course)
    declare course: Course;
}
