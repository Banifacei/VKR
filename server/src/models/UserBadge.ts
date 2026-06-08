import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { User } from './User.js';

export type BadgeType = 'first_course' | 'five_courses' | 'perfect_score' | 'speedster' | 'punctual';

@Table({ tableName: 'user_badges' })
export class UserBadge extends Model {
    @ForeignKey(() => User)
    @Column({ type: DataType.INTEGER, allowNull: false })
    declare userId: number;

    @Column({ type: DataType.STRING, allowNull: false })
    declare badgeType: BadgeType;

    @BelongsTo(() => User)
    declare user: User;
}
