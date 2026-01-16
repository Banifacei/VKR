import { Table, Column, Model, DataType, HasMany } from 'sequelize-typescript';
import { InteractiveEvent } from './InteractiveEvent.js';

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

  @HasMany(() => InteractiveEvent)
  declare events: InteractiveEvent[];
}