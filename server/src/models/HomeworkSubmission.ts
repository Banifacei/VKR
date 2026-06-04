import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { User } from './User.js';
import { HomeworkAssignment } from './HomeworkAssignment.js';

@Table({ tableName: 'homework_submissions' })
export class HomeworkSubmission extends Model {
    @ForeignKey(() => HomeworkAssignment)
    @Column({ type: DataType.INTEGER, allowNull: false })
    declare assignmentId: number;

    @BelongsTo(() => HomeworkAssignment)
    declare assignment: HomeworkAssignment;

    @ForeignKey(() => User)
    @Column({ type: DataType.INTEGER, allowNull: false })
    declare studentId: number;

    @BelongsTo(() => User, { foreignKey: 'studentId', as: 'student' })
    declare student: User;

    // [{name, path, size, mimeType}]
    @Column({ type: DataType.JSONB, defaultValue: [] })
    declare files: { name: string; path: string; size: number; mimeType: string }[];

    @Column({ type: DataType.TEXT, allowNull: true })
    declare textAnswer: string | null;

    @Column({ type: DataType.DATE, allowNull: false, defaultValue: DataType.NOW })
    declare submittedAt: Date;

    @Column({ type: DataType.BOOLEAN, defaultValue: false })
    declare isLate: boolean;

    // 'submitted' | 'graded' | 'resubmitted'
    @Column({ type: DataType.STRING, defaultValue: 'submitted' })
    declare status: string;

    @Column({ type: DataType.FLOAT, allowNull: true })
    declare grade: number | null;

    @Column({ type: DataType.TEXT, allowNull: true })
    declare teacherComment: string | null;

    @Column({ type: DataType.DATE, allowNull: true })
    declare gradedAt: Date | null;

    @ForeignKey(() => User)
    @Column({ type: DataType.INTEGER, allowNull: true })
    declare gradedBy: number | null;

    @BelongsTo(() => User, { foreignKey: 'gradedBy', as: 'grader' })
    declare grader: User;
}
