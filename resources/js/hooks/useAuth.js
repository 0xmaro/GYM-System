import { useAuthStore } from '../store/authStore';

export function useAuth() {
  const { user, isAuthenticated, logout } = useAuthStore();

  const canAccess = (roles) => {
    if (!user) return false;
    if (typeof roles === 'string') return user.role === roles;
    return roles.includes(user.role);
  };

  const isAdmin = () => user?.role === 'admin';
  const isCaptain = () => user?.role === 'captain';
  const isReception = () => user?.role === 'reception';

  return { user, isAuthenticated, logout, canAccess, isAdmin, isCaptain, isReception };
}
