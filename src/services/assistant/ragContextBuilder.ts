import { supabase } from '../supabase/adapter';
import { AssistantContextCache, AccountSummary, TransactionTrend } from '@/types';
import { buildFinancialIntelligenceContext } from '../intelligence/riskEngine';
import { FindeksFinancialSnapshot, AppFinancialSnapshot, EvidenceItem } from '../../types/intelligence';

/**
 * Hardened interfaces for local context mapping
 */
interface ParsedAttachmentResult {
  document_type?: string | null;
  parser_version?: string | null;
  confidence?: 'high' | 'medium' | 'low' | 'unknown' | null;
  structured_data?: Record<string, unknown> | null;
  evidence?: EvidenceItem[] | null;
}

interface RagInstallmentRow {
  lender_name?: string | null;
  monthly_payment?: number | null;
  remaining_months?: number | null;
  status?: string | null;
}

interface RagDebtRow {
  creditor_name?: string | null;
  amount?: number | null;
  remaining_amount?: number | null;
  monthly_payment?: number | null;
  status?: string | null;
}

export async function buildUserContext(userId: string): Promise<AssistantContextCache> {
  const [accounts, transactions, findeks, debts, installments] = await Promise.all([
    fetchUserAccounts(userId),
    fetchTransactionsTrend(userId),
    fetchFindeksData(userId),
    fetchDebts(userId),
    fetchInstallments(userId),
  ]);

  const { data: parsedAttachments, error: parsedAttachmentsError } = await supabase
    .from('attachment_parse_results')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'parsed')
    .order('created_at', { ascending: false })
    .limit(5);

  if (parsedAttachmentsError) {
    console.error('[PARSED_ATTACHMENTS_FETCH_ERROR]', parsedAttachmentsError);
  }

  if (import.meta.env.DEV) {
    console.log('[RAG_PARSED_ATTACHMENTS]', {
      count: parsedAttachments?.length || 0,
      latest: parsedAttachments?.[0]?.structured_data,
    });
  }

  const alerts = generateAlerts(accounts, debts, installments, transactions.savingsRate);
  const contextHash = generateContextHash(accounts, transactions, findeks?.creditScore);

  // --- Phase 7.2C: Financial Intelligence Integration (Hardened) ---
  const latestParsedResult = (parsedAttachments?.[0] as ParsedAttachmentResult | undefined);
  const findeksSnapshot = buildFindeksSnapshotFromParsedResult(latestParsedResult);
  const appSnapshot = buildAppSnapshotFromData(accounts, transactions, installments);

  const financialIntelligenceContext = buildFinancialIntelligenceContext({
    findeksSnapshot,
    appSnapshot
  });

  return {
    userId,
    contextHash,
    accountsSummary: accounts,
    findeksData: findeks,
    debts,
    installments,
    transactionsTrend: transactions,
    alerts,
    parsedAttachments: parsedAttachments ?? undefined,
    financialIntelligenceContext,
    cachedAt: new Date(),
    expiresAt: new Date(Date.now() + 5 * 60 * 1000),
  };
}

async function fetchUserAccounts(userId: string): Promise<AccountSummary[]> {
  const { data, error } = await supabase
    .from('accounts')
    .select('name, type, balance, card_limit')
    .eq('user_id', userId)
    .eq('is_active', true);

  if (error) throw error;

  return (data || []).map((acc) => ({
    name: acc.name,
    type: acc.type,
    balance: acc.balance,
    cardLimit: acc.card_limit,
  }));
}

async function fetchTransactionsTrend(userId: string): Promise<TransactionTrend> {
  const emptyFallback: TransactionTrend = {
    avgMonthlyIncome: 0,
    avgMonthlyExpense: 0,
    savingsRate: 0,
    topCategories: [],
  };

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const dateFilter = sixMonthsAgo.toISOString().slice(0, 10); // YYYY-MM-DD

  // Step 1: Get user's account IDs
  const { data: accountRows, error: accountError } = await supabase
    .from('accounts')
    .select('id')
    .eq('user_id', userId)
    .eq('is_active', true);

  if (accountError) {
    console.warn('[RAG_CONTEXT] accounts query failed', accountError);
    return emptyFallback;
  }

  const accountIds = (accountRows || []).map((a) => a.id);

  if (accountIds.length === 0) {
    return emptyFallback;
  }

  // Step 2: Query transactions via account_id (transactions has no user_id column)
  const { data, error } = await supabase
    .from('transactions')
    .select('amount, type, category, date')
    .in('account_id', accountIds)
    .gte('date', dateFilter);

  if (error) {
    console.warn('[RAG_CONTEXT] transactions query failed', error);
    return emptyFallback;
  }

  const transactions = data || [];
  const monthCount = 6;

  const expenses = transactions.filter((t) => t.type === 'gider');
  const incomes = transactions.filter((t) => t.type === 'gelir');

  const avgMonthlyExpense = expenses.reduce((sum, t) => sum + t.amount, 0) / monthCount;
  const avgMonthlyIncome = incomes.reduce((sum, t) => sum + t.amount, 0) / monthCount;

  const categoryTotals: Record<string, number> = {};
  expenses.forEach((t) => {
    categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
  });

  const topCategories = Object.entries(categoryTotals)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([name, amount]) => ({ name, amount }));

  const savingsRate = avgMonthlyIncome > 0 ? ((avgMonthlyIncome - avgMonthlyExpense) / avgMonthlyIncome) * 100 : 0;

  return {
    avgMonthlyExpense,
    avgMonthlyIncome,
    topCategories,
    savingsRate,
  };
}


