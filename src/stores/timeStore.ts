import { create } from 'zustand';
import { todayLocal } from '@/utils/dateUtils';

interface TimeState {
  systemDate: Date;
  setSystemDate: (date: Date) => void;
  resetToRealTime: () => void;
}

export const useTimeStore = create<TimeState>((set) => ({
  systemDate: todayLocal(),
  setSystemDate: (date) => set({ systemDate: date }),
  resetToRealTime: () => set({ systemDate: todayLocal() }),
}));

