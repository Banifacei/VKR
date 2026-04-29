import { Table, Column, Model, DataType } from 'sequelize-typescript';

@Table({ tableName: 'banned_words' })
export class BannedWord extends Model {
    @Column({ type: DataType.STRING(100), allowNull: false, unique: true })
    declare word: string;
}
