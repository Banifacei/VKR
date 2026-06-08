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
import { UserTestResult } from '../models/UserTestResult.js';
import { SystemSetting } from '../models/SystemSetting.js';
import { CourseCollaborator } from '../models/CourseCollaborator.js';
import { CourseEnrollment } from '../models/CourseEnrollment.js';
import { Notification } from '../models/Notification.js';
import { VideoComment } from '../models/VideoComment.js';
import { CourseRating } from '../models/CourseRating.js';
import { VideoBookmark } from '../models/VideoBookmark.js';
import { BannedWord } from '../models/BannedWord.js';
import { ModerationLog } from '../models/ModerationLog.js';
import { CourseBan } from '../models/CourseBan.js';
import { HomeworkAssignment } from '../models/HomeworkAssignment.js';
import { HomeworkSubmission } from '../models/HomeworkSubmission.js';
import { CourseCertificate } from '../models/CourseCertificate.js';
dotenv.config();

const requiredEnvVars = ['DB_NAME', 'DB_USER', 'DB_PASSWORD', 'DB_HOST'];
requiredEnvVars.forEach(v => {
  if (!process.env[v]) throw new Error(`Переменная окружения ${v} не задана в .env`);
});

const sequelize = new Sequelize({
  database: process.env.DB_NAME!,
  dialect: 'postgres',
  username: process.env.DB_USER!,
  password: process.env.DB_PASSWORD!,
  host: process.env.DB_HOST!,
  port: Number(process.env.DB_PORT) || 5432,
  
  models: [
     Video,
     InteractiveEvent,
     UserResponse,
     Course,
     User,
     UserVideoProgress,
     CourseTest,
     TestQuestion,
     UserTestResult,
     SystemSetting,
     CourseCollaborator,
     CourseEnrollment,
     Notification,
     VideoComment,
     CourseRating,
     VideoBookmark,
     BannedWord,
     ModerationLog,
     CourseBan,
     HomeworkAssignment,
     HomeworkSubmission,
     CourseCertificate,
    ],
  
  logging: false,
});

export default sequelize;