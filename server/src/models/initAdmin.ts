import bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { User } from '../models/User.js';

export const createDefaultAdmin = async () => {
    try {
        // Проверяем, есть ли в базе хотя бы один пользователь с ролью 'admin'
        const adminExists = await User.findOne({ where: { role: 'admin' } });

        if (!adminExists) {
            console.log('⚠️ Администратор не найден. Создаю дефолтного root-пользователя...');

            let adminPassword = process.env.ADMIN_PASSWORD;
            if (!adminPassword) {
                adminPassword = randomBytes(16).toString('hex');
                console.warn(`\n⚠️  ADMIN_PASSWORD не задан в .env — сгенерирован случайный пароль.\n    Логин:  admin@lumeo.local\n    Пароль: ${adminPassword}\n    Сохраните его и смените через профиль!\n`);
            }
            const hashedPassword = await bcrypt.hash(adminPassword, 10);

            await User.create({
                firstName: 'Root',
                lastName: 'Admin',
                email: 'admin@lumeo.local',
                phone: '+70000000000',
                password: hashedPassword,
                role: 'admin',
                status: 'active'
            });

            console.log('✅ Дефолтный администратор создан. Логин: admin@lumeo.local');
        }
    } catch (error) {
        console.error('❌ Ошибка при создании дефолтного администратора:', error);
    }
};