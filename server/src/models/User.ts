import { Table, Column, Model, DataType, HasMany } from 'sequelize-typescript';
import { UserResponse } from './UserResponse.js';

@Table({ tableName: 'users' })
export class User extends Model {
  @Column({ type: DataType.STRING, allowNull: false })
  declare firstName: string;

  @Column({ type: DataType.STRING, allowNull: false })
  declare lastName: string;

  @Column({ type: DataType.STRING, allowNull: true })
  declare middleName: string;

  // Email уникальный
  @Column({ type: DataType.STRING, unique: true, allowNull: false })
  declare email: string;

  // Телефон тоже уникальный, но может быть null (если не указан)
  @Column({ type: DataType.STRING, unique: true, allowNull: true })
  declare phone: string;

  @Column({ type: DataType.STRING, allowNull: false })
  declare passwordHash: string;

  @Column({ type: DataType.STRING, defaultValue: 'student' })
  declare role: 'student' | 'teacher' | 'admin';

  @Column({ type: DataType.STRING, allowNull: true })
  declare avatarUrl: string;

  @HasMany(() => UserResponse)
  declare responses: UserResponse[];
}