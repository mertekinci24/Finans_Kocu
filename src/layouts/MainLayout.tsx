import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import TopBar from '@components/layout/TopBar';
import Sidebar from '@components/layout/Sidebar';
import CommandPalette from '@components/layout/CommandPalette';
import { useUIStore } from '@/stores/uiStore';

export default function MainLayout(): JSX.Element {
  const { resolvedTheme } = useUIStore();

  useEffect(() => {
    const html = document.documentElement;
    if (resolvedTheme === 'light') {
      html.removeAttribute('data-theme');
    } else {
      html.setAttribute('data-theme', resolvedTheme);
    }
  }, [resolvedTheme]);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      const { theme, setTheme } = useUIStore.getState();
      if (theme === 'system') setTheme('system');
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-page)' }}>
      <CommandPalette />
      <TopBar />
      <div className="flex pt-16">
        <Sidebar />
        <main className="flex-1 p-6 min-w-0 animate-fade-in">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
