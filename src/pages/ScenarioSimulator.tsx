import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { dataSourceAdapter } from '@/services/supabase/adapter';
import { CURRENCY_SYMBOL, ROUTES } from '@/constants';
import {
  scenarioSimulator,
  SCENARIO_LABELS,
  type ScenarioType,
  type ScenarioResult,
  type Scenario,
  type DebtPayoffParams,
  type BigPurchaseParams,
  type ExtraIncomeParams,
} from '@/services/scenarioSimulator';
import { analyzeScenario, type ScenarioAnalysisInput } from '@/services/assistant/assistantService';
import type { Account, Transaction, Debt, Installment, RecurringFlow } from '@/types';
import type { DailyBalance } from '@/services/cashFlowEngine';

export default function ScenarioSimulatorPage(): JSX.Element {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [recurringFlows, setRecurringFlows] = useState<RecurringFlow[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedType, setSelectedType] = useState<ScenarioType>('debt_payoff');
  const [result, setResult] = useState<ScenarioResult | null>(null);
  const [coachComment, setCoachComment] = useState<string>('');
  const [isSimulating, setIsSimulating] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Parametre state'leri
  const [paymentAmount, setPaymentAmount] = useState(20000);
  const [purchaseAmount, setPurchaseAmount] = useState(150000);
  const [installmentMonths, setInstallmentMonths] = useState(12);
  const [interestRate, setInterestRate] = useState(2.5);
  const [extraIncomeMonthly, setExtraIncomeMonthly] = useState(5000);
  const [extraIncomeDuration, setExtraIncomeDuration] = useState(6);

  useEffect(() => {
    if (user?.id) loadData(user.id);
  }, [user?.id]);

  const loadData = async (userId: string) => {
    try {
      setLoading(true);
      const [acc, dbt, inst, flows] = await Promise.all([
        dataSourceAdapter.account.getByUserId(userId),
        dataSourceAdapter.debt.getByUserId(userId),
        dataSourceAdapter.installment.getByUserId(userId),
        dataSourceAdapter.recurringFlow.getByUserId(userId),
      ]);
      setAccounts(acc);
      setDebts(dbt);
      setInstallments(inst);
      setRecurringFlows(flows);

      const allTx: Transaction[] = [];
      for (const account of acc) {
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 3);
        const txs = await dataSourceAdapter.transaction.getByDateRange(account.id, startDate, new Date());
        allTx.push(...txs);
      }
      setTransactions(allTx);
    } catch (err) {
      console.error('Scenario data load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSimulate = useCallback(async () => {
    if (accounts.length === 0) return;

    setIsSimulating(true);
    setCoachComment('');

    try {
      let scenario: Scenario;

      switch (selectedType) {
        case 'debt_payoff':
          scenario = {
            type: 'debt_payoff',
            label: SCENARIO_LABELS.debt_payoff.title,
            params: {
              paymentAmount,
              paymentDate: new Date(),
            } as DebtPayoffParams,
          };
          break;
        case 'big_purchase':
          scenario = {
            type: 'big_purchase',
            label: SCENARIO_LABELS.big_purchase.title,
            params: {
              purchaseAmount,
              installmentMonths,
              interestRate,
            } as BigPurchaseParams,
          };
          break;
        case 'extra_income':
          scenario = {
            type: 'extra_income',
            label: SCENARIO_LABELS.extra_income.title,
            params: {
              monthlyAmount: extraIncomeMonthly,
              durationMonths: extraIncomeDuration,
              startDate: new Date(),
            } as ExtraIncomeParams,
          };
          break;
      }

      const simResult = scenarioSimulator.simulate(
        scenario,
        accounts,
        transactions,
        debts,
        installments,
        recurringFlows,
        180
      );

      setResult(simResult);

      // Koç yorumu
      setIsAnalyzing(true);
      const apiKey = localStorage.getItem('fk_claude_api_key');
      const analysisInput: ScenarioAnalysisInput = {
        scenarioDescription: scenarioSimulator.buildScenarioDescription(scenario),
        baselineScore: simResult.baselineScore,
        scenarioScore: simResult.scenarioScore,
        scoreDelta: simResult.scoreDelta,
        cashTightnessDate: simResult.cashTightnessDate,
        breakEvenMonth: simResult.breakEvenMonth,
        riskLevel: simResult.riskLevel,
        recommendations: simResult.recommendations,
        baselineEndBalance: simResult.summary.baselineEndBalance,
        scenarioEndBalance: simResult.summary.scenarioEndBalance,
      };

      const comment = await analyzeScenario(analysisInput, apiKey);
      setCoachComment(comment);
    } catch (err) {
      console.error('Simulation error:', err);
    } finally {
      setIsSimulating(false);
      setIsAnalyzing(false);
    }
  }, [
    selectedType, accounts, transactions, debts, installments,
    paymentAmount, purchaseAmount, installmentMonths, interestRate,
    extraIncomeMonthly, extraIncomeDuration,
  ]);

  const fmt = (n: number) =>
    `${CURRENCY_SYMBOL}${Math.abs(n).toLocaleString('tr-TR', { maximumFractionDigits: 0 })}`;

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

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900">🔮 Senaryo Simülatörü</h1>
          <p className="text-neutral-600 mt-1 text-sm">
            Finansal kararlarının geleceğe etkisini test et
          </p>
        </div>
        <button
          onClick={() => navigate(ROUTES.DASHBOARD)}
          className="px-3 py-1.5 text-xs font-medium bg-neutral-100 text-neutral-600 rounded-lg hover:bg-neutral-200 transition-colors border border-neutral-200"
        >
          ← Kontrol Paneli
        </button>
      </div>

      {/* Senaryo Kartları */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(Object.keys(SCENARIO_LABELS) as ScenarioType[]).map((type) => (
          <motion.button
            key={type}
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => { setSelectedType(type); setResult(null); setCoachComment(''); }}
            className={`p-5 rounded-xl border-2 text-left transition-all ${
              selectedType === type
                ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-md shadow-blue-100'
                : 'border-neutral-200 bg-white hover:border-neutral-300 hover:shadow-sm'
            }`}
          >
            <div className="text-3xl mb-2">{SCENARIO_LABELS[type].icon}</div>
            <div className="text-sm font-semibold text-neutral-900">{SCENARIO_LABELS[type].title}</div>
            <div className="text-xs text-neutral-500 mt-1">{SCENARIO_LABELS[type].description}</div>
          </motion.button>
        ))}
      </div>

      {/* Parametre Formu */}
      <motion.div
        layout
        className="bg-white border border-neutral-200 rounded-xl p-6 space-y-5"
      >
        <h2 className="text-sm font-semibold text-neutral-900 flex items-center gap-2">
          <span>{SCENARIO_LABELS[selectedType].icon}</span>
          {SCENARIO_LABELS[selectedType].title} — Parametreler
        </h2>

        <AnimatePresence mode="wait">
          <motion.div
            key={selectedType}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {selectedType === 'debt_payoff' && (
              <DebtPayoffForm
                paymentAmount={paymentAmount}
                setPaymentAmount={setPaymentAmount}
                debts={debts}
                fmt={fmt}
              />
            )}
            {selectedType === 'big_purchase' && (
              <BigPurchaseForm
                purchaseAmount={purchaseAmount}
                setPurchaseAmount={setPurchaseAmount}
                installmentMonths={installmentMonths}
                setInstallmentMonths={setInstallmentMonths}
                interestRate={interestRate}
                setInterestRate={setInterestRate}
                fmt={fmt}
              />
            )}
            {selectedType === 'extra_income' && (
              <ExtraIncomeForm
                monthlyAmount={extraIncomeMonthly}
                setMonthlyAmount={setExtraIncomeMonthly}
                duration={extraIncomeDuration}
                setDuration={setExtraIncomeDuration}
                fmt={fmt}
              />
            )}
          </motion.div>
        </AnimatePresence>

        <button
          onClick={handleSimulate}
          disabled={isSimulating}
          className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSimulating ? (
            <span className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Hesaplanıyor...
            </span>
          ) : (
            '🚀 Simülasyonu Çalıştır'
          )}
        </button>
      </motion.div>

      {/* Sonuçlar */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="space-y-6"
          >
            {/* Grafik */}
            <div className="bg-white border border-neutral-200 rounded-xl p-6">
              <h2 className="text-sm font-semibold text-neutral-900 mb-4">6 Aylık Nakit Akışı Karşılaştırması</h2>
              <FullChart
                baseline={result.baselineForecast}
                scenario={result.scenarioForecast}
              />
              <div className="flex items-center gap-6 mt-3 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-0.5 bg-emerald-500 rounded" />
                  <span className="text-neutral-600">Mevcut Durum</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 border-t-2 border-dashed border-orange-500" />
                  <span className="text-neutral-600">Senaryo Durumu</span>
                </div>
              </div>
            </div>

            {/* Skor Karşılaştırma */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <ScoreDelta label="Mevcut Skor" value={result.baselineScore} />
              <ScoreDeltaArrow delta={result.scoreDelta} riskLevel={result.riskLevel} />
              <ScoreDelta label="Senaryo Skoru" value={result.scenarioScore} highlight />
            </div>

            {/* Detay Kartları */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <DetailCard
                label="6 Ay Sonu (Mevcut)"
                value={fmt(result.summary.baselineEndBalance)}
                color="blue"
              />
              <DetailCard
                label="6 Ay Sonu (Senaryo)"
                value={fmt(result.summary.scenarioEndBalance)}
                color={result.summary.scenarioEndBalance >= result.summary.baselineEndBalance ? 'green' : 'red'}
              />
              <DetailCard
                label="Nakit Riski"
                value={result.cashTightnessDate
                  ? new Date(result.cashTightnessDate).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })
                  : 'Yok'}
                color={result.cashTightnessDate ? 'red' : 'green'}
              />
              <DetailCard
                label="Kâra Geçiş"
                value={result.breakEvenMonth ? `${result.breakEvenMonth}. ay` : 'Hemen'}
                color="blue"
              />
            </div>

            {/* Öneriler */}
            {result.recommendations.length > 0 && (
              <div className="bg-white border border-neutral-200 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-neutral-900 mb-3">📋 Motor Önerileri</h3>
                <ul className="space-y-2">
                  {result.recommendations.map((rec, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-neutral-700">
                      <span className="text-blue-500 text-xs mt-0.5">●</span>
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Koç Yorumu */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="bg-gradient-to-br from-indigo-50 via-blue-50 to-purple-50 border border-indigo-200 rounded-xl p-6"
            >
              <h3 className="text-sm font-semibold text-indigo-900 mb-3 flex items-center gap-2">
                🤖 Koç Yorumu
                {isAnalyzing && (
                  <span className="text-xs text-indigo-500 animate-pulse">Analiz ediliyor...</span>
                )}
              </h3>
              {coachComment ? (
                <div className="text-sm text-neutral-800 whitespace-pre-line leading-relaxed">
                  {coachComment}
                </div>
              ) : (
                <div className="text-sm text-neutral-500 italic">
                  Simülasyonu çalıştırın, koç yorumunu burada göreceksiniz.
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Alt Bileşenler ─────────────────────────────────────────────────

function DebtPayoffForm({
  paymentAmount, setPaymentAmount, debts, fmt,
}: {
  paymentAmount: number;
  setPaymentAmount: (v: number) => void;
  debts: Debt[];
  fmt: (n: number) => string;
}) {
  const activeDebts = debts.filter((d) => d.status === 'active');

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-neutral-700 mb-1.5">Ödeme Tutarı</label>
        <input
          type="number"
          value={paymentAmount}
          onChange={(e) => setPaymentAmount(Number(e.target.value))}
          className="w-full px-4 py-2.5 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
          min={0}
          step={5000}
        />
        <div className="flex gap-2 mt-2">
          {[10000, 20000, 50000].map((preset) => (
            <button
              key={preset}
              onClick={() => setPaymentAmount(preset)}
              className="px-3 py-1 text-xs bg-neutral-100 text-neutral-600 rounded-md hover:bg-neutral-200 transition-colors"
            >
              {fmt(preset)}
            </button>
          ))}
        </div>
      </div>
      {activeDebts.length > 0 && (
        <div className="bg-neutral-50 p-3 rounded-lg border border-neutral-200">
          <p className="text-xs font-medium text-neutral-700 mb-2">Aktif Borçlarınız:</p>
          {activeDebts.slice(0, 3).map((d) => (
            <div key={d.id} className="flex justify-between text-xs text-neutral-600 py-1">
              <span>{d.creditorName}</span>
              <span className="font-medium">{fmt(d.remainingAmount)} (₺{d.monthlyPayment.toLocaleString('tr-TR')}/ay)</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function BigPurchaseForm({
  purchaseAmount, setPurchaseAmount,
  installmentMonths, setInstallmentMonths,
  interestRate, setInterestRate,
  fmt,
}: {
  purchaseAmount: number;
  setPurchaseAmount: (v: number) => void;
  installmentMonths: number;
  setInstallmentMonths: (v: number) => void;
  interestRate: number;
  setInterestRate: (v: number) => void;
  fmt: (n: number) => string;
}) {
  const monthlyPayment = interestRate > 0
    ? (purchaseAmount * (interestRate / 100 / 12) * Math.pow(1 + interestRate / 100 / 12, installmentMonths)) /
      (Math.pow(1 + interestRate / 100 / 12, installmentMonths) - 1)
    : purchaseAmount / installmentMonths;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-medium text-neutral-700 mb-1.5">Alım Tutarı (₺)</label>
          <input
            type="number"
            value={purchaseAmount}
            onChange={(e) => setPurchaseAmount(Number(e.target.value))}
            className="w-full px-4 py-2.5 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
            min={0}
            step={10000}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-neutral-700 mb-1.5">Taksit Sayısı</label>
          <select
            value={installmentMonths}
            onChange={(e) => setInstallmentMonths(Number(e.target.value))}
            className="w-full px-4 py-2.5 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm bg-white"
          >
            {[3, 6, 9, 12, 18, 24, 36].map((m) => (
              <option key={m} value={m}>{m} Taksit</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-neutral-700 mb-1.5">Aylık Faiz (%)</label>
          <input
            type="number"
            value={interestRate}
            onChange={(e) => setInterestRate(Number(e.target.value))}
            className="w-full px-4 py-2.5 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
            min={0}
            step={0.1}
          />
        </div>
      </div>
      <div className="bg-amber-50 p-3 rounded-lg border border-amber-200">
        <p className="text-xs text-amber-800">
          Aylık Taksit: <span className="font-bold">{fmt(Math.round(monthlyPayment))}</span> × {installmentMonths} ay =
          Toplam <span className="font-bold">{fmt(Math.round(monthlyPayment * installmentMonths))}</span>
        </p>
      </div>
    </div>
  );
}

function ExtraIncomeForm({
  monthlyAmount, setMonthlyAmount,
  duration, setDuration,
  fmt,
}: {
  monthlyAmount: number;
  setMonthlyAmount: (v: number) => void;
  duration: number;
  setDuration: (v: number) => void;
  fmt: (n: number) => string;
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-neutral-700 mb-1.5">Aylık Ek Gelir (₺)</label>
          <input
            type="number"
            value={monthlyAmount}
            onChange={(e) => setMonthlyAmount(Number(e.target.value))}
            className="w-full px-4 py-2.5 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
            min={0}
            step={1000}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-neutral-700 mb-1.5">Süre (Ay)</label>
          <input
            type="number"
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            className="w-full px-4 py-2.5 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
            min={1}
            max={24}
          />
        </div>
      </div>
      <div className="bg-green-50 p-3 rounded-lg border border-green-200">
        <p className="text-xs text-green-800">
          Toplam Ek Gelir: <span className="font-bold">{fmt(monthlyAmount * duration)}</span> ({duration} ay × {fmt(monthlyAmount)})
        </p>
      </div>
    </div>
  );
}

// ─── Grafik (Tam Ekran) ─────────────────────────────────────────────
function FullChart({
  baseline, scenario,
}: {
  baseline: DailyBalance[];
  scenario: DailyBalance[];
}) {
  const sampleRate = Math.max(1, Math.floor(baseline.length / 60));
  const sampledBaseline = baseline.filter((_, i) => i % sampleRate === 0 || i === baseline.length - 1);
  const sampledScenario = scenario.filter((_, i) => i % sampleRate === 0 || i === scenario.length - 1);

  const allBalances = [...sampledBaseline.map((d) => d.balance), ...sampledScenario.map((d) => d.balance)];
  const maxBalance = Math.max(...allBalances, 1);
  const minBalanceVal = Math.min(...allBalances, 0);
  const range = maxBalance - minBalanceVal || 1;

  const toPoints = (data: DailyBalance[]) =>
    data.map((db, i) => {
      const x = (i / Math.max(data.length - 1, 1)) * 800;
      const y = 180 - ((db.balance - minBalanceVal) / range) * 160;
      return `${x},${y}`;
    }).join(' ');

  const zeroLine = 180 - ((0 - minBalanceVal) / range) * 160;

  // Ay etiketleri
  const monthLabels: { x: number; label: string }[] = [];
  for (let m = 0; m < 6; m++) {
    const date = new Date();
    date.setMonth(date.getMonth() + m);
    const x = (m / 5) * 800;
    monthLabels.push({
      x,
      label: date.toLocaleDateString('tr-TR', { month: 'short' }),
    });
  }

  return (
    <div className="h-56 bg-neutral-50 rounded-lg border border-neutral-200 overflow-hidden">
      <svg viewBox="0 0 800 200" className="w-full h-full" preserveAspectRatio="none">
        {/* Grid çizgileri */}
        {[0, 40, 80, 120, 160].map((y) => (
          <line key={y} x1="0" y1={y + 10} x2="800" y2={y + 10} stroke="#e5e7eb" strokeWidth="0.5" />
        ))}

        {/* Sıfır çizgisi */}
        {minBalanceVal < 0 && (
          <line x1="0" y1={zeroLine} x2="800" y2={zeroLine} stroke="#ef4444" strokeWidth="1" strokeDasharray="6,3" />
        )}

        {/* Baseline (Yeşil, düz) */}
        <polyline
          points={toPoints(sampledBaseline)}
          fill="none"
          stroke="#10b981"
          strokeWidth="3"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Senaryo (Turuncu, kesikli) */}
        <polyline
          points={toPoints(sampledScenario)}
          fill="none"
          stroke="#f97316"
          strokeWidth="2.5"
          strokeDasharray="8,5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Ay etiketleri */}
        {monthLabels.map((ml, i) => (
          <text
            key={i}
            x={ml.x + 10}
            y="195"
            fontSize="10"
            fill="#9ca3af"
            fontFamily="system-ui"
          >
            {ml.label}
          </text>
        ))}
      </svg>
    </div>
  );
}

// ─── Küçük Yardımcı Bileşenler ─────────────────────────────────────
function ScoreDelta({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  const getColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-blue-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className={`bg-white border rounded-xl p-5 text-center ${highlight ? 'border-blue-300 shadow-md shadow-blue-50' : 'border-neutral-200'}`}>
      <p className="text-xs text-neutral-500 mb-2">{label}</p>
      <p className={`text-4xl font-bold ${getColor(value)}`}>{value}</p>
      <p className="text-xs text-neutral-400 mt-1">/ 100</p>
    </div>
  );
}

function ScoreDeltaArrow({ delta, riskLevel }: { delta: number; riskLevel: string }) {
  const riskColors: Record<string, string> = {
    safe: 'bg-green-100 text-green-700 border-green-200',
    moderate: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    risky: 'bg-red-100 text-red-700 border-red-200',
  };
  const riskLabels: Record<string, string> = {
    safe: '✅ Güvenli',
    moderate: '🟡 Orta Risk',
    risky: '🔴 Yüksek Risk',
  };

  return (
    <div className="flex flex-col items-center justify-center gap-2">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        className={`text-2xl font-bold ${
          delta > 0 ? 'text-green-600' : delta < 0 ? 'text-red-600' : 'text-neutral-500'
        }`}
      >
        {delta > 0 ? `+${delta}` : delta === 0 ? '±0' : delta}
      </motion.div>
      <span className="text-xs text-neutral-500">puan farkı</span>
      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${riskColors[riskLevel]}`}>
        {riskLabels[riskLevel]}
      </span>
    </div>
  );
}

function DetailCard({ label, value, color }: { label: string; value: string; color: string }) {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 border-blue-200 text-blue-900',
    green: 'bg-green-50 border-green-200 text-green-900',
    red: 'bg-red-50 border-red-200 text-red-900',
  };

  return (
    <div className={`p-3 rounded-lg border ${colorMap[color]}`}>
      <p className="text-xs text-neutral-600 mb-1">{label}</p>
      <p className="text-sm font-bold">{value}</p>
    </div>
  );
}
