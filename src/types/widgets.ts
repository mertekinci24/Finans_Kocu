export type WidgetSize = '1x1' | '2x1' | '2x2' | '3x1' | '4x1';
export type WidgetType =
  | 'financial_score'
  | 'monthly_summary'
  | 'account_balance'
  | 'quick_summary'
  | 'wnw_metric'
  | 'installment_load'
  | 'total_debt'
  | 'active_installments'
  | 'installment_projection'
  | 'coach_insights'
  | 'recent_transactions'
  | 'goal_tracker'
  | 'cash_flow_navigator';

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
    id: 'financial_score',
    type: 'financial_score',
    title: 'Finansal Sağlık Skoru',
    size: '4x1',
    position: 0,
    enabled: true,
  },
  {
    id: 'cash_flow_navigator',
    type: 'cash_flow_navigator',
    title: 'Nakit Akışı Navigatörü',
    size: '2x2',
    position: 1,
    enabled: true,
  },
  {
    id: 'coach_insights',
    type: 'coach_insights',
    title: 'Koç Tavsiyeleri',
    size: '2x1',
    position: 2,
    enabled: true,
  },
  {
    id: 'quick_summary',
    type: 'quick_summary',
    title: 'Hızlı Özet',
    size: '1x1',
    position: 3,
    enabled: true,
  },
  {
    id: 'wnw_metric',
    type: 'wnw_metric',
    title: 'Düzeltilmiş Varlık',
    size: '1x1',
    position: 4,
    enabled: true,
  },
  {
    id: 'account_balance',
    type: 'account_balance',
    title: 'Banka Hesapları',
    size: '1x1',
    position: 5,
    enabled: true,
  },
  {
    id: 'installment_load',
    type: 'installment_load',
    title: 'Taksit Yükü',
    size: '1x1',
    position: 6,
    enabled: true,
  },
  {
    id: 'total_debt',
    type: 'total_debt',
    title: 'Toplam Borç',
    size: '1x1',
    position: 7,
    enabled: true,
  },
  {
    id: 'recent_transactions',
    type: 'recent_transactions',
    title: 'Son İşlemler',
    size: '2x1',
    position: 8,
    enabled: true,
  },
  {
    id: 'active_installments',
    type: 'active_installments',
    title: 'Aktif Taksitler',
    size: '2x1',
    position: 9,
    enabled: true,
  },
  {
    id: 'installment_projection',
    type: 'installment_projection',
    title: 'Taksit Projeksiyonu',
    size: '4x1',
    position: 10,
    enabled: true,
  },
  {
    id: 'goal_tracker',
    type: 'goal_tracker',
    title: 'Finansal Hedefler',
    size: '2x1',
    position: 11,
    enabled: true,
  },
];

export const WIDGET_SIZES = {
  '1x1': { cols: 1, rows: 1, minWidth: 300 },
  '2x1': { cols: 2, rows: 1, minWidth: 600 },
  '2x2': { cols: 2, rows: 2, minWidth: 600 },
  '3x1': { cols: 3, rows: 1, minWidth: 900 },
  '4x1': { cols: 4, rows: 1, minWidth: 1200 },
};
