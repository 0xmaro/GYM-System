import { create } from 'zustand';

export const useNotificationStore = create((set) => ({
  alerts: [],
  unreadCount: 0,

  addAlert: (alert) => set((state) => ({
    alerts: [{ ...alert, id: Date.now(), read: false }, ...state.alerts],
    unreadCount: state.unreadCount + 1,
  })),

  markRead: (id) => set((state) => ({
    alerts: state.alerts.map(a => a.id === id ? { ...a, read: true } : a),
    unreadCount: Math.max(0, state.unreadCount - 1),
  })),

  markAllRead: () => set((state) => ({
    alerts: state.alerts.map(a => ({ ...a, read: true })),
    unreadCount: 0,
  })),

  dismiss: (id) => set((state) => ({
    alerts: state.alerts.filter(a => a.id !== id),
  })),
}));
