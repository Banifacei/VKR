import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { InteractiveEvent } from './InteractiveEvent.js';
import { Video } from './Video.js';
import { User } from './User.js';
@Table({ tableName: 'user_responses' })
export class UserResponse extends Model {
  @ForeignKey(() => User)
  @Column({ type: DataType.INTEGER })
  declare userId: number;

  @BelongsTo(() => User)
  declare user: User;

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

  @Column({ type: DataType.INTEGER, allowNull: true })
  declare similarity: number | null;

  @BelongsTo(() => Video)
  declare video: Video;

  @BelongsTo(() => InteractiveEvent)
  declare event: InteractiveEvent;
}