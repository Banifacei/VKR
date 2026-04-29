import api from './axiosInstance';

// Тип пользователя для админки
export interface IAdminUser {
    id: number;
    email: string;
    firstName: string;
    lastName: string;
    middleName?: string;
    phone?: string;
    role: 'student' | 'teacher' | 'admin';
    status?: string;
    lastLogin?: string;
    avatarUrl?: string;
    authProvider?: 'local' | 'yandex' | 'google' | 'ldap' | 'saml';
}

export interface IUsersPage {
    users: IAdminUser[];
    total: number;
    page: number;
    totalPages: number;
    byRole: { student: number; teacher: number; admin: number };
}

export const getAllUsers = async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
    provider?: string;
}): Promise<IUsersPage> => {
    const response = await api.get('/users', { params });
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

export const banUser = async (userId: number, reason?: string) => {
    const response = await api.post(`/users/${userId}/ban`, { reason });
    return response.data;
};

export const unbanUser = async (userId: number) => {
    const response = await api.post(`/users/${userId}/unban`);
    return response.data;
};