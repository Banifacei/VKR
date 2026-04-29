import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { Course } from './Course.js';
import { User } from './User.js';

@Table({ tableName: 'course_collaborators' })
export class CourseCollaborator extends Model {
    @ForeignKey(() => Course)
    @Column({ type: DataType.INTEGER, allowNull: false })
    declare courseId: number;

    @ForeignKey(() => User)
    @Column({ type: DataType.INTEGER, allowNull: false })
    declare userId: number; 

    @Column({ type: DataType.STRING, defaultValue: 'editor' })
    declare role: string; // 'editor' (редактор) или 'viewer' (наблюдатель)

    @BelongsTo(() => Course)
    declare course: Course;

    @BelongsTo(() => User)
    declare user: User;
}