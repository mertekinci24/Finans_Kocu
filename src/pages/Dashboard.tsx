import { useState, useEffect } from 'react';
import { dataSourceAdapter } from '@/services/supabase/adapter';
import { CURRENCY_SYMBOL, SCORE_RANGES, SCORE_LABELS } from '@/constants';
import type { Account, Transaction, Debt, Installment, FinancialScore } from '@/types';

export default function Dashboard(): JSX.Element {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [score, setScore] = useState<FinancialScore | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentMonth] = useState(new Date());

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const userId = 'temp-user-id';

      const [accountsData, debtsData, installmentsData] = await Promise.all([
        dataSourceAdapter.account.getByUserId(userId),
        dataSourceAdapter.debt.getByUserId(userId),
        dataSourceAdapter.installment.getByUserId(userId),
      ]);

      setAccounts(accountsData);
      setDebts(debtsData);
      setInstallments(installmentsData);

      if (accountsData.length > 0) {
        const startDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
        const endDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

        const txData = await dataSourceAdapter.transaction.getByDateRange(
          accountsData[0].id,
          startDate,
          endDate
        );
        setTransactions(txData);
      }

      const calculatedScore = calculateFinancialScore(
        accountsData,
        debtsData,
        installmentsData
      );
      setScore(calculatedScore);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateFinancialScore = (
    accs: Account[],
    _dts: Debt[],
    insts: Installment[]
  ): FinancialScore => {
    const totalBalance = accs.reduce((sum, acc) => sum + acc.balance, 0);
    const monthlyInstallment = insts.reduce((sum, inst) => sum + inst.monthlyPayment, 0);
    const monthlyIncome = transactions
      .filter((t) => t.type === 'gelir')
      .reduce((sum, t) => sum + t.amount, 0) || 12500;

    return {
      overallScore: Math.max(0, Math.min(100, 65)),
      confidenceScore: 0.85,
      debtToIncomeRatio: monthlyIncome > 0 ? (monthlyInstallment / monthlyIncome) * 100 : 0,
      cashBufferMonths: monthlyIncome > 0 ? totalBalance / monthlyIncome : 0,
      savingsRate: monthlyIncome > 0 ? ((monthlyIncome - 9800) / monthlyIncome) * 100 : 0,
      installmentBurdenRatio: monthlyIncome > 0 ? (monthlyInstallment / monthlyIncome) * 100 : 0,
      lastCalculatedAt: new Date(),
    };
  };

  const getScoreColor = (scoreValue: number): string => {
    if (scoreValue >= SCORE_RANGES.EXCELLENT) return 'text-success-600';
    if (scoreValue >= SCORE_RANGES.GOOD) return 'text-primary-600';
    if (scoreValue >= SCORE_RANGES.FAIR) return 'text-warning-600';
    return 'text-error-600';
  };

  const getScoreBgColor = (scoreValue: number): string => {
    if (scoreValue >= SCORE_RANGES.EXCELLENT) return 'bg-success-50';
    if (scoreValue >= SCORE_RANGES.GOOD) return 'bg-primary-50';
    if (scoreValue >= SCORE_RANGES.FAIR) return 'bg-warning-50';
    return 'bg-error-50';
  };

  const formatCurrency = (amount: number): string => {
    return `${CURRENCY_SYMBOL}${amount.toLocaleString('tr-TR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}`;
  };

  const monthlyIncome = transactions
    .filter((t) => t.type === 'gelir')
    .reduce((sum, t) => sum + t.amount, 0) || 12500;

  const monthlyExpense = transactions
    .filter((t) => t.type === 'gider')
    .reduce((sum, t) => sum + t.amount, 0) || 9800;

  const monthlyInstallment = installments.reduce((sum, inst) => sum + inst.monthlyPayment, 0);
  const totalDebt = debts.reduce((sum, debt) => sum + debt.remainingAmount, 0);
  const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);

  const upcomingPayments = debts
    .filter((d) => d.status === 'active')
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 3);

  const recentTransactions = transactions
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-12 w-48 bg-neutral-200 rounded" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-neutral-200 rounded-lg h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-neutral-900">Kontrol Paneli</h1>
        <p className="text-neutral-600 mt-2">
          Finansal sağlığınızı takip edin ve yönetin
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div
          className={`${getScoreBgColor(score?.overallScore || 0)} rounded-lg border border-neutral-200 p-6 space-y-4 hover:shadow-md transition-all`}
        >
          <div className="text-neutral-600 text-sm font-medium">Finansal Skor</div>
          <div className={`text-4xl font-bold ${getScoreColor(score?.overallScore || 0)}`}>
            {score?.overallScore ?? 0}/100
          </div>
          <div className="text-neutral-600 text-xs">
            {score && score.overallScore >= SCORE_RANGES.EXCELLENT
              ? SCORE_LABELS.EXCELLENT
              : score && score.overallScore >= SCORE_RANGES.GOOD
                ? SCORE_LABELS.GOOD
                : score && score.overallScore >= SCORE_RANGES.FAIR
                  ? SCORE_LABELS.FAIR
                  : SCORE_LABELS.POOR}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-neutral-200 p-6 space-y-4 hover:shadow-md transition-shadow">
          <div className="text-neutral-600 text-sm font-medium">Bu Ayın Geliri</div>
          <div className="text-4xl font-bold text-success-600">{formatCurrency(monthlyIncome)}</div>
          <div className="text-neutral-500 text-xs">
            {accounts.length} hesaptan
          </div>
        </div>

        <div className="bg-white rounded-lg border border-neutral-200 p-6 space-y-4 hover:shadow-md transition-shadow">
          <div className="text-neutral-600 text-sm font-medium">Bu Ayın Gideri</div>
          <div className="text-4xl font-bold text-error-600">{formatCurrency(monthlyExpense)}</div>
          <div className="text-neutral-500 text-xs">
            Net: {formatCurrency(monthlyIncome - monthlyExpense)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg border border-neutral-200 p-6 space-y-4 hover:shadow-md transition-shadow">
          <div className="text-neutral-600 text-sm font-medium">Toplam Bakiye</div>
          <div className="text-3xl font-bold text-primary-600">{formatCurrency(totalBalance)}</div>
          <div className="text-neutral-500 text-xs">{accounts.length} aktif hesap</div>
        </div>

        <div className="bg-white rounded-lg border border-neutral-200 p-6 space-y-4 hover:shadow-md transition-shadow">
          <div className="text-neutral-600 text-sm font-medium">Toplam Taksit Yükü</div>
          <div className="text-3xl font-bold text-warning-600">{formatCurrency(monthlyInstallment)}</div>
          <div className="text-neutral-500 text-xs">
            {monthlyIncome > 0
              ? `${((monthlyInstallment / monthlyIncome) * 100).toFixed(0)}% gelirin`
              : '0%'}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-neutral-200 p-6 space-y-4 hover:shadow-md transition-shadow">
          <div className="text-neutral-600 text-sm font-medium">Toplam Borç</div>
          <div className="text-3xl font-bold text-error-600">{formatCurrency(totalDebt)}</div>
          <div className="text-neutral-500 text-xs">{debts.length} aktif borç</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-neutral-200 p-6">
          <h2 className="text-lg font-semibold text-neutral-900 mb-4">Son İşlemler</h2>
          {recentTransactions.length > 0 ? (
            <div className="space-y-3">
              {recentTransactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg hover:bg-neutral-100 transition-colors cursor-pointer group"
                >
                  <div className="flex-1">
                    <div className="font-medium text-neutral-900">{tx.description}</div>
                    <div className="text-sm text-neutral-500">{tx.category}</div>
                  </div>
                  <div
                    className={`font-semibold ${tx.type === 'gelir' ? 'text-success-600' : 'text-error-600'}`}
                  >
                    {tx.type === 'gelir' ? '+' : '-'}
                    {formatCurrency(tx.amount)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-neutral-500">İşlem kaydı yok</div>
          )}
        </div>

        <div className="bg-white rounded-lg border border-neutral-200 p-6">
          <h2 className="text-lg font-semibold text-neutral-900 mb-4">Yaklaşan Ödemeler</h2>
          {upcomingPayments.length > 0 ? (
            <div className="space-y-3">
              {upcomingPayments.map((debt) => {
                const daysUntilDue = Math.ceil(
                  (new Date(debt.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
                );
                const isUrgent = daysUntilDue <= 7;
                return (
                  <div
                    key={debt.id}
                    className={`p-3 rounded-lg transition-colors ${
                      isUrgent ? 'bg-error-50 hover:bg-error-100' : 'bg-neutral-50 hover:bg-neutral-100'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-medium text-neutral-900">{debt.creditorName}</div>
                        <div className={`text-sm ${isUrgent ? 'text-error-600' : 'text-neutral-500'}`}>
                          {daysUntilDue > 0 ? `${daysUntilDue} gün kaldı` : 'Vadesi geçmiş'}
                        </div>
                      </div>
                      <div className="font-semibold text-error-600">{formatCurrency(debt.remainingAmount)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-neutral-500">Borç kaydı yok</div>
          )}
        </div>
      </div>
    </div>
  );
}
