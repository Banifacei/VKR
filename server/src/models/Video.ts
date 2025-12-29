import { Table, Column, Model, DataType } from 'sequelize-typescript';

@Table({ tableName: 'videos' })
export class Video extends Model {
  @Column({ type: DataType.STRING, allowNull: false })
  title!: string;

  @Column({ type: DataType.STRING, allowNull: false })
  url!: string;

  @Column({ type: DataType.JSONB, defaultValue: [] })
  events!: any; // Интерактивные точки
}