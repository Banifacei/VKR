import { Table, Column, Model, DataType, HasMany } from 'sequelize-typescript';
import { UserResponse } from './UserResponse.js';
import { UserVideoProgress } from './UserVideoProgress.js';
import { CourseEnrollment } from './CourseEnrollment.js';

@Table({ tableName: 'users', indexes: [{ unique: true, fields: ['email'], name: 'users_email_key' }] })
export class User extends Model {
    @Column({ type: DataType.STRING, allowNull: false })
    declare email: string;

    @Column({ type: DataType.STRING, allowNull: false })
    declare password: string;

    @Column({ type: DataType.STRING })
    declare firstName: string;

    @Column({ type: DataType.STRING })
    declare lastName: string;

    @Column({ type: DataType.STRING })
    declare middleName: string;

    @Column({ type: DataType.STRING })
    declare phone: string;

    @Column({ type: DataType.STRING })
    declare avatarUrl: string;

    @Column({ type: DataType.STRING, defaultValue: 'student' })
    declare role: string; // 'student' | 'teacher' | 'admin'

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

    @Column({ type: DataType.STRING, allowNull: true })
    declare resetToken: string | null;

    @Column({ type: DataType.DATE, allowNull: true })
    declare resetTokenExpiry: Date | null;

    @Column({ type: DataType.STRING, allowNull: true })
    declare emailVerificationToken: string | null;

    @Column({ type: DataType.DATE, allowNull: true })
    declare emailVerificationExpiry: Date | null;

    // --- СВЯЗИ ---

    @HasMany(() => UserResponse)
    declare responses: UserResponse[];

    @HasMany(() => UserVideoProgress)
    declare progress: UserVideoProgress[];

    @HasMany(() => CourseEnrollment)
    declare enrollments: CourseEnrollment[];
}