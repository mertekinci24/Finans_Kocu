import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { motion, AnimatePresence } from 'framer-motion';
import { useInflationAdjustment } from '@/hooks/useInflationAdjustment';
import { dataSourceAdapter } from '@/services/supabase/adapter';
import { scoringEngine, type DetailedScore } from '@/services/scoringEngine';
import { ruleEngine, type Insight } from '@/services/ruleEngine';
import { generateMonthlyReport } from '@/services/pdfExport';
import { CURRENCY_SYMBOL } from '@/constants';
import CoachInsights from '@/components/insights/CoachInsights';
import WidgetGrid from '@/components/dashboard/WidgetGrid';

// Modular Widgets
import FinancialScoreWidget from '@/components/dashboard/widgets/FinancialScoreWidget';
import MonthlySummaryWidget from '@/components/dashboard/widgets/MonthlySummaryWidget';
import AccountBalanceWidget from '@/components/dashboard/widgets/AccountBalanceWidget';
import CashFlowForecastWidget from '@/components/dashboard/widgets/CashFlowForecastWidget';
import GoalTrackerWidget from '@/components/dashboard/widgets/GoalTrackerWidget';
import QuickSummaryWidget from '@/components/dashboard/widgets/QuickSummaryWidget';
import WNWMetricWidget from '@/components/dashboard/widgets/WNWMetricWidget';
import { InstallmentLoadWidget, TotalDebtWidget } from '@/components/dashboard/widgets/DebtOverviewWidgets';
import { RecentTransactionsWidget, ActiveInstallmentsWidget } from '@/components/dashboard/widgets/RecentActivityWidgets';
import InstallmentProjectionWidget from '@/components/dashboard/widgets/InstallmentProjectionWidget';

import { DashboardLayout, DEFAULT_DASHBOARD_LAYOUT } from '@/types/widgets';
import { SupabaseDashboardLayoutRepository } from '@/services/supabase/repositories/DashboardLayoutRepository';
import { cashFlowEngine, type CashFlowForecast } from '@/services/cashFlowEngine';
import { scenarioSimulator, type ScenarioResult, type ScenarioType, type Scenario, SCENARIO_LABELS } from '@/services/scenarioSimulator';
import { goalEngine, type GoalProjection } from '@/services/goalService';
import type { Account, Transaction, Debt, Installment, RecurringFlow } from '@/types';

