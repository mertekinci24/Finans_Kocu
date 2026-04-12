import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useUIStore } from '@/stores/uiStore';
import { ROUTES } from '@/constants';

interface Command {
  id: string;
  label: string;
  description?: string;
  icon: JSX.Element;
  action: () => void;
  keywords: string[];
}

export default function CommandPalette(): JSX.Element {
  const { commandPaletteOpen, setCommandPaletteOpen, setTheme } = useUIStore();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const navIcon = (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
    </svg>
  );

  const go = useCallback(
    (path: string) => {
      navigate(path);
      setCommandPaletteOpen(false);
    },
    [navigate, setCommandPaletteOpen]
  );

  const commands: Command[] = [
    { id: 'dashboard',     label: 'Kontrol Paneli',  description: 'Dashboard',   icon: navIcon, action: () => go(ROUTES.DASHBOARD),     keywords: ['panel', 'dashboard', 'ana'] },
    { id: 'accounts',      label: 'Hesaplarım',      description: 'Hesap yönet', icon: navIcon, action: () => go(ROUTES.ACCOUNTS),      keywords: ['hesap', 'banka', 'kart'] },
    { id: 'transactions',  label: 'İşlemler',        description: 'İşlem listesi', icon: navIcon, action: () => go(ROUTES.TRANSACTIONS), keywords: ['işlem', 'gider', 'gelir', 'transaction'] },
    { id: 'debts',         label: 'Borçlar',         description: 'Borç takibi', icon: navIcon, action: () => go(ROUTES.DEBTS),         keywords: ['borç', 'kredi', 'debt'] },
    { id: 'installments',  label: 'Taksitler',       description: 'Taksit merkezi', icon: navIcon, action: () => go(ROUTES.INSTALLMENTS), keywords: ['taksit', 'ödeme'] },
    {
      id: 'theme-dark',    label: 'Koyu Tema',       description: 'Dark mode',
      icon: <span className="text-sm">🌙</span>,
      action: () => { setTheme('dark'); setCommandPaletteOpen(false); },
      keywords: ['tema', 'dark', 'koyu', 'gece'],
    },
    {
      id: 'theme-light',   label: 'Açık Tema',       description: 'Light mode',
      icon: <span className="text-sm">☀️</span>,
      action: () => { setTheme('light'); setCommandPaletteOpen(false); },
      keywords: ['tema', 'light', 'açık', 'gündüz'],
    },
    {
      id: 'theme-amoled',  label: 'AMOLED Tema',     description: 'Saf siyah',
      icon: <span className="text-sm">⚫</span>,
      action: () => { setTheme('amoled'); setCommandPaletteOpen(false); },
      keywords: ['tema', 'amoled', 'siyah', 'black'],
    },
    {
      id: 'theme-system',  label: 'Sistem Teması',   description: 'Otomatik tema',
      icon: <span className="text-sm">💻</span>,
      action: () => { setTheme('system'); setCommandPaletteOpen(false); },
      keywords: ['tema', 'sistem', 'system', 'otomatik'],
    },
  ];

  const filtered = query.trim()
    ? commands.filter(
        (c) =>
          c.label.toLowerCase().includes(query.toLowerCase()) ||
          c.keywords.some((k) => k.includes(query.toLowerCase()))
      )
    : commands;

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    if (commandPaletteOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
    }
  }, [commandPaletteOpen]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(!commandPaletteOpen);
      }
      if (!commandPaletteOpen) return;
      if (e.key === 'Escape') { setCommandPaletteOpen(false); }
      if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex((i) => Math.min(i + 1, filtered.length - 1)); }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setActiveIndex((i) => Math.max(i - 1, 0)); }
      if (e.key === 'Enter')     { filtered[activeIndex]?.action(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [commandPaletteOpen, filtered, activeIndex, setCommandPaletteOpen]);

  return (
    <AnimatePresence>
      {commandPaletteOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]"
          onClick={() => setCommandPaletteOpen(false)}
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -8 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden border border-neutral-200"
          >
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-neutral-100">
              <svg className="w-4 h-4 text-neutral-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                ref={inputRef}
                type="text"
                placeholder="Komut veya sayfa ara..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="flex-1 text-sm bg-transparent outline-none text-neutral-900 placeholder-neutral-400"
              />
              <kbd className="text-xs text-neutral-400 bg-neutral-100 px-1.5 py-0.5 rounded">Esc</kbd>
            </div>

            <div className="max-h-72 overflow-y-auto py-1">
              {filtered.length === 0 ? (
                <div className="px-4 py-6 text-sm text-neutral-500 text-center">Sonuç bulunamadı</div>
              ) : (
                filtered.map((cmd, idx) => (
                  <button
                    key={cmd.id}
                    onClick={cmd.action}
                    onMouseEnter={() => setActiveIndex(idx)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                      idx === activeIndex ? 'bg-primary-50 text-primary-700' : 'text-neutral-700 hover:bg-neutral-50'
                    }`}
                  >
                    <span className={`flex-shrink-0 ${idx === activeIndex ? 'text-primary-500' : 'text-neutral-400'}`}>
                      {cmd.icon}
                    </span>
                    <div>
                      <div className="text-sm font-medium">{cmd.label}</div>
                      {cmd.description && (
                        <div className="text-xs text-neutral-400">{cmd.description}</div>
                      )}
                    </div>
                    {idx === activeIndex && (
                      <kbd className="ml-auto text-xs text-primary-400 bg-primary-100 px-1.5 py-0.5 rounded">↵</kbd>
                    )}
                  </button>
                ))
              )}
            </div>

            <div className="flex items-center gap-3 px-4 py-2.5 border-t border-neutral-100 bg-neutral-50">
              <span className="text-xs text-neutral-400">
                <kbd className="bg-neutral-200 text-neutral-600 px-1 py-0.5 rounded text-xs">↑↓</kbd> seç
              </span>
              <span className="text-xs text-neutral-400">
                <kbd className="bg-neutral-200 text-neutral-600 px-1 py-0.5 rounded text-xs">↵</kbd> aç
              </span>
              <span className="text-xs text-neutral-400 ml-auto">
                <kbd className="bg-neutral-200 text-neutral-600 px-1 py-0.5 rounded text-xs">⌘K</kbd> aç/kapat
              </span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
