import { Table, Column, Model, DataType, ForeignKey, BelongsTo, HasMany } from 'sequelize-typescript';
import { User } from './User.js';
import { Video } from './Video.js';

@Table({ tableName: 'video_comments' })
export class VideoComment extends Model {
    @ForeignKey(() => Video)
    @Column({ type: DataType.INTEGER, allowNull: false })
    declare videoId: number;

    @ForeignKey(() => User)
    @Column({ type: DataType.INTEGER, allowNull: false })
    declare userId: number;

    @Column({ type: DataType.TEXT, allowNull: false })
    declare text: string;

    // Намеренно без @ForeignKey — self-reference ломает ALTER TABLE в PostgreSQL при alter:true
    @Column({ type: DataType.INTEGER, allowNull: true, defaultValue: null })
    declare parentId: number | null;

    @BelongsTo(() => User)
    declare user: User;

    @BelongsTo(() => Video)
    declare video: Video;

    @HasMany(() => VideoComment, { foreignKey: 'parentId', as: 'replies' })
    declare replies: VideoComment[];
}
