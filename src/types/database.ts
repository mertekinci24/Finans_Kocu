// ═══════════════════════════════════════════════════════════════════════════════
// FinansKoçu — Supabase Database Row Types
// Tüm repository mapToX(row: any) fonksiyonlarındaki `any` tiplerini kaldırır.
// snake_case DB şemasını temsil eder.
// ═══════════════════════════════════════════════════════════════════════════════

/** accounts tablosu satır tipi */
export interface AccountRow {
  id: string;
  user_id: string;
  name: string;
  type: string;
  balance: number;
  currency: string;
  bank_name: string | null;
  card_limit: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/** transactions tablosu satır tipi */
export interface TransactionRow {
  id: string;
  account_id: string;
  amount: number;
  description: string;
  category: string;
  date: string;
  type: string;
  note: string | null;
  recurring: string;
  created_at: string;
  updated_at: string;
}

/** debts tablosu satır tipi */
export interface DebtRow {
  id: string;
  user_id: string;
  creditor_name: string;
  amount: number;
  remaining_amount: number;
  monthly_payment: number;
  interest_rate: number;
  due_date: string;
  status: string;
  created_at: string;
  updated_at: string;
}

/** installments tablosu satır tipi */
export interface InstallmentRow {
  id: string;
  user_id: string;
  lender_name: string;
  principal: number;
  monthly_payment: number;
  remaining_months: number;
  total_months: number;
  interest_rate: number;
  next_payment_date: string;
  status: string;
  created_at: string;
  updated_at: string;
}

/** financial_scores tablosu satır tipi */
export interface FinancialScoreRow {
  id: string;
  user_id: string;
  overall_score: number;
  confidence_score: number;
  debt_to_income_ratio: number;
  cash_buffer_months: number;
  savings_rate: number;
  installment_burden_ratio: number;
  last_calculated_at: string;
  created_at: string;
  updated_at: string;
}

/** findeks_reports tablosu satır tipi */
export interface FindeksReportRow {
  id: string;
  user_id: string;
  file_name: string;
  credit_score: number;
  limit_usage_ratio: number;
  delay_months: number;
  delay_history: string;
  bank_accounts: number;
  credit_cards: number;
  active_debts: number;
  banks_list: string;
  ai_analysis: string | null;
  action_plan: string | null;
  risk_level: string | null;
  score_improvement_potential: number;
  uploaded_at: string;
  created_at: string;
  updated_at: string;
}

/** findeks_score_history tablosu satır tipi */
export interface FindeksScoreHistoryRow {
  id: string;
  user_id: string;
  report_id: string;
  score: number;
  recorded_at: string;
  previous_score: number | null;
  score_change: number | null;
}

/** chat_sessions tablosu satır tipi */
export interface ChatSessionRow {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

/** chat_messages tablosu satır tipi */
export interface ChatMessageRow {
  id: string;
  session_id: string;
  user_id: string;
  role: string;
  content: string;
  suggested_transaction: string | null;
  tokens_used: number;
  created_at: string;
}

/** tax_obligations tablosu satır tipi */
export interface TaxObligationRow {
  id: string;
  user_id: string | null;
  obligation_type: string;
  due_date: string;
  description: string;
  estimated_amount: number;
  payment_status: string;
  reminder_sent: boolean;
  created_at: string;
  updated_at: string;
}

/** baskur_profiles tablosu satır tipi */
export interface BaskurProfileRow {
  id: string;
  user_id: string;
  profile_type: string;
  gross_income_monthly: number;
  baskur_tier: string;
  monthly_premium: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/** saving_goals tablosu satır tipi */
export interface SavingGoalRow {
  id: string;
  user_id: string;
  name: string;
  category: string;
  target_amount: number;
  current_amount: number;
  monthly_saving: number;
  target_date: string | null;
  priority: string;
  status: string;
  note: string | null;
  created_at: string;
  updated_at: string;
}

/** user_subscriptions tablosu satır tipi */
export interface UserSubscriptionRow {
  id: string;
  user_id: string;
  plan_type: string;
  status: string;
  current_period_start: string;
  current_period_end: string | null;
  iyzico_subscription_reference_code: string | null;
  iyzico_customer_reference_code: string | null;
  cancelled_at: string | null;
  trial_ends_at: string | null;
  created_at: string;
  updated_at: string;
}

/** dashboard_layouts tablosu satır tipi */
export interface DashboardLayoutRow {
  id: string;
  user_id: string;
  widgets: unknown;
  grid_columns: number;
  last_updated: string;
  version: number;
}

/** categories tablosu satır tipi */
export interface CategoryRow {
  id: string;
  user_id: string;
  name: string;
  color: string;
  icon: string | null;
  monthly_budget: number | null;
  type: string;
  is_default: boolean;
  created_at: string;
}
