import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { User } from './User.js';
import { Video } from './Video.js';

@Table({ tableName: 'user_video_progress' })
export class UserVideoProgress extends Model {
  @ForeignKey(() => User)
  @Column({ type: DataType.INTEGER, allowNull: false })
  declare userId: number;

  @ForeignKey(() => Video)
  @Column({ type: DataType.INTEGER, allowNull: false })
  declare videoId: number;

  @Column({ type: DataType.FLOAT, defaultValue: 0 })
  declare lastTime: number;

  @Column({ type: DataType.BOOLEAN, defaultValue: false })
  declare isWatched: boolean;

  @BelongsTo(() => User)
  declare user: User;

  @BelongsTo(() => Video)
  declare video: Video;

  @Column({ type: DataType.INTEGER, defaultValue: 0 })
  declare attemptsUsed: number;
}