// resources/js/lib/classes.js
import api from './api';

export const classApi = {
  getAll: async () => {
    const { data } = await api.get('/classes');
    return data;
  },

  getToday: async (date = null) => {
    const { data } = await api.get('/classes/today', {
      params: date ? { date } : {},
    });
    return data;
  },

  getAttendees: async (classId, date = null) => {
    const { data } = await api.get(`/classes/${classId}/attendees`, {
      params: date ? { date } : {},
    });
    return data;
  },

  create: async (payload) => {
    const { data } = await api.post('/classes', payload);
    return data;
  },

  update: async (id, payload) => {
    const { data } = await api.put(`/classes/${id}`, payload);
    return data;
  },

  remove: async (id) => {
    const { data } = await api.delete(`/classes/${id}`);
    return data;
  },
};
