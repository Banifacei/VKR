import bcrypt from 'bcrypt';
import { User } from '../models/User.js';

export const createDefaultAdmin = async () => {
    try {
        // Проверяем, есть ли в базе хотя бы один пользователь с ролью 'admin'
        const adminExists = await User.findOne({ where: { role: 'admin' } });

        if (!adminExists) {
            console.log('⚠️ Администратор не найден. Создаю дефолтного root-пользователя...');
            
            const hashedPassword = await bcrypt.hash('admin', 10); // Пароль по умолчанию

            await User.create({
                firstName: 'Root',
                lastName: 'Admin',
                email: 'admin@lumeo.local', // Логин по умолчанию
                phone: '+70000000000',
                password: hashedPassword,
                role: 'admin',
                status: 'active'
            });

            console.log('✅ Дефолтный администратор успешно создан!');
            console.log('👉 Логин (Email): admin@lumeo.local');
            console.log('👉 Пароль: admin');
        }
    } catch (error) {
        console.error('❌ Ошибка при создании дефолтного администратора:', error);
    }
};