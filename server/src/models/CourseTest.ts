import { Table, Column, Model, DataType, ForeignKey, BelongsTo, HasMany } from 'sequelize-typescript';
import { Course } from './Course.js';
import { TestQuestion } from './TestQuestion.js';

@Table({ tableName: 'course_tests' })
export class CourseTest extends Model {
  @Column({ type: DataType.STRING, allowNull: false })
  declare title: string;

  @Column({ type: DataType.TEXT, allowNull: true })
  declare description: string;

  @Column({ type: DataType.INTEGER, defaultValue: 3 })
  declare maxAttempts: number; // Лимит попыток

  @Column({ type: DataType.INTEGER, defaultValue: 80 })
  declare passingScore: number; // Процент для сдачи (например, 80%)

  @ForeignKey(() => Course)
  @Column({ type: DataType.INTEGER, allowNull: false })
  declare courseId: number;

  @BelongsTo(() => Course)
  declare course: Course;

  @HasMany(() => TestQuestion)
  declare questions: TestQuestion[];
}