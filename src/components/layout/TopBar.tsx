import { useUIStore } from '@stores/index';
import { APP_NAME } from '@constants/index';
import ThemeSelector from './ThemeSelector';

export default function TopBar(): JSX.Element {
  const { toggleSidebar, setCommandPaletteOpen } = useUIStore();

  return (
    <header
      className="fixed top-0 left-0 right-0 h-16 border-b border-neutral-200 flex items-center px-4 gap-4 z-40 no-print"
      style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)' }}
    >
      <button
        onClick={toggleSidebar}
        className="p-2 hover:bg-neutral-100 rounded-md transition-colors lg:hidden"
        aria-label="Toggle menu"
      >
        <svg className="w-5 h-5 text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      <span className="text-xl font-bold text-primary-600 tracking-tight">{APP_NAME}</span>

      <button
        onClick={() => setCommandPaletteOpen(true)}
        className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-500 rounded-lg transition-colors text-sm"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <span className="text-xs">Ara...</span>
        <kbd className="text-xs bg-neutral-200 text-neutral-500 px-1 py-0.5 rounded ml-1">⌘K</kbd>
      </button>

      <button
        onClick={() => setCommandPaletteOpen(true)}
        className="sm:hidden p-2 hover:bg-neutral-100 rounded-md transition-colors"
        aria-label="Arama"
      >
        <svg className="w-5 h-5 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </button>

      <div className="flex-1" />

      <div className="flex items-center gap-2">
        <ThemeSelector />
        <div className="w-9 h-9 rounded-full bg-primary-100 text-primary-700 font-semibold flex items-center justify-center text-sm hover:bg-primary-200 transition-colors cursor-pointer select-none">
          U
        </div>
      </div>
    </header>
  );
}