export default function Dashboard(): JSX.Element {
  const { user } = useAuth();
  const { useRealValue, getInflationContext } = useInflationAdjustment();
  
  // --- STEP 1: HOIST ALL STATES (Initialization Order P0) ---
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [recurringFlows, setRecurringFlows] = useState<RecurringFlow[]>([]);
  const [scenarioResult, setScenarioResult] = useState<ScenarioResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDragMode, setIsDragMode] = useState(false);
  const [layout, setLayout] = useState<DashboardLayout | null>(null);
  const [projectionOffset, setProjectionOffset] = useState(0);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | null; id: number } | null>(null);
  
  const layoutRepository = useMemo(() => new SupabaseDashboardLayoutRepository(), []);

  // --- STEP 2: REACTIVE COMPUTATIONS (Memos) ---

  // SIRA 1: Temel Hesaplamalar (Bağımlılığı olmayanlar)
  const monthlyIncome = useMemo(() => {
    // TASK 47.27: Smart Income Sync
    const actualIncome = transactions
      .filter((t) => t.type === 'gelir')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const fixedIncome = recurringFlows
      .filter((f) => f.type === 'gelir' && f.isActive)
      .reduce((sum, f) => sum + f.amount, 0);

    // Use the higher value to provide realistic ratios even if salary hasn't been paid yet this month
    return Math.max(actualIncome, fixedIncome);
  }, [transactions, recurringFlows]);

  const monthlyExpenses = useMemo(() => {
    return transactions
      .filter((t) => t.type === 'gider')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [transactions]);

  // SIRA 2: Birinci Derece Bağımlılar (Temel verilere ihtiyaç duyanlar)
  const monthlyMRE = useMemo(() => {
    return cashFlowEngine.calculateMonthlyRequiredExpenses(transactions, installments, debts, recurringFlows);
  }, [transactions, installments, debts, recurringFlows]);

  const weightedNetWorth = useMemo(() => {
    return cashFlowEngine.calculateWeightedNetWorth(accounts, installments, debts);
  }, [accounts, installments, debts]);

  const detailedScore = useMemo(() => {
    if (loading || accounts.length === 0) return null;
    
    return scoringEngine.calculate({
      accounts,
      transactions,
      debts,
      installments,
      recurringFlows,
    });
  }, [accounts, transactions, debts, installments, recurringFlows, loading]);

  const scoreData = scenarioResult?.scenarioDetailedScore || detailedScore;

  const totalDebt = useMemo(() => {
    const debtTotal = debts
      .filter((d) => d.status === 'active')
      .reduce((sum, d) => sum + (d.remainingAmount || 0), 0);
    
    const installmentTotal = installments
      .filter((i) => i.status === 'active')
      .reduce((sum, inst) => {
        let instSum = 0;
        const first = new Date(inst.firstPaymentDate);
        const startTotal = first.getFullYear() * 12 + first.getMonth();

        for (let m = 0; m < inst.totalMonths; m++) {
          const targetTotal = startTotal + m;
          const targetYear = Math.floor(targetTotal / 12);
          const targetMonth = (targetTotal % 12) + 1;
          const monthKey = `${targetYear}-${String(targetMonth).padStart(2, '0')}`;
          
          const history = inst.paymentHistory?.[monthKey];
          if (history?.status !== 'paid') {
            instSum += (history?.amount ?? inst.monthlyPayment);
          }
        }
        return sum + instSum;
      }, 0);
      
    return debtTotal + installmentTotal;
  }, [debts, installments]);

  // SIRA 3: İkinci Derece Bağımlılar (Üstteki memo'lara ihtiyaç duyanlar)
  const [goals, setGoals] = useState<SavingGoal[]>([]);

  const goalProjections = useMemo(() => {
    if (loading || goals.length === 0) return [];
    const currentMRE = scenarioResult?.scenarioMRE ?? monthlyMRE;
    const currentIncome = monthlyIncome;
    const monthlySavings = goalEngine.calculateCurrentMonthlySavings(currentIncome, currentMRE);
    return goalEngine.projectAllGoals(goals, monthlySavings);
  }, [goals, monthlyIncome, monthlyMRE, scenarioResult, loading]);

  const cashFlowForecast = useMemo(() => {
    if (loading || accounts.length === 0) return null;
    return cashFlowEngine.forecast(
      accounts,
      transactions,
      debts,
      installments,
      recurringFlows
    );
  }, [accounts, transactions, debts, installments, recurringFlows, loading]);

  const installmentProjection = useMemo(() => {
    return cashFlowEngine.getMonthlyInstallmentProjection(installments, 80000, projectionOffset);
  }, [installments, projectionOffset]);

  const totalBalance = useMemo(() => {
    return cashFlowForecast?.startBalance ?? 0;
  }, [cashFlowForecast]);

  // SIRA 4: Diğerleri
  const currentMonthEnd = useMemo(() => {
    return new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);
  }, []);

  const monthlyInstallment = useMemo(() => {
    return installments
      .filter((i) => i.status === 'active' && new Date(i.firstPaymentDate) <= currentMonthEnd)
      .reduce((sum, i) => sum + i.monthlyPayment, 0);
  }, [installments, currentMonthEnd]);

  const rTransactions = useMemo(() => {
    return [...transactions]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
  }, [transactions]);

  const AVERAGE_INCOME = 100000;

  useEffect(() => {
    if (user?.id) {
      loadDashboardData(user.id);
      loadLayout(user.id);
    }
  }, [user?.id]);

  const loadLayout = async (userId: string) => {
    try {
      const userLayout = await layoutRepository.getLayout(userId);
      
      // ID Harmonization Protocol (v6.9): Surgical Validation
      const officialIds = DEFAULT_DASHBOARD_LAYOUT.map(w => w.id);
      const hasMismatch = userLayout.widgets.some(w => !officialIds.includes(w.id));
      
      if (hasMismatch) {
        console.warn('[Architectural Sync] Target-state mismatch detected. Purging zombie layout...');
        await handleResetLayout();
      } else {
        setLayout(userLayout);
      }
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

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now();
    setToast({ message, type, id });
    setTimeout(() => {
      setToast(prev => prev?.id === id ? null : prev);
    }, 4000);
  };

  const loadDashboardData = async (userId: string) => {
    try {
      setLoading(true);

      const [accountsData, debtsData, installmentsData, recurringFlowsData] = await Promise.all([
        dataSourceAdapter.account.getByUserId(userId),
        dataSourceAdapter.debt.getByUserId(userId),
        dataSourceAdapter.installment.getByUserId(userId),
        dataSourceAdapter.recurringFlow.getByUserId(userId),
      ]);

      setAccounts(accountsData);
      setDebts(debtsData);
      setInstallments(installmentsData);
      setRecurringFlows(recurringFlowsData);

      // Load all transactions for scoring
      const allTransactions: Transaction[] = [];
      if (accountsData.length > 0) {
        for (const acc of accountsData) {
          const startDate = new Date(new Date().getFullYear(), new Date().getMonth() - 3, 1);
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

      // Execute rules
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const recentTx = allTransactions.filter((t) => new Date(t.date) >= thirtyDaysAgo);

      const mIncome = recentTx
        .filter((t) => t.type === 'gelir')
        .reduce((sum, t) => sum + t.amount, 0);

      const mExpenses = recentTx
        .filter((t) => t.type === 'gider')
        .reduce((sum, t) => sum + t.amount, 0);

      const monthlyInstallmentsTotal = installmentsData
        .filter((i) => i.status === 'active')
        .reduce((sum, i) => sum + i.monthlyPayment, 0);

      const tBalance = accountsData.reduce((sum, a) => sum + (a.type === 'kredi_kartı' ? -a.balance : a.balance), 0);

      const generatedInsights = ruleEngine.execute(
        allTransactions,
        mIncome,
        mExpenses,
        tBalance,
        monthlyInstallmentsTotal
      );
      setInsights(generatedInsights);

      // Load goals and projections
      try {
        const { SupabaseGoalRepository } = await import('@/services/supabase/repositories/GoalRepository');
        const goalRepo = new SupabaseGoalRepository();
        const goalsData = await goalRepo.getActiveByUserId(userId);
        setGoals(goalsData); // New state to hold raw goals
      } catch (goalErr) {
        console.warn('Goals load skipped (table might not exist):', goalErr);
        setGoals([]);
      }
    } catch (err) {
      console.error('Dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCommitRestructuring = async (installmentId: string, updates: Partial<Installment>) => {
    if (!user?.id) return;
    try {
      setLoading(true);
      
      // 🚨 ATOMIC ACCOUNT SYNC (Task 46.6)
      const { targetAccountUpdate, ...installmentUpdates } = updates as any;
      if (targetAccountUpdate) {
        await dataSourceAdapter.account.update(targetAccountUpdate.accountId, {
          balance: targetAccountUpdate.newBalance
        });
      }

      // 1. Update the installment in Supabase
      await dataSourceAdapter.installment.update(installmentId, installmentUpdates);
      
      // 2. Create an audit transaction (Task 46.5)
      try {
        await dataSourceAdapter.transaction.create({
          userId: user.id,
          accountId: installmentUpdates.accountId || installments.find(i => i.id === installmentId)?.accountId || '',
          type: 'note',
          category: 'Borç Yapılandırma',
          amount: 0,
          date: new Date(),
          description: `YAPILANDIRMA: ${installmentUpdates.lenderName || 'Borç güncellendi'}`,
        });
      } catch (auditErr) {
        console.warn('Audit transaction failed:', auditErr);
      }

      showToast('Yapılandırma başarıyla uygulandı. Finansal radar güncelleniyor...', 'success');
      setScenarioResult(null);
      
      // 3. Force Global Rehydration (Atomic Refresh)
      await loadDashboardData(user.id);
      
    } catch (err) {
      console.error('Commit error:', err);
      showToast('Hata: Yapılandırma kaydedilemedi.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // 🚨 ARCHITECTURAL CHANGE (Perceived Update): 
  // Initial load still shows full screen, but subsequent commits show the UI explicitly recalculating.
  if (loading && accounts.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-neutral-950">
        <div className="text-center">
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full mx-auto mb-4" 
          />
          <p className="text-emerald-500 font-bold text-xs uppercase tracking-widest animate-pulse">
            Sistem Başlatılıyor...
          </p>
        </div>
      </div>
    );
  }

  const displayIncome = useRealValue ? Math.round(getInflationContext(monthlyIncome).real) : monthlyIncome;
  const displayExpenses = useRealValue ? Math.round(getInflationContext(monthlyExpenses).real) : monthlyExpenses;
  const displayTotalDebt = useRealValue ? Math.round(getInflationContext(totalDebt).real) : totalDebt;
  const displayWNW = useRealValue ? Math.round(getInflationContext(weightedNetWorth).real) : weightedNetWorth;

  return (
    <div className="space-y-6">
      {/* Premium Toast Notification System */}
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`fixed top-6 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-2xl shadow-2xl border flex items-center gap-3 backdrop-blur-md ${
              toast.type === 'success' 
                ? 'bg-emerald-500/90 border-emerald-400 text-white' 
                : 'bg-rose-500/90 border-rose-400 text-white'
            }`}
          >
            <span className="text-lg">{toast.type === 'success' ? '✅' : '❌'}</span>
            <span className="font-bold text-sm tracking-tight">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {detailedScore?.crisis && (
        <div className={`p-5 rounded-xl border-l-[6px] shadow-lg animate-pulse ${
          detailedScore.crisis.level === 'severe' 
            ? 'bg-red-600 border-red-900 text-white' 
            : 'bg-red-50 border-red-500 text-red-900'
        }`}>
          <div className="flex items-start gap-4">
            <span className="text-3xl">🚨</span>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-black text-base uppercase tracking-tight">
                  {detailedScore.crisis.title}
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-black/20 font-bold uppercase">
                  {scoreData.crisis.level === 'severe' ? 'Katman 0 İhlali' : 'Katman 1 İhlali'}
                </span>
              </div>
              <p className="text-sm mt-1 leading-relaxed opacity-95">
                <span className="font-bold underline decoration-2">SEBEP:</span> {detailedScore.crisis.reason}
                {detailedScore.crisis.affectedLenders && detailedScore.crisis.affectedLenders.length > 0 && (
                  <span className="ml-1 font-bold">
                    (Gecikmedeki borç: {detailedScore.crisis.affectedLenders.join(', ')})
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-neutral-900 tracking-tight">Financial Radar</h1>
          <p className="text-neutral-500 font-medium">Bireysel Finans Kontrol Paneli</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center bg-neutral-100 p-1 rounded-lg border border-neutral-200">
            <button
              onClick={() => setIsDragMode(!isDragMode)}
              className={`px-4 py-1.5 text-xs font-bold uppercase tracking-widest rounded-md transition-all ${
                isDragMode
                  ? 'bg-primary-600 text-white shadow-md'
                  : 'text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              {isDragMode ? 'Kaydet' : 'Düzenle'}
            </button>
            {isDragMode && (
              <button
                onClick={handleResetLayout}
                className="px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-rose-600 hover:bg-rose-50 rounded-md transition-all"
              >
                Sıfırla
              </button>
            )}
          </div>
          <button 
            onClick={() => generateMonthlyReport({
              detailedScore: scoreData!,
              accounts,
              transactions,
              debts,
              installments,
              insights,
              useRealValue
            })}
            className="flex items-center gap-2 px-4 py-2 bg-neutral-900 text-white text-xs font-bold uppercase tracking-widest rounded-lg hover:bg-black transition-all shadow-lg active:scale-95"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            'financial_score': (
              <FinancialScoreWidget score={scoreData} isLoading={loading} />
            ),
            'account_balance': (
              <AccountBalanceWidget accounts={accounts} isLoading={loading} />
            ),
            'cash_flow_navigator': (
              <CashFlowForecastWidget
                forecast={cashFlowForecast}
                currentBalance={totalBalance}
                monthlyIncome={monthlyIncome}
                isLoading={loading}
                scenarioResult={scenarioResult}
                onRunScenario={(type, params) => {
                  const scenario: Scenario = {
                    type,
                    label: SCENARIO_LABELS[type].title,
                    params: type === 'debt_payoff'
                      ? { paymentAmount: params.amount, paymentDate: new Date() }
                      : type === 'big_purchase'
                        ? { purchaseAmount: params.amount, installmentMonths: 12, interestRate: 2.5 }
                        : type === 'debt_restructuring'
                          ? { ...params }
                          : { monthlyAmount: params.amount, durationMonths: 6, startDate: new Date() },
                  };
                  const result = scenarioSimulator.simulate(scenario, accounts, transactions, debts, installments, recurringFlows);
                  setScenarioResult(result);
                }}
                onCommitRestructuring={handleCommitRestructuring}
                onNavigateToSimulator={() => window.location.href = '/scenario'}
                installments={installments}
                accounts={accounts}
                transactions={transactions}
                debts={debts}
                recurringFlows={recurringFlows}
              />
            ),
            'goal_tracker': (
              <GoalTrackerWidget
                projections={goalProjections}
                isLoading={loading}
                onNavigateToGoals={() => window.location.href = '/goals'}
              />
            ),
            'quick_summary': (
              <QuickSummaryWidget
                displayIncome={displayIncome}
                displayExpenses={displayExpenses}
                useRealValue={useRealValue}
              />
            ),
            'wnw_metric': (
              <WNWMetricWidget displayWNW={displayWNW} />
            ),
            'installment_load': (
              <InstallmentLoadWidget
                monthlyInstallment={monthlyInstallment}
                monthlyIncome={monthlyIncome}
              />
            ),
            'total_debt': (
              <TotalDebtWidget
                displayTotalDebt={displayTotalDebt}
                activeDebtsCount={debts.filter((d) => d.status === 'active').length}
              />
            ),
            'recent_transactions': (
              <RecentTransactionsWidget
                transactions={rTransactions}
                onNavigate={() => window.location.href = '/transactions'}
              />
            ),
            'active_installments': (
              <ActiveInstallmentsWidget
                installments={installments.filter((i) => i.status === 'active')}
                onNavigate={() => window.location.href = '/installments'}
              />
            ),
            'installment_projection': (
              <InstallmentProjectionWidget
                projection={installmentProjection}
                averageIncome={AVERAGE_INCOME}
                onOffsetChange={(delta) => setProjectionOffset(prev => prev + delta)}
              />
            ),
            'coach_insights': (
              <div className="h-full overflow-hidden sans-serif">
                <CoachInsights 
                  recommendations={scoreData?.recommendations}
                  explanation={scoreData?.explanation}
                />
              </div>
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
    </div>
  );
}
