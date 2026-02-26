import api from './axiosInstance';

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

export const createUser = async (data: IUpdateUserData) => {
    const response = await api.post(`/users`, data);
    return response.data;
};

export const deleteUser = async (userId: number) => {
    const response = await api.delete(`/users/${userId}`);
    return response.data;
};