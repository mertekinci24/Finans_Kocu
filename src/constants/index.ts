export const APP_NAME = 'FinansKoçu';
export const APP_VERSION = '0.1.0';
export const CURRENCY = 'TRY';
export const CURRENCY_SYMBOL = '₺';

export const ROUTES = {
  HOME: '/',
  DASHBOARD: '/',
  ACCOUNTS: '/accounts',
  TRANSACTIONS: '/transactions',
  DEBTS: '/debts',
  INSTALLMENTS: '/installments',
  CATEGORIES: '/categories',
  FINDEKS: '/findeks',
  ASSISTANT: '/assistant',
  SCENARIO: '/scenario',
  GOALS: '/goals',
  UPGRADE: '/upgrade',
  SETTINGS: '/settings',
} as const;

export const DEFAULT_CATEGORIES = [
  { name: 'Maaş',        color: '#16a34a', type: 'gelir'    as const, icon: '💰' },
  { name: 'Freelance',   color: '#0284c7', type: 'gelir'    as const, icon: '💻' },
  { name: 'Yiyecek',     color: '#ea580c', type: 'gider'    as const, icon: '🍔' },
  { name: 'Ulaşım',      color: '#7c3aed', type: 'gider'    as const, icon: '🚗' },
  { name: 'Sağlık',      color: '#e11d48', type: 'gider'    as const, icon: '💊' },
  { name: 'Eğitim',      color: '#0891b2', type: 'gider'    as const, icon: '📚' },
  { name: 'Hizmet',      color: '#d97706', type: 'gider'    as const, icon: '⚡' },
  { name: 'Eğlence',     color: '#7c3aed', type: 'gider'    as const, icon: '🎬' },
  { name: 'Giyim',       color: '#be185d', type: 'gider'    as const, icon: '👗' },
  { name: 'Kira',        color: '#374151', type: 'gider'    as const, icon: '🏠' },
  { name: 'Abonelik',    color: '#6b7280', type: 'gider'    as const, icon: '📱' },
  { name: 'Diğer',       color: '#9ca3af', type: 'ikisi_de' as const, icon: '📦' },
] as const;

export const SCORE_RANGES = {
  EXCELLENT: 80,
  GOOD: 60,
  FAIR: 40,
  POOR: 0,
} as const;

export const SCORE_LABELS = {
  EXCELLENT: 'Mükemmel',
  GOOD: 'İyi',
  FAIR: 'Orta',
  POOR: 'Kötü',
} as const;

export const ACCOUNT_COLORS = {
  banka: {
    bg: 'bg-blue-600',
    lightBg: 'bg-blue-50',
    text: 'text-blue-600',
    border: 'border-blue-200',
    dot: 'bg-blue-500',
    card: 'bg-blue-600 dark:bg-slate-800 border-blue-100 dark:border-blue-900',
    badge: 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800'
  },
  kredi_kartı: {
    bg: 'bg-orange-500',
    lightBg: 'bg-orange-50',
    text: 'text-orange-600',
    border: 'border-orange-200',
    dot: 'bg-orange-500',
    card: 'bg-orange-500 dark:bg-zinc-800 border-orange-100 dark:border-orange-900',
    badge: 'bg-orange-50 text-orange-600 border-orange-100 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800'
  },
  nakit: {
    bg: 'bg-emerald-500',
    lightBg: 'bg-emerald-50',
    text: 'text-emerald-600',
    border: 'border-emerald-200',
    dot: 'bg-emerald-500',
    card: 'bg-emerald-500 dark:bg-slate-800 border-emerald-100 dark:border-emerald-900',
    badge: 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800'
  },
  default: {
    bg: 'bg-neutral-500',
    lightBg: 'bg-neutral-50',
    text: 'text-neutral-600',
    border: 'border-neutral-200',
    dot: 'bg-neutral-500',
    card: 'bg-neutral-500 dark:bg-neutral-800 border-neutral-100 dark:border-neutral-900',
    badge: 'bg-neutral-50 text-neutral-600 border-neutral-100 dark:bg-neutral-800 dark:text-neutral-300 dark:border-neutral-700'
  }
} as const;

export const INSTALLMENT_TYPE_ICONS = {
  kredi_kartı_taksiti: '💳',
  banka_kredisi: '🏦',
  kişisel_borç: '👤',
  senet_cek: '🎫',
} as const;

export const INSTALLMENT_TYPE_LABELS = {
  kredi_kartı_taksiti: 'KREDİ KARTI',
  banka_kredisi: 'BANKA KREDİSİ',
  kişisel_borç: 'KİŞİSEL BORÇ',
  senet_cek: 'SENET / ÇEK',
} as const;

export const INSTALLMENT_TYPE_BADGE_STYLE = {
  kredi_kartı_taksiti: 'bg-amber-900/40 text-amber-400 border-amber-800/50',
  banka_kredisi: 'bg-blue-900/40 text-blue-400 border-blue-800/50',
  kişisel_borç: 'bg-zinc-900/40 text-zinc-400 border-zinc-700/50',
  senet_cek: 'bg-indigo-900/40 text-indigo-400 border-indigo-800/50',
} as const;
