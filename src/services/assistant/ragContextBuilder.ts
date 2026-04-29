import { supabase } from '../supabase/adapter';
import { AssistantContextCache, AccountSummary, TransactionTrend } from '@/types';

export async function buildUserContext(userId: string): Promise<AssistantContextCache> {
  const [accounts, transactions, findeks, debts, installments] = await Promise.all([
    fetchUserAccounts(userId),
    fetchTransactionsTrend(userId),
    fetchFindeksData(userId),
    fetchDebts(userId),
    fetchInstallments(userId),
  ]);

  const alerts = generateAlerts(accounts, debts, installments, transactions.savingsRate);
  const contextHash = generateContextHash(accounts, transactions, findeks?.creditScore);

  return {
    userId,
    contextHash,
    accountsSummary: accounts,
    findeksData: findeks,
    transactionsTrend: transactions,
    alerts,
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

async function fetchDebts(userId: string): Promise<any[]> {
  const { data, error } = await supabase
    .from('debts')
    .select('creditor_name, amount, remaining_amount, status')
    .eq('user_id', userId);

  if (error) throw error;
  return data || [];
}

async function fetchInstallments(userId: string): Promise<any[]> {
  const { data, error } = await supabase
    .from('installments')
    .select('lender_name, monthly_payment, remaining_months, status')
    .eq('user_id', userId);

  if (error) throw error;
  return data || [];
}

function generateAlerts(
  accounts: AccountSummary[],
  debts: { remainingAmount: number; dueDate: Date; status: string }[],
  installments: { monthlyPayment: number; remainingMonths: number; status: string }[],
  savingsRate: number
): string[] {
  const alerts: string[] = [];

  const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0);
  if (totalBalance < 1000) {
    alerts.push('Nakit bakiyeniz düşük, rahat bir yastık oluşturmayı düşünün.');
  }

  const activeDebts = debts.filter((d) => d.status === 'active');
  const totalDebt = activeDebts.reduce((sum, d) => sum + d.remaining_amount, 0);
  if (totalDebt > 50000) {
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
