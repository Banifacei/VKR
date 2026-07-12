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

    // ── Сдача кода ────────────────────────────────────────────────────────────
    @Column({ type: DataType.STRING(20), allowNull: true })
    declare codeLanguage: string | null;

    @Column({ type: DataType.TEXT, allowNull: true })
    declare codeContent: string | null;

    @Column({ type: DataType.TEXT, allowNull: true })
    declare codeLastOutput: string | null;

    // JSON array [{ts, code}] или base64(gzip(JSON)) если compressed
    @Column({ type: DataType.TEXT, allowNull: true })
    declare codeHistory: string | null;

    @Column({ type: DataType.BOOLEAN, defaultValue: false })
    declare codeHistoryCompressed: boolean;

    // Когда удалить историю (вычисляется: submittedAt + assignment.codeHistoryDeleteDays)
    @Column({ type: DataType.DATE, allowNull: true })
    declare codeHistoryDeleteAt: Date | null;

    // Результаты автопроверки по тест-кейсам: [{id, passed, actualOutput, error?, isHidden}]
    @Column({ type: DataType.JSONB, allowNull: true })
    declare testResults: { id: string; passed: boolean; actualOutput: string; error?: string; isHidden: boolean }[] | null;

    // Автооценка по результатам тест-кейсов (препод может переопределить полем grade)
    @Column({ type: DataType.FLOAT, allowNull: true })
    declare autoGrade: number | null;

    // Отмеченные критерии рубрики при проверке: [{id, checked}] — только подсказка,
    // итоговую оценку препод всё равно ставит сам в поле grade
    @Column({ type: DataType.JSONB, allowNull: true })
    declare rubricChecks: { id: string; checked: boolean }[] | null;

    // % косинусного сходства textAnswer с assignment.referenceAnswer (ИИ-проверка).
    // autoGrade при этом = round(aiSimilarity/100 * maxScore) — тоже лишь подсказка
    @Column({ type: DataType.FLOAT, allowNull: true })
    declare aiSimilarity: number | null;
}
