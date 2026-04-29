import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { User } from './User.js';

@Table({ tableName: 'notifications' })
export class Notification extends Model {
    @ForeignKey(() => User)
    @Column({ type: DataType.INTEGER, allowNull: false })
    declare userId: number;

    @Column({ type: DataType.STRING, allowNull: false })
    declare type: string; // enrollment_approved | enrollment_rejected | new_content | course_request | course_completed

    @Column({ type: DataType.STRING, allowNull: false })
    declare title: string;

    @Column({ type: DataType.TEXT, allowNull: false })
    declare message: string;

    @Column({ type: DataType.STRING, allowNull: true })
    declare link: string | null;

    @Column({ type: DataType.BOOLEAN, defaultValue: false })
    declare isRead: boolean;

    @BelongsTo(() => User)
    declare user: User;
}