async function fetchFindeksData(userId: string): Promise<{ creditScore: number; limitUsageRatio: number } | undefined> {
  const { data, error } = await supabase
    .from('findeks_reports')
    .select('credit_score, limit_usage_ratio')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data) return undefined;
  
  return {
    creditScore: data.credit_score,
    limitUsageRatio: data.limit_usage_ratio
  };
}

async function fetchDebts(userId: string): Promise<RagDebtRow[]> {
  const { data, error } = await supabase
    .from('debts')
    .select('creditor_name, amount, remaining_amount, monthly_payment, status')
    .eq('user_id', userId);

  if (error) throw error;
  return data || [];
}

async function fetchInstallments(userId: string): Promise<RagInstallmentRow[]> {
  const { data, error } = await supabase
    .from('installments')
    .select('lender_name, monthly_payment, remaining_months, status')
    .eq('user_id', userId);

  if (error) throw error;
  return data || [];
}

function generateAlerts(
  accounts: AccountSummary[],
  debts: RagDebtRow[],
  installments: RagInstallmentRow[],
  savingsRate: number
): string[] {
  const alerts: string[] = [];

  const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0);
  if (totalBalance < 1000) {
    alerts.push('Nakit bakiyeniz düşük, rahat bir yastık oluşturmayı düşünün.');
  }

  const activeDebts = debts.filter((d) => d.status === 'active');
  const totalDebtValue = activeDebts.reduce((sum, d) => sum + (d.remaining_amount ?? 0), 0);
  if (totalDebtValue > 50000) {
    alerts.push('Toplam borç yükünüz yüksek, ödeme planı gözden geçirmeyi tavsiye ederim.');
  }

  const overdueInstallments = installments.filter((i) => i.status === 'overdue');
  if (overdueInstallments.length > 0) {
    alerts.push(
      `${overdueInstallments.length} taksitte gecikme var — hemen öde, puanın etkilenebilir.`
    );
  }

  if (savingsRate < 5) {
    alerts.push('Tasarruf oranın çok düşük, gelir-gider dengesine bakmalısın.');
  }

  return alerts;
}

function generateContextHash(
  accounts: AccountSummary[],
  transactions: TransactionTrend,
  findeks?: number
): string {
  const hashInput = JSON.stringify({
    accounts: accounts.map((a) => `${a.name}:${a.balance}`),
    avgExpense: transactions.avgMonthlyExpense,
    avgIncome: transactions.avgMonthlyIncome,
    findeksScore: findeks,
  });

  const encoder = new TextEncoder();
  const data = encoder.encode(hashInput);
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data[i];
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}

// --- Intelligence Mapping Helpers ---

function buildFindeksSnapshotFromParsedResult(result: ParsedAttachmentResult | undefined): FindeksFinancialSnapshot | undefined {
  if (!result || !result.structured_data) return undefined;
  
  const data = result.structured_data;

  return {
    documentType: result.document_type || 'unknown',
    parserVersion: result.parser_version || '1.0.0',
    reportDate: toStringOrNull(data.reportDate),
    creditScore: toNumberOrNull(data.creditScore),
    creditScoreBand: toStringOrNull(data.creditScoreBand),
    totalLimit: toNumberOrNull(data.totalLimit),
    totalDebt: toNumberOrNull(data.totalDebt),
    debtLimitRatio: toNumberOrNull(data.limitUsageRatio),
    delayStatus: toStringOrNull(data.worstPaymentStatus),
    delayCount: toNumberOrNull(data.currentLongestDelay),
    
    source: 'findeks',
    confidence: toConfidence(result.confidence),
    missingFields: [], // Risk engine will populate this if it finds nulls
    evidence: Array.isArray(result.evidence) ? result.evidence : []
  };
}

function buildAppSnapshotFromData(
  accounts: AccountSummary[],
  transactions: TransactionTrend,
  installments: RagInstallmentRow[]
): AppFinancialSnapshot {
  const walletBalance = accounts
    .filter(a => a.type !== 'kredi_kartı')
    .reduce((sum, a) => sum + a.balance, 0);

  const accountsTotal = accounts.length;
  const creditCardsTotal = accounts.filter(a => a.type === 'kredi_kartı').length;
  
  const activeInstallments = (installments || []).filter(i => i.status === 'active');
  const plannedPaymentsTotal = activeInstallments.reduce((sum, i) => sum + (i.monthly_payment ?? 0), 0);

  return {
    walletBalance,
    accountsTotal,
    creditCardsTotal,
    plannedPaymentsTotal,
    monthlyIncome: transactions.avgMonthlyIncome ?? null,
    monthlyExpense: transactions.avgMonthlyExpense ?? null,
    projectedMonthEndBalance: null, // Logic can be added later
    
    source: 'app',
    confidence: 'high',
    missingFields: [],
    evidence: []
  };
}

// --- Primitive Type Helpers ---

function toNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return isFinite(n) ? n : null;
}

function toStringOrNull(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  return s === '' ? null : s;
}

function toConfidence(value: unknown): 'high' | 'medium' | 'low' | 'unknown' {
  const val = String(value || '').toLowerCase();
  if (['high', 'medium', 'low', 'unknown'].includes(val)) {
    return val as 'high' | 'medium' | 'low' | 'unknown';
  }
  return 'unknown';
}
