import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'light' | 'dark' | 'amoled' | 'system';
export type ResolvedTheme = 'light' | 'dark' | 'amoled';

interface UIState {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  sidebarOpen: boolean;
  isLoading: boolean;
  commandPaletteOpen: boolean;
  setTheme: (theme: Theme) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setIsLoading: (loading: boolean) => void;
  setCommandPaletteOpen: (open: boolean) => void;
}

function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function resolveTheme(theme: Theme): ResolvedTheme {
  if (theme === 'system') return getSystemTheme();
  return theme;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      theme: 'system',
      resolvedTheme: resolveTheme('system'),
      sidebarOpen: true,
      isLoading: false,
      commandPaletteOpen: false,
      setTheme: (theme) =>
        set({ theme, resolvedTheme: resolveTheme(theme) }),
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      setIsLoading: (loading) => set({ isLoading: loading }),
      setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
    }),
    {
      name: 'finanskocu-ui',
      partialize: (state) => ({ theme: state.theme }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.resolvedTheme = resolveTheme(state.theme);
        }
      },
    }
  )
);
