import { Table, Column, Model, DataType, HasMany, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { Video } from './Video.js';
import { CourseTest } from './CourseTest.js';
import { User } from './User.js';

@Table({ tableName: 'courses' })
export class Course extends Model {
  @Column({ type: DataType.STRING, allowNull: false })
  declare title: string;

  @Column({ type: DataType.TEXT, allowNull: true })
  declare description: string;

  @Column({ type: DataType.STRING, allowNull: false })
  declare instructor: string;

  @Column({ type: DataType.STRING, allowNull: true })
  declare coverImage: string;

  @ForeignKey(() => User)
  @Column({ type: DataType.INTEGER, allowNull: true })
  declare ownerId: number;

  @BelongsTo(() => User)
  declare owner: User;

  @HasMany(() => Video)
  declare videos: Video[];

  @HasMany(() => CourseTest)
  declare tests: CourseTest[];
}