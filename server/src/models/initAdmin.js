import bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { User } from '../models/User.js';
import { SystemSetting } from '../models/SystemSetting.js';
export const createDefaultAdmin = async () => {
    try {
        const adminExists = await User.findOne({ where: { role: 'admin' } });
        if (adminExists)
            return;
        console.log('⚠️ Администратор не найден. Создаю из переменных окружения...');
        let adminPassword = process.env.ADMIN_PASSWORD;
        if (!adminPassword) {
            adminPassword = randomBytes(16).toString('hex');
            console.warn(`\n⚠️  ADMIN_PASSWORD не задан — сгенерирован случайный пароль: ${adminPassword}\n    Сохраните его!\n`);
        }
        const hashedPassword = await bcrypt.hash(adminPassword, 10);
        await User.create({
            firstName: process.env.ADMIN_FIRST_NAME || 'Root',
            lastName: process.env.ADMIN_LAST_NAME || 'Admin',
            email: process.env.ADMIN_EMAIL || 'admin@lumeo.local',
            phone: '+70000000000',
            password: hashedPassword,
            role: 'admin',
            status: 'active',
        });
        console.log(`✅ Администратор создан: ${process.env.ADMIN_EMAIL || 'admin@lumeo.local'}`);
    }
    catch (error) {
        console.error('❌ Ошибка при создании администратора:', error);
    }
};
export const createDemoUser = async () => {
    try {
        const existing = await User.findOne({ where: { isDemo: true } });
        if (existing)
            return;
        const password = await bcrypt.hash(randomBytes(32).toString('hex'), 10);
        await User.create({
            firstName: 'Демо',
            lastName: 'Пользователь',
            email: 'demo@lumeo.local',
            phone: '+70000000000',
            password,
            role: 'teacher',
            status: 'active',
            isDemo: true,
            onboardingCompleted: true,
        });
        await SystemSetting.findOrCreate({ where: { key: 'demo_mode_enabled' }, defaults: { value: 'false' } });
        console.log('✅ Demo-пользователь создан: demo@lumeo.local');
    }
    catch (error) {
        console.error('❌ Ошибка при создании demo-пользователя:', error);
    }
};
