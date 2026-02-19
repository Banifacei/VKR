import { Sequelize } from 'sequelize-typescript';
import * as dotenv from 'dotenv';
import { Video } from '../models/Video.js';
import { InteractiveEvent } from '../models/InteractiveEvent.js';
import { UserResponse } from '../models/UserResponse.js';
import { Course } from '../models/Course.js';
import { User } from '../models/User.js';
import { UserVideoProgress } from '../models/UserVideoProgress.js';
import { CourseTest } from '../models/CourseTest.js';
import { TestQuestion } from '../models/TestQuestion.js';
dotenv.config();

const sequelize = new Sequelize({
  database: process.env.DB_NAME || 'vkr_db',
  dialect: 'postgres',
  username: process.env.DB_USER || 'postgres',
  password: String(process.env.DB_PASSWORD),
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  
  models: [
     Video,
     InteractiveEvent,
     UserResponse,
     Course,
     User,
     UserVideoProgress,
     CourseTest,
     TestQuestion
    ],
  
  logging: false,
});

export default sequelize;