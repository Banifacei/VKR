import { Table, Column, Model, DataType } from 'sequelize-typescript';

@Table({ tableName: 'system_settings' })
export class SystemSetting extends Model {
    @Column({ type: DataType.STRING, allowNull: false, unique: true })
    declare key: string; // Имя настройки (например: 'registration_requires_approval')

    @Column({ type: DataType.BOOLEAN, defaultValue: false })
    declare value: boolean; // Включена или выключена
}