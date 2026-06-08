import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { Video } from './Video.js';

@Table({ tableName: 'interactive_events' })
export class InteractiveEvent extends Model {
  @Column({ type: DataType.FLOAT, allowNull: false })
  declare time: number;

  @Column({ type: DataType.STRING, allowNull: false })
  declare type: string; 

  @Column({ type: DataType.STRING, allowNull: false })
  declare question: string;

  @Column({ type: DataType.JSONB, allowNull: true })
  declare options?: any;

  @Column({ type: DataType.STRING, allowNull: true })
  declare correctAnswer?: string;
  
  @Column({ type: DataType.BOOLEAN, defaultValue: false })
  declare isStrict: boolean;

  @Column({ type: DataType.INTEGER, defaultValue: 1 })
  declare weight: number;

  @Column({ type: DataType.FLOAT, allowNull: true })
  declare rewindTo?: number;

  @Column({ type: DataType.TEXT, allowNull: true })
  declare explanation?: string;

  @Column({ type: DataType.INTEGER, defaultValue: 50 })
  declare aiThreshold: number;

  @Column({ type: DataType.INTEGER, allowNull: true })
  declare timeLimit?: number;

  @ForeignKey(() => Video)
  
  @Column({ type: DataType.INTEGER })
  declare videoId: number;

  @BelongsTo(() => Video)
  declare video: Video;
}