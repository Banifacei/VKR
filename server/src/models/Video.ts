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

  @Column({ type: DataType.INTEGER, defaultValue: 3 })
  declare maxAttempts: number;

  @Column({ type: DataType.INTEGER, defaultValue: 0 })
  declare orderIndex: number;

  @Column({ type: DataType.BOOLEAN, defaultValue: true })
  declare allowExternalTest: boolean;

  @Column({ type: DataType.BOOLEAN, defaultValue: false })
  declare isHidden: boolean;

  @Column({ type: DataType.DATE, allowNull: true })
  declare unlockDate: Date | null;

  @Column({ type: DataType.JSONB, defaultValue: [] })
  declare qualityUrls: { quality: string; url: string }[];

  @Column({ type: DataType.BOOLEAN, defaultValue: false })
  declare noForwardSeek: boolean;
}