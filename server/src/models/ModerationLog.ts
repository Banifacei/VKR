import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { User } from './User.js';

@Table({ tableName: 'moderation_logs' })
export class ModerationLog extends Model {
    @ForeignKey(() => User)
    @Column({ type: DataType.INTEGER, allowNull: false })
    declare userId: number;

    @Column({ type: DataType.INTEGER, allowNull: true })
    declare videoId: number | null;

    @Column({ type: DataType.STRING(100), allowNull: false })
    declare word: string;

    @BelongsTo(() => User)
    declare user: User;
}
