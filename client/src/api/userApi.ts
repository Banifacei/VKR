import api from './axiosInstance';

const API_URL = 'http://localhost:5000/api/users';

const getAuthHeaders = () => {
    const token = localStorage.getItem('lumeo_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
};

// Тип пользователя для админки
export interface IAdminUser {
    id: number;
    email: string;
    firstName: string;
    lastName: string;
    role: 'student' | 'teacher' | 'admin';
    lastLogin?: string;
}

export const getAllUsers = async (): Promise<IAdminUser[]> => {
    // api уже знает baseURL и сам подставит токен!
    const response = await api.get('/users'); 
    return response.data;
};

export const changeUserRole = async (userId: number, newRole: string) => {
    const response = await api.put(`/users/${userId}/role`, { role: newRole });
    return response.data;
};

export interface IUpdateUserData {
    firstName: string;
    lastName: string;
    email: string;
    role: string;
    password?: string;
}

export const updateUser = async (userId: number, data: IUpdateUserData) => {
    const response = await api.put(`/users/${userId}`, data);
    return response.data;
};