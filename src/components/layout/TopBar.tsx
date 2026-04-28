import { useUIStore } from '@stores/index';
import { APP_NAME } from '@constants/index';
import ThemeSelector from './ThemeSelector';
import { useTimeStore } from '@/stores/timeStore';

export default function TopBar(): JSX.Element {
  const { toggleSidebar, setCommandPaletteOpen } = useUIStore();
  const { systemDate, setSystemDate, resetToRealTime } = useTimeStore();

  const isSimulated = new Date(systemDate).toDateString() !== new Date().toDateString();

  return (
    <header
      className={`fixed top-0 left-0 right-0 h-16 border-b flex items-center px-4 gap-4 z-40 no-print transition-colors duration-500 ${
        isSimulated ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800' : 'bg-white dark:bg-slate-900 border-neutral-200 dark:border-neutral-800'
      }`}
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

      <div className="flex flex-col">
        <span className="text-xl font-bold text-primary-600 tracking-tight leading-none">{APP_NAME}</span>
        {isSimulated && <span className="text-[10px] font-black text-amber-600 dark:text-amber-500 uppercase tracking-tighter">SİMÜLASYON MODU</span>}
      </div>

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

      <div className="flex-1" />

      {/* Time Machine UI */}
      <div className="flex items-center gap-2 bg-neutral-100 dark:bg-zinc-800/50 p-1 rounded-xl border border-neutral-200 dark:border-zinc-800">
        <input 
          type="date" 
          value={new Date(systemDate).toISOString().split('T')[0]}
          onChange={(e) => setSystemDate(new Date(e.target.value))}
          className="bg-transparent text-[11px] font-bold text-neutral-600 dark:text-zinc-300 outline-none px-2 py-1"
        />
        {isSimulated && (
          <button 
            onClick={resetToRealTime}
            className="p-1.5 hover:bg-amber-200 dark:hover:bg-amber-900/50 text-amber-700 dark:text-amber-500 rounded-lg transition-colors"
            title="Gerçek zamana dön"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        )}
      </div>

      <div className="flex items-center gap-2">
        <ThemeSelector />
        <div className="w-9 h-9 rounded-full bg-primary-100 text-primary-700 font-semibold flex items-center justify-center text-sm hover:bg-primary-200 transition-colors cursor-pointer select-none">
          U
        </div>
      </div>
    </header>
  );
}
