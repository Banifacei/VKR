import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { User } from './User.js';
import { Course } from './Course.js';

@Table({ tableName: 'course_bans' })
export class CourseBan extends Model {
    @ForeignKey(() => Course)
    @Column({ type: DataType.INTEGER, allowNull: false })
    declare courseId: number;

    @ForeignKey(() => User)
    @Column({ type: DataType.INTEGER, allowNull: false })
    declare userId: number;

    @Column({ type: DataType.TEXT, allowNull: true })
    declare reason: string;

    @ForeignKey(() => User)
    @Column({ type: DataType.INTEGER, allowNull: true })
    declare bannedBy: number;

    @BelongsTo(() => Course)
    declare course: Course;

    @BelongsTo(() => User, 'userId')
    declare user: User;
}
