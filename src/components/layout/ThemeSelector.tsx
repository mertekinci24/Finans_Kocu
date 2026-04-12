import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUIStore, type Theme } from '@/stores/uiStore';

const THEMES: { value: Theme; label: string; icon: string }[] = [
  { value: 'system', label: 'Sistem', icon: '💻' },
  { value: 'light',  label: 'Açık',   icon: '☀️' },
  { value: 'dark',   label: 'Koyu',   icon: '🌙' },
  { value: 'amoled', label: 'AMOLED', icon: '⚫' },
];

export default function ThemeSelector(): JSX.Element {
  const { theme, setTheme } = useUIStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const current = THEMES.find((t) => t.value === theme) ?? THEMES[0];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-neutral-100 hover:bg-neutral-200 transition-colors text-sm text-neutral-700"
        title="Tema seç"
      >
        <span className="text-base leading-none">{current.icon}</span>
        <span className="text-xs font-medium hidden sm:block">{current.label}</span>
        <svg className="w-3 h-3 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-1.5 w-40 bg-white rounded-xl shadow-lg border border-neutral-200 py-1 z-50"
          >
            {THEMES.map((t) => (
              <button
                key={t.value}
                onClick={() => { setTheme(t.value); setOpen(false); }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors ${
                  theme === t.value
                    ? 'bg-primary-50 text-primary-700 font-medium'
                    : 'text-neutral-700 hover:bg-neutral-50'
                }`}
              >
                <span className="text-base leading-none">{t.icon}</span>
                {t.label}
                {theme === t.value && (
                  <svg className="w-3.5 h-3.5 text-primary-500 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
