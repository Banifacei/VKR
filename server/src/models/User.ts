import { Table, Column, Model, DataType, HasMany } from 'sequelize-typescript';
import { UserResponse } from './UserResponse.js';
import { UserVideoProgress } from './UserVideoProgress.js';
import { CourseEnrollment } from './CourseEnrollment.js';

@Table({ tableName: 'users' })
export class User extends Model {
    @Column({ type: DataType.STRING, allowNull: false, unique: true })
    declare email: string;

    @Column({ type: DataType.STRING, allowNull: false })
    declare password: string;

    @Column({ type: DataType.STRING })
    declare firstName: string;

    @Column({ type: DataType.STRING })
    declare lastName: string;

    // --- НОВЫЕ ПОЛЯ ---
    
    @Column({ type: DataType.STRING })
    declare middleName: string;

    @Column({ type: DataType.STRING })
    declare phone: string;

    @Column({ type: DataType.STRING })
    declare avatarUrl: string;

    @Column({ type: DataType.STRING, defaultValue: 'student' })
    declare role: string; // 'student' | 'teacher' | 'admin'

    // 🔥 НОВОЕ ПОЛЕ: Статус аккаунта
    @Column({ type: DataType.STRING, defaultValue: 'active' })
    declare status: string; // 'pending' | 'active' | 'rejected' | 'banned'

    @Column({ type: DataType.TEXT, allowNull: true })
    declare banReason: string | null;

    @Column({ type: DataType.DATE })
    declare lastLogin: Date;

    // Провайдер аутентификации: local | yandex | google | ldap | saml
    @Column({ type: DataType.STRING, defaultValue: 'local' })
    declare authProvider: string;

    @Column({ type: DataType.JSONB, defaultValue: {} })
    declare themeConfig: object; // { scheme, bgPattern, density }

    // --- СВЯЗИ ---

    @HasMany(() => UserResponse)
    declare responses: UserResponse[];

    @HasMany(() => UserVideoProgress)
    declare progress: UserVideoProgress[];

    @HasMany(() => CourseEnrollment)
    declare enrollments: CourseEnrollment[];
}