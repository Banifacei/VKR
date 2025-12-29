import { Sequelize } from 'sequelize-typescript';
import * as dotenv from 'dotenv';
import { Video } from '../models/Video';

dotenv.config();

const sequelize = new Sequelize({
  database: process.env.DB_NAME || 'interx_db', // Добавляем || и дефолтное значение
  dialect: 'postgres',
  username: process.env.DB_USER || 'banifacei',
  password: String(process.env.DB_PASSWORD), // Принудительное приведение к строке
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  models: [Video],
  logging: false,
});

export default sequelize;