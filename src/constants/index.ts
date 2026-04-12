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
