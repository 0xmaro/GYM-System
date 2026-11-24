import { create } from 'zustand';
import api from '../lib/api';

let fetchUserPromise = null; // ✅ منع parallel requests

export const useAuthStore = create((set, get) => ({
    user: null,
    token: localStorage.getItem('token') || null,
    isAuthenticated: !!localStorage.getItem('token'),

    login: async (phone, password) => {
        await api.get('/sanctum/csrf-cookie');
        const response = await api.post('/auth/login', {
            phone,
            password,
            device_name: 'Web Browser'
        });
        const { token, user } = response.data;
        localStorage.setItem('token', token);
        set({ user, token, isAuthenticated: true });
        return user;
    },

    logout: async () => {
        try {
            await api.post('/auth/logout');
        } catch (e) {
            console.error(e);
        } finally {
            localStorage.removeItem('token');
            set({ user: null, token: null, isAuthenticated: false });
            window.location.href = '/login';
        }
    },

    fetchUser: async () => {
        // ✅ لو مفيش token — مش هيبعت request خالص
        const token = localStorage.getItem('token');
        if (!token) {
            set({ user: null, isAuthenticated: false });
            return;
        }

        // ✅ لو user موجود — مش هيبعت request تاني
        if (get().user) return;

        // ✅ لو في request جارية — استنى نفس الـ promise (مش request جديدة)
        if (fetchUserPromise) return fetchUserPromise;

        fetchUserPromise = api.get('/auth/me')
            .then(response => {
                set({ user: response.data.data, isAuthenticated: true });
            })
            .catch(() => {
                localStorage.removeItem('token');
                set({ user: null, token: null, isAuthenticated: false });
            })
            .finally(() => {
                fetchUserPromise = null;
            });

        return fetchUserPromise;
    },

    canAccess: (allowedRoles) => {
        const { user } = useAuthStore.getState();
        if (!user) return false;
        if (!allowedRoles || allowedRoles.length === 0) return true;
        return allowedRoles.includes(user.role);
    }
}));
