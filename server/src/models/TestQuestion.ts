import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { CourseTest } from './CourseTest.js';

@Table({ tableName: 'test_questions' })
export class TestQuestion extends Model {
  @Column({ type: DataType.STRING, allowNull: false })
  declare type: string; // 'single_choice', 'multiple_choice', 'free_text'

  @Column({ type: DataType.TEXT, allowNull: false })
  declare text: string;

  @Column({ type: DataType.JSONB, allowNull: true })
  declare options?: any;

  @Column({ type: DataType.TEXT, allowNull: true })
  declare correctAnswer?: string;

  @Column({ type: DataType.INTEGER, defaultValue: 1 })
  declare weight: number;

  @Column({ type: DataType.INTEGER, defaultValue: 50 })
  declare aiThreshold: number;

  @ForeignKey(() => CourseTest)
  @Column({ type: DataType.INTEGER, allowNull: false })
  declare testId: number;

  @BelongsTo(() => CourseTest)
  declare test: CourseTest;
}