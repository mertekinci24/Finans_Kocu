export type WidgetSize = '1x1' | '2x1' | '2x2' | '3x1';
export type WidgetType =
  | 'financial_score'
  | 'monthly_summary'
  | 'account_balance'
  | 'expense_breakdown'
  | 'recent_transactions'
  | 'debts_overview'
  | 'installments'
  | 'tax_obligations'
  | 'coach_insights';

export interface Widget {
  id: string;
  type: WidgetType;
  title: string;
  size: WidgetSize;
  position: number;
  enabled: boolean;
  customSettings?: Record<string, unknown>;
}

export interface DashboardLayout {
  userId: string;
  widgets: Widget[];
  gridColumns: number;
  lastUpdated: Date;
  version: number;
}

export const DEFAULT_DASHBOARD_LAYOUT: Widget[] = [
  {
    id: 'score-1',
    type: 'financial_score',
    title: 'Finansal Sağlık Skoru',
    size: '2x1',
    position: 0,
    enabled: true,
  },
  {
    id: 'cashflow-1',
    type: 'expense_breakdown',
    title: '30 Günlük Nakit Akışı',
    size: '2x1',
    position: 1,
    enabled: true,
  },
  {
    id: 'summary-1',
    type: 'monthly_summary',
    title: 'Bu Ay Özeti',
    size: '1x1',
    position: 3,
    enabled: true,
  },
  {
    id: 'balance-1',
    type: 'account_balance',
    title: 'Hesap Bakiyeleri',
    size: '1x1',
    position: 4,
    enabled: true,
  },
  {
    id: 'expenses-1',
    type: 'expense_breakdown',
    title: 'Harcama Analizi',
    size: '2x1',
    position: 4,
    enabled: true,
  },
  {
    id: 'transactions-1',
    type: 'recent_transactions',
    title: 'Son İşlemler',
    size: '2x1',
    position: 6,
    enabled: true,
  },
  {
    id: 'debts-1',
    type: 'debts_overview',
    title: 'Borç Özeti',
    size: '1x1',
    position: 8,
    enabled: true,
  },
  {
    id: 'installments-1',
    type: 'installments',
    title: 'Taksitler',
    size: '1x1',
    position: 9,
    enabled: true,
  },
  {
    id: 'tax-1',
    type: 'tax_obligations',
    title: 'Vergi Yükümlülükleri',
    size: '2x1',
    position: 10,
    enabled: true,
  },
  {
    id: 'insights-1',
    type: 'coach_insights',
    title: 'Koç Tavsiyeleri',
    size: '2x1',
    position: 12,
    enabled: true,
  },
];

export const WIDGET_SIZES = {
  '1x1': { cols: 1, rows: 1, minWidth: 300 },
  '2x1': { cols: 2, rows: 1, minWidth: 600 },
  '2x2': { cols: 2, rows: 2, minWidth: 600 },
  '3x1': { cols: 3, rows: 1, minWidth: 900 },
};
