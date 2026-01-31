import { Table, Column, Model, DataType, HasMany, ForeignKey, BelongsTo} from 'sequelize-typescript';
import { InteractiveEvent } from './InteractiveEvent.js';
import { Course } from './Course.js';

@Table({ tableName: 'videos' })
export class Video extends Model {
  @Column({ type: DataType.STRING, allowNull: false })
  declare title: string;

  @Column({ type: DataType.STRING, allowNull: false })
  declare url: string;

  @Column({ type: DataType.JSONB, defaultValue: [] })
  declare subtitles: any;

  @Column({ type: DataType.BOOLEAN, defaultValue: false })
  declare hideResults: boolean;

  @ForeignKey(() => Course)
  @Column({ type: DataType.INTEGER, allowNull: true })
  declare courseId: number;

  @BelongsTo(() => Course)
  declare course: Course;


  @HasMany(() => InteractiveEvent)
  declare events: InteractiveEvent[];
}