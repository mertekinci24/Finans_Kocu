import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useInflationAdjustment } from '@/hooks/useInflationAdjustment';
import { dataSourceAdapter } from '@/services/supabase/adapter';
import { scoringEngine, type DetailedScore } from '@/services/scoringEngine';
import { ruleEngine, type Insight } from '@/services/ruleEngine';
import { CURRENCY_SYMBOL } from '@/constants';
import FinancialScoreCard from '@/components/insights/FinancialScoreCard';
import CoachInsights from '@/components/insights/CoachInsights';
import type { Account, Transaction, Debt, Installment } from '@/types';

export default function Dashboard(): JSX.Element {
  const { user } = useAuth();
  const { useRealValue, setUseRealValue, getInflationContext } = useInflationAdjustment();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [scoreData, setScoreData] = useState<DetailedScore | null>(null);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      loadDashboardData(user.id);
    }
  }, [user?.id]);

  const loadDashboardData = async (userId: string) => {
    try {
      setLoading(true);

      const [accountsData, debtsData, installmentsData] = await Promise.all([
        dataSourceAdapter.account.getByUserId(userId),
        dataSourceAdapter.debt.getByUserId(userId),
        dataSourceAdapter.installment.getByUserId(userId),
      ]);

      setAccounts(accountsData);
      setDebts(debtsData);
      setInstallments(installmentsData);

      // Load all transactions for scoring
      const allTransactions: Transaction[] = [];
      if (accountsData.length > 0) {
        for (const acc of accountsData) {
          const startDate = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1);
          const endDate = new Date();
          const txs = await dataSourceAdapter.transaction.getByDateRange(
            acc.id,
            startDate,
            endDate
          );
          allTransactions.push(...txs);
        }
      }
      setTransactions(allTransactions);

      // Calculate financial score
      const detailedScore = scoringEngine.calculate({
        accounts: accountsData,
        transactions: allTransactions,
        debts: debtsData,
        installments: installmentsData,
      });
      setScoreData(detailedScore);

      // Execute rules
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const recentTx = allTransactions.filter((t) => new Date(t.date) >= thirtyDaysAgo);

      const monthlyIncome = recentTx
        .filter((t) => t.type === 'gelir')
        .reduce((sum, t) => sum + t.amount, 0);

      const monthlyExpenses = recentTx
        .filter((t) => t.type === 'gider')
        .reduce((sum, t) => sum + t.amount, 0);

      const monthlyInstallmentsTotal = installmentsData
        .filter((i) => i.status === 'active')
        .reduce((sum, i) => sum + i.monthlyPayment, 0);

      const totalBalance = accountsData.reduce((sum, a) => sum + a.balance, 0);

      const generatedInsights = ruleEngine.execute(
        allTransactions,
        monthlyIncome,
        monthlyExpenses,
        totalBalance,
        monthlyInstallmentsTotal
      );
      setInsights(generatedInsights);
    } catch (err) {
      console.error('Dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-neutral-600">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  const fmt = (n: number) =>
    `${CURRENCY_SYMBOL}${n.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  const monthlyIncome = transactions
    .filter((t) => t.type === 'gelir')
    .reduce((sum, t) => sum + t.amount, 0);

  const monthlyExpenses = transactions
    .filter((t) => t.type === 'gider')
    .reduce((sum, t) => sum + t.amount, 0);

  const monthlyInstallment = installments
    .filter((i) => i.status === 'active')
    .reduce((sum, i) => sum + i.monthlyPayment, 0);

  const totalDebt = debts
    .filter((d) => d.status === 'active')
    .reduce((sum, d) => sum + d.remainingAmount, 0);

  const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0);

  const recentTransactions = transactions
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  const displayIncome = useRealValue ? Math.round(getInflationContext(monthlyIncome).real) : monthlyIncome;
  const displayExpenses = useRealValue ? Math.round(getInflationContext(monthlyExpenses).real) : monthlyExpenses;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900">Kontrol Paneli</h1>
          <p className="text-neutral-600 mt-1 text-sm">Finansal sağlığınızı takip edin</p>
        </div>
        <button
          onClick={() => setUseRealValue(!useRealValue)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            useRealValue
              ? 'bg-primary-100 text-primary-700 border border-primary-300'
              : 'bg-neutral-100 text-neutral-600 border border-neutral-300'
          }`}
          title="Enflasyona göre reel değer göster"
        >
          {useRealValue ? 'Reel Değer' : 'Nominal'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {scoreData && (
          <div className="lg:col-span-2">
            <FinancialScoreCard score={scoreData.score} explanation={scoreData.explanation} />
          </div>
        )}

        <div className="bg-white border border-neutral-200 rounded-xl p-4 space-y-2">
          <div className="text-xs font-medium text-neutral-600 uppercase">Hızlı Özet</div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-xs text-neutral-600">Gelir</span>
              <span className="text-xs font-bold text-success-600">{fmt(displayIncome)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-neutral-600">Gider</span>
              <span className="text-xs font-bold text-error-600">{fmt(displayExpenses)}</span>
            </div>
            <div className="flex justify-between pt-1 border-t border-neutral-200">
              <span className="text-xs font-medium text-neutral-700">Net</span>
              <span
                className={`text-xs font-bold ${displayIncome - displayExpenses > 0 ? 'text-success-600' : 'text-error-600'}`}
              >
                {fmt(displayIncome - displayExpenses)}
              </span>
            </div>
            {useRealValue && (
              <div className="text-xs text-neutral-500 pt-1 border-t border-neutral-200">
                Enflasyon (%{getInflationContext(0).inflationLoss.toFixed(1)} aylık) düzeltilmiş değerler
              </div>
            )}
          </div>
        </div>
      </div>

      {insights.length > 0 && (
        <div className="bg-white border border-neutral-200 rounded-xl p-5">
          <CoachInsights insights={insights} />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-neutral-200 rounded-lg p-4">
          <div className="text-xs font-medium text-neutral-600 mb-1">Toplam Bakiye</div>
          <div className="text-2xl font-bold text-primary-600">{fmt(totalBalance)}</div>
          <div className="text-xs text-neutral-500 mt-1">{accounts.length} hesap</div>
        </div>

        <div className="bg-white border border-neutral-200 rounded-lg p-4">
          <div className="text-xs font-medium text-neutral-600 mb-1">Taksit Yükü</div>
          <div className="text-2xl font-bold text-warning-600">{fmt(monthlyInstallment)}</div>
          <div className="text-xs text-neutral-500 mt-1">
            {monthlyIncome > 0 ? `%${((monthlyInstallment / monthlyIncome) * 100).toFixed(0)}` : '—'}
          </div>
        </div>

        <div className="bg-white border border-neutral-200 rounded-lg p-4">
          <div className="text-xs font-medium text-neutral-600 mb-1">Toplam Borç</div>
          <div className="text-2xl font-bold text-error-600">{fmt(totalDebt)}</div>
          <div className="text-xs text-neutral-500 mt-1">
            {debts.filter((d) => d.status === 'active').length} borç
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-neutral-200 rounded-lg p-5">
          <h2 className="text-sm font-semibold text-neutral-900 mb-3">Son İşlemler</h2>
          {recentTransactions.length > 0 ? (
            <div className="space-y-2">
              {recentTransactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between p-2 bg-neutral-50 rounded hover:bg-neutral-100 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-neutral-900 truncate">{tx.description}</div>
                    <div className="text-xs text-neutral-500">{tx.category}</div>
                  </div>
                  <div
                    className={`text-xs font-bold flex-shrink-0 ml-2 ${tx.type === 'gelir' ? 'text-success-600' : 'text-error-600'}`}
                  >
                    {tx.type === 'gelir' ? '+' : '-'}
                    {fmt(tx.amount)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-neutral-500 text-xs">İşlem yok</div>
          )}
        </div>

        <div className="bg-white border border-neutral-200 rounded-lg p-5">
          <h2 className="text-sm font-semibold text-neutral-900 mb-3">Aktif Taksitler</h2>
          {installments.filter((i) => i.status === 'active').length > 0 ? (
            <div className="space-y-2">
              {installments
                .filter((i) => i.status === 'active')
                .slice(0, 5)
                .map((inst) => (
                  <div key={inst.id} className="flex items-center justify-between p-2 bg-neutral-50 rounded">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-neutral-900 truncate">{inst.lenderName}</div>
                      <div className="text-xs text-neutral-500">{inst.remainingMonths} taksit kaldı</div>
                    </div>
                    <div className="text-xs font-bold text-primary-600 flex-shrink-0 ml-2">{fmt(inst.monthlyPayment)}</div>
                  </div>
                ))}
            </div>
          ) : (
            <div className="text-center py-6 text-neutral-500 text-xs">Aktif taksit yok</div>
          )}
        </div>
      </div>
    </div>
  );
}
