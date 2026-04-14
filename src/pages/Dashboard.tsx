import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useInflationAdjustment } from '@/hooks/useInflationAdjustment';
import { dataSourceAdapter } from '@/services/supabase/adapter';
import { scoringEngine, type DetailedScore } from '@/services/scoringEngine';
import { ruleEngine, type Insight } from '@/services/ruleEngine';
import { generateMonthlyReport } from '@/services/pdfExport';
import { CURRENCY_SYMBOL } from '@/constants';
import FinancialScoreCard from '@/components/insights/FinancialScoreCard';
import CoachInsights from '@/components/insights/CoachInsights';
import WidgetGrid from '@/components/dashboard/WidgetGrid';
import FinancialScoreWidget from '@/components/dashboard/widgets/FinancialScoreWidget';
import MonthlySummaryWidget from '@/components/dashboard/widgets/MonthlySummaryWidget';
import AccountBalanceWidget from '@/components/dashboard/widgets/AccountBalanceWidget';
import CashFlowForecastWidget from '@/components/dashboard/widgets/CashFlowForecastWidget';
import GoalTrackerWidget from '@/components/dashboard/widgets/GoalTrackerWidget';
import { DashboardLayout } from '@/types/widgets';
import { SupabaseDashboardLayoutRepository } from '@/services/supabase/repositories/DashboardLayoutRepository';
import { cashFlowEngine, type CashFlowForecast } from '@/services/cashFlowEngine';
import { scenarioSimulator, type ScenarioResult, type ScenarioType, type Scenario, SCENARIO_LABELS } from '@/services/scenarioSimulator';
import { goalEngine, type GoalProjection } from '@/services/goalService';
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
  const [cashFlowForecast, setCashFlowForecast] = useState<CashFlowForecast | null>(null);
  const [scenarioResult, setScenarioResult] = useState<ScenarioResult | null>(null);
  const [goalProjections, setGoalProjections] = useState<GoalProjection[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDragMode, setIsDragMode] = useState(false);
  const [layout, setLayout] = useState<DashboardLayout | null>(null);
  const layoutRepository = new SupabaseDashboardLayoutRepository();

  useEffect(() => {
    if (user?.id) {
      loadDashboardData(user.id);
      loadLayout(user.id);
    }
  }, [user?.id]);

  const loadLayout = async (userId: string) => {
    try {
      const userLayout = await layoutRepository.getLayout(userId);
      setLayout(userLayout);
    } catch (err) {
      console.error('Layout load error:', err);
    }
  };

  const handleSaveLayout = async (newLayout: DashboardLayout) => {
    if (!user?.id) return;
    try {
      const saved = await layoutRepository.saveLayout(user.id, newLayout);
      setLayout(saved);
    } catch (err) {
      console.error('Layout save error:', err);
    }
  };

  const handleResetLayout = async () => {
    if (!user?.id) return;
    try {
      const reset = await layoutRepository.resetLayout(user.id);
      setLayout(reset);
      setIsDragMode(false);
    } catch (err) {
      console.error('Layout reset error:', err);
    }
  };

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

      // Generate cash flow forecast
      const forecast = cashFlowEngine.forecast(
        accountsData,
        allTransactions,
        debtsData,
        installmentsData
      );
      setCashFlowForecast(forecast);

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

      // Load goals and projections
      try {
        const { SupabaseGoalRepository } = await import('@/services/supabase/repositories/GoalRepository');
        const goalRepo = new SupabaseGoalRepository();
        const goalsData = await goalRepo.getActiveByUserId(userId);
        const monthlySavings = goalEngine.calculateCurrentMonthlySavings(allTransactions);
        const goalProj = goalEngine.projectAllGoals(goalsData, monthlySavings);
        setGoalProjections(goalProj);
      } catch (goalErr) {
        // Goal table might not exist yet — graceful fallback
        console.warn('Goals load skipped:', goalErr);
        setGoalProjections([]);
      }
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
      {cashFlowForecast?.hasCashTightness && (
        <div
          className={`p-4 rounded-lg border-l-4 ${
            cashFlowForecast.tightnessSeverity === 'critical'
              ? 'bg-red-50 border-red-500 text-red-900'
              : 'bg-yellow-50 border-yellow-500 text-yellow-900'
          }`}
        >
          <div className="flex items-start gap-2">
            <span className="text-xl">⚠</span>
            <div>
              <p className="font-semibold text-sm">
                {cashFlowForecast.tightnessSeverity === 'critical'
                  ? 'Kritik: 30 gün içinde nakit sorunu'
                  : 'Uyarı: Nakit tamponu düşük'}
              </p>
              <p className="text-xs mt-1">
                {cashFlowForecast.recommendations[0]}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900">Kontrol Paneli</h1>
          <p className="text-neutral-600 mt-1 text-sm">Finansal sağlığınızı takip edin</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsDragMode(!isDragMode)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              isDragMode
                ? 'bg-blue-100 text-blue-700 border border-blue-300'
                : 'bg-neutral-100 text-neutral-600 border border-neutral-300'
            }`}
            title={isDragMode ? 'Düzeni Kaydet' : 'Düzeni Düzenle'}
          >
            {isDragMode ? '✓ Düzenleme Modu' : '✎ Düzenle'}
          </button>
          {isDragMode && (
            <button
              onClick={handleResetLayout}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-100 text-red-700 hover:bg-red-200 transition-colors border border-red-300"
              title="Varsayılan düzeni geri yükle"
            >
              Sıfırla
            </button>
          )}
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
          <button
            onClick={() => generateMonthlyReport({
              accounts,
              transactions,
              debts,
              installments,
              score: scoreData,
              month: new Date(),
              userEmail: user?.email,
            })}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-medium rounded-lg transition-colors border border-neutral-200"
            title="Aylık PDF raporu oluştur"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            PDF Raporu
          </button>
        </div>
      </div>

      {layout && (
        <WidgetGrid
          layout={layout}
          isDragMode={isDragMode}
          isLoading={loading}
          widgets={{
            'score-1': (
              <FinancialScoreWidget score={scoreData} isLoading={loading} />
            ),
            'summary-1': (
              <MonthlySummaryWidget
                monthlyIncome={monthlyIncome}
                monthlyExpenses={monthlyExpenses}
                monthlyInstallment={monthlyInstallment}
                displayIncome={displayIncome}
                displayExpenses={displayExpenses}
                isLoading={loading}
              />
            ),
            'balance-1': (
              <AccountBalanceWidget accounts={accounts} isLoading={loading} />
            ),
            'cashflow-1': (
              <CashFlowForecastWidget
                forecast={cashFlowForecast}
                currentBalance={totalBalance}
                isLoading={loading}
                scenarioResult={scenarioResult}
                onRunScenario={(type: ScenarioType, params: Record<string, number>) => {
                  const scenario: Scenario = {
                    type,
                    label: SCENARIO_LABELS[type].title,
                    params: type === 'debt_payoff'
                      ? { paymentAmount: params.amount, paymentDate: new Date() }
                      : type === 'big_purchase'
                        ? { purchaseAmount: params.amount, installmentMonths: 12, interestRate: 2.5 }
                        : { monthlyAmount: params.amount, durationMonths: 6, startDate: new Date() },
                  };
                  const result = scenarioSimulator.simulate(scenario, accounts, transactions, debts, installments);
                  setScenarioResult(result);
                }}
                onNavigateToSimulator={() => window.location.href = '/scenario'}
              />
            ),
            'goals-1': (
              <GoalTrackerWidget
                projections={goalProjections}
                isLoading={loading}
                onNavigateToGoals={() => window.location.href = '/goals'}
              />
            ),
          }}
          onReorder={(reorderedWidgets) => {
            if (layout) {
              handleSaveLayout({
                ...layout,
                widgets: reorderedWidgets,
              });
            }
          }}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {scoreData && !isDragMode && (
          <div className="lg:col-span-2">
            <FinancialScoreCard score={scoreData.score} explanation={scoreData.explanation} />
          </div>
        )}

        {!isDragMode && (
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
        )}
      </div>

      {!isDragMode && insights.length > 0 && (
        <div className="bg-white border border-neutral-200 rounded-xl p-5">
          <CoachInsights insights={insights} />
        </div>
      )}

      {!isDragMode && (
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
      )}

      {!isDragMode && (
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
      )}
    </div>
  );
}
