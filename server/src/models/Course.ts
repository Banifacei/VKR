import { Table, Column, Model, DataType, HasMany } from 'sequelize-typescript';
import { Video } from './Video.js';

@Table({ tableName: 'courses' })
export class Course extends Model {
  @Column({ type: DataType.STRING, allowNull: false })
  declare title: string;

  @Column({ type: DataType.TEXT, allowNull: true })
  declare description: string;

  @Column({ type: DataType.STRING, allowNull: false }) // ФИО Преподавателя
  declare instructor: string;

  @Column({ type: DataType.STRING, allowNull: true }) // Ссылка на обложку (опционально)
  declare coverImage: string;

  @HasMany(() => Video)
  declare videos: Video[];
}