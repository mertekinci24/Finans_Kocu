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
  SETTINGS: '/settings',
} as const;

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
