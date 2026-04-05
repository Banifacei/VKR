import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { User } from './User.js';
import { Video } from './Video.js';

@Table({ tableName: 'video_bookmarks' })
export class VideoBookmark extends Model {
    @ForeignKey(() => Video)
    @Column({ type: DataType.INTEGER, allowNull: false })
    declare videoId: number;

    @ForeignKey(() => User)
    @Column({ type: DataType.INTEGER, allowNull: false })
    declare userId: number;

    @Column({ type: DataType.FLOAT, allowNull: false })
    declare timestamp: number; // секунды

    @Column({ type: DataType.TEXT, allowNull: true })
    declare note: string | null;

    @BelongsTo(() => User)
    declare user: User;

    @BelongsTo(() => Video)
    declare video: Video;
}
