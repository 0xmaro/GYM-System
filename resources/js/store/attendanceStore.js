import { create } from 'zustand';

export const useAttendanceStore = create((set, get) => ({
  todayList: [],
  todayCount: 0,
  lastScan: null,
  scanStatus: null, // 'success' | 'error' | 'warning' | null

  addRecord: (record) => set((state) => ({
    todayList: [record, ...state.todayList],
    todayCount: state.todayCount + 1,
  })),

  setLastScan: (scanData) => set({ lastScan: scanData }),
  setScanStatus: (status) => set({ scanStatus: status }),

  clearScan: () => set({ lastScan: null, scanStatus: null }),

  setTodayList: (list) => set({
    todayList: list,
    todayCount: list.length,
  }),
}));
