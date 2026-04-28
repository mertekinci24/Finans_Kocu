import { create } from 'zustand';

interface TimeState {
  systemDate: Date;
  setSystemDate: (date: Date) => void;
  resetToRealTime: () => void;
}

export const useTimeStore = create<TimeState>((set) => ({
  systemDate: new Date(),
  setSystemDate: (date) => set({ systemDate: date }),
  resetToRealTime: () => set({ systemDate: new Date() }),
}));
