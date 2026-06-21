import { Table, Column, Model, DataType, ForeignKey, BelongsTo, HasMany } from 'sequelize-typescript';
import { User } from './User.js';
import { Course } from './Course.js';
import { HomeworkSubmission } from './HomeworkSubmission.js';

@Table({ tableName: 'homework_assignments' })
export class HomeworkAssignment extends Model {
    // 'attached' — галочка на видео/тесте (только дедлайн, без сдачи файлов)
    // 'standalone' — отдельная карточка ДЗ в курсе (с конструктором и сдачей)
    @Column({ type: DataType.STRING(20), allowNull: false, defaultValue: 'standalone' })
    declare type: 'attached' | 'standalone';

    // Для attached: к какому элементу привязано
    @Column({ type: DataType.STRING(10), allowNull: true })
    declare entityType: 'video' | 'test' | null;

    @Column({ type: DataType.INTEGER, allowNull: true })
    declare entityId: number | null;

    @ForeignKey(() => Course)
    @Column({ type: DataType.INTEGER, allowNull: false })
    declare courseId: number;

    @BelongsTo(() => Course)
    declare course: Course;

    @Column({ type: DataType.STRING, allowNull: false })
    declare title: string;

    // Текст задания (для standalone)
    @Column({ type: DataType.TEXT, allowNull: true })
    declare description: string | null;

    // Файлы-условия от препода (для standalone): [{name, path, size, mimeType}]
    @Column({ type: DataType.JSONB, defaultValue: [] })
    declare taskFiles: { name: string; path: string; size: number; mimeType: string }[];

    // Ссылка на доп. материал (для standalone)
    @Column({ type: DataType.STRING, allowNull: true })
    declare taskLink: string | null;

    @Column({ type: DataType.DATE, allowNull: false })
    declare deadline: Date;

    @Column({ type: DataType.BOOLEAN, defaultValue: false })
    declare strictDeadline: boolean;

    @Column({ type: DataType.BOOLEAN, defaultValue: false })
    declare allowResubmit: boolean;

    // null = любые типы файлов, иначе массив расширений
    @Column({ type: DataType.JSONB, allowNull: true })
    declare allowedFileTypes: string[] | null;

    @Column({ type: DataType.BOOLEAN, defaultValue: true })
    declare showFeedbackToStudent: boolean;

    @Column({ type: DataType.JSONB, defaultValue: [] })
    declare reminderDays: number[];

    @Column({ type: DataType.INTEGER, defaultValue: 100 })
    declare maxScore: number;

    // Позиция в списке контента курса (только для standalone)
    @Column({ type: DataType.INTEGER, defaultValue: 0 })
    declare orderIndex: number;

    // false = черновик (студенты не видят, уведомлений нет)
    @Column({ type: DataType.BOOLEAN, defaultValue: false })
    declare isPublished: boolean;

    @ForeignKey(() => User)
    @Column({ type: DataType.INTEGER, allowNull: false })
    declare createdBy: number;

    @BelongsTo(() => User)
    declare creator: User;

    @HasMany(() => HomeworkSubmission)
    declare submissions: HomeworkSubmission[];

    // ── Встроенный компилятор ─────────────────────────────────────────────────
    @Column({ type: DataType.BOOLEAN, defaultValue: false })
    declare allowCodeSubmission: boolean;

    // ['python', 'javascript', 'typescript', 'java', 'c', 'c++']
    @Column({ type: DataType.JSONB, defaultValue: [] })
    declare allowedCodeLanguages: string[];

    @Column({ type: DataType.BOOLEAN, defaultValue: true })
    declare recordCodeHistory: boolean;

    // Сколько дней хранить историю ввода (null = никогда не удалять)
    @Column({ type: DataType.INTEGER, allowNull: true })
    declare codeHistoryDeleteDays: number | null;

    // Стартовый шаблон кода от преподавателя
    @Column({ type: DataType.TEXT, allowNull: true })
    declare codeTemplate: string | null;
}
