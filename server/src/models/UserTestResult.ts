import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { User } from './User.js';
import { CourseTest } from './CourseTest.js';

@Table({ tableName: 'user_test_results' })
export class UserTestResult extends Model {
  @ForeignKey(() => User)
  @Column({ type: DataType.INTEGER, allowNull: false })
  declare userId: number;

  @ForeignKey(() => CourseTest)
  @Column({ type: DataType.INTEGER, allowNull: false })
  declare testId: number;

  @Column({ type: DataType.INTEGER, allowNull: false })
  declare score: number;

  @Column({ type: DataType.JSONB, allowNull: true })
  declare answers: any;

  @BelongsTo(() => User)
  declare user: User;

  @BelongsTo(() => CourseTest)
  declare test: CourseTest;
}