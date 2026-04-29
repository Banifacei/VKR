import { Table, Column, Model, DataType } from 'sequelize-typescript';

@Table({ tableName: 'system_settings' })
export class SystemSetting extends Model {
    @Column({ type: DataType.STRING, allowNull: false, unique: true })
    declare key: string; // Имя настройки (например: 'ldap_url')

    // 🔥 ИЗМЕНИЛИ BOOLEAN НА TEXT, чтобы хранить и адреса, и "true"/"false"
    @Column({ type: DataType.TEXT, allowNull: true })
    declare value: string; 
}