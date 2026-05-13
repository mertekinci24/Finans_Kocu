import { useState, useRef, useEffect } from 'react';
import { useUIStore } from '@stores/index';
import { APP_NAME } from '@constants/index';
import ThemeSelector from './ThemeSelector';
import { useTimeStore } from '@/stores/timeStore';
import { useAuth } from '@/hooks/useAuth';
import { authService } from '@/services/authService';
import { motion, AnimatePresence } from 'framer-motion';
import { ROUTES } from '@/constants';

export default function TopBar(): JSX.Element {
  const { toggleSidebar, setCommandPaletteOpen } = useUIStore();
  const { systemDate, setSystemDate, resetToRealTime } = useTimeStore();
  const { user } = useAuth();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isSimulated = new Date(systemDate).toDateString() !== new Date().toDateString();

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close on ESC
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsProfileOpen(false);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  const handleLogout = async () => {
    try {
      await authService.signOut();
      window.location.href = '/signin';
    } catch (err) {
      console.error('Logout error:', err);
      alert('Çıkış yapılırken bir hata oluştu.');
    }
  };

  const userInitial = user?.user_metadata?.first_name?.[0] || user?.email?.[0]?.toUpperCase() || 'U';
  const userName = user?.user_metadata?.first_name 
    ? `${user.user_metadata.first_name} ${user.user_metadata.last_name || ''}`.trim()
    : user?.email?.split('@')[0] || 'Kullanıcı';

  return (
    <header
      className={`fixed top-0 left-0 right-0 h-16 border-b flex items-center px-4 gap-4 z-40 no-print transition-colors duration-500 ${
        isSimulated ? 'bg-score-warning-bg border-score-warning/30' : 'bg-card border-border'
      }`}
    >
      <button
        onClick={toggleSidebar}
        className="p-2 hover:bg-muted rounded-md transition-colors lg:hidden"
        aria-label="Toggle menu"
      >
        <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      <div className="flex flex-col">
        <span className="text-xl font-bold text-primary tracking-tight leading-none">{APP_NAME}</span>
        {isSimulated && <span className="text-[10px] font-black text-score-warning uppercase tracking-tighter">SİMÜLASYON MODU</span>}
      </div>

      <button
        onClick={() => setCommandPaletteOpen(true)}
        className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-muted hover:bg-muted/80 text-muted-foreground rounded-lg transition-colors text-sm"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <span className="text-xs">Ara...</span>
        <kbd className="text-xs bg-card text-muted-foreground px-1 py-0.5 rounded ml-1 border border-border">⌘K</kbd>
      </button>

      <div className="flex-1" />

      {/* Time Machine UI */}
      <div className="flex items-center gap-2 bg-muted p-1 rounded-xl border border-border">
        <input 
          type="date" 
          value={new Date(systemDate).toISOString().split('T')[0]}
          onChange={(e) => setSystemDate(new Date(e.target.value))}
          className="bg-transparent text-[11px] font-bold text-foreground outline-none px-2 py-1"
        />
        {isSimulated && (
          <button 
            onClick={resetToRealTime}
            className="p-1.5 hover:bg-score-warning/20 text-score-warning rounded-lg transition-colors"
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
        
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="w-9 h-9 rounded-full bg-primary/10 text-primary font-semibold flex items-center justify-center text-sm hover:bg-primary/20 transition-all active:scale-90 select-none border border-primary/20"
          >
            {userInitial}
          </button>

          <AnimatePresence>
            {isProfileOpen && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                className="absolute top-12 right-0 w-64 bg-popover border border-border rounded-2xl shadow-2xl z-50 overflow-hidden backdrop-blur-md"
              >
                {/* User Info Header */}
                <div className="px-4 py-4 border-b border-border bg-muted/30">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/20 text-primary font-bold flex items-center justify-center text-base border border-primary/10">
                      {userInitial}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-black text-popover-foreground truncate">{userName}</span>
                      <span className="text-xs text-muted-foreground truncate">{user?.email}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="p-1.5">
                  <button
                    onClick={() => {
                      window.location.href = ROUTES.PROFILE;
                      setIsProfileOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 text-xs font-bold uppercase tracking-widest text-popover-foreground hover:bg-muted flex items-center gap-3 rounded-lg transition-colors group"
                  >
                    <span className="text-base group-hover:scale-110 transition-transform">👤</span>
                    <span>Profilim</span>
                  </button>
                  
                  <button
                    onClick={() => {
                      window.location.href = ROUTES.UPGRADE;
                      setIsProfileOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 text-xs font-bold uppercase tracking-widest text-popover-foreground hover:bg-muted flex items-center gap-3 rounded-lg transition-colors group"
                  >
                    <span className="text-base group-hover:scale-110 transition-transform">💎</span>
                    <span>Planım</span>
                  </button>

                  <button
                    onClick={() => {
                      window.location.href = ROUTES.SETTINGS;
                      setIsProfileOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 text-xs font-bold uppercase tracking-widest text-popover-foreground hover:bg-muted flex items-center gap-3 rounded-lg transition-colors group"
                  >
                    <span className="text-base group-hover:rotate-45 transition-transform duration-300">⚙️</span>
                    <span>Ayarlar</span>
                  </button>

                  <div className="my-1 border-t border-border mx-1" />

                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-3 py-2 text-xs font-bold uppercase tracking-widest text-destructive hover:bg-destructive/10 flex items-center gap-3 rounded-lg transition-colors group"
                  >
                    <span className="text-base group-hover:translate-x-0.5 transition-transform">🚪</span>
                    <span>Çıkış Yap</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
