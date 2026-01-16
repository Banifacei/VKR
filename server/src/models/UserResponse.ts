import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { InteractiveEvent } from './InteractiveEvent.js';
import { Video } from './Video.js';

@Table({ tableName: 'user_responses' })
export class UserResponse extends Model {
  @Column({ type: DataType.STRING })
  declare userId: string;

  @ForeignKey(() => Video)
  @Column({ type: DataType.INTEGER })
  declare videoId: number;

  @ForeignKey(() => InteractiveEvent)
  @Column({ type: DataType.INTEGER })
  declare eventId: number;

  @Column({ type: DataType.STRING })
  declare answer: string;

  @Column({ type: DataType.BOOLEAN })
  declare isCorrect: boolean;

  @BelongsTo(() => Video)
  declare video: Video;

  @BelongsTo(() => InteractiveEvent)
  declare event: InteractiveEvent;
}