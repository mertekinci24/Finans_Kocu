import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CashFlowForecast, DailyBalance } from '@/services/cashFlowEngine';
import { CURRENCY_SYMBOL } from '@/constants';
import type { ScenarioResult, ScenarioType } from '@/services/scenarioSimulator';
import { SCENARIO_LABELS } from '@/services/scenarioSimulator';

interface CashFlowForecastWidgetProps {
  forecast: CashFlowForecast | null;
  currentBalance: number;
  isLoading: boolean;
  scenarioResult?: ScenarioResult | null;
  onRunScenario?: (type: ScenarioType, params: Record<string, number>) => void;
  onNavigateToSimulator?: () => void;
}

export default function CashFlowForecastWidget({
  forecast,
  currentBalance,
  isLoading,
  scenarioResult,
  onRunScenario,
  onNavigateToSimulator,
}: CashFlowForecastWidgetProps): JSX.Element {
  const [scenarioMode, setScenarioMode] = useState(false);
  const [activeScenario, setActiveScenario] = useState<ScenarioType>('debt_payoff');
  const [amount, setAmount] = useState<number>(20000);

  if (isLoading || !forecast) {
    return (
      <div className="space-y-3 animate-pulse">
        <div className="h-6 bg-neutral-200 rounded w-32" />
        <div className="h-40 bg-neutral-200 rounded" />
      </div>
    );
  }

  const fmt = (n: number) =>
    `${CURRENCY_SYMBOL}${Math.abs(n).toLocaleString('tr-TR', { maximumFractionDigits: 0 })}`;

  const hasScenarioData = scenarioResult !== null && scenarioResult !== undefined;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-neutral-900">30 Günlük Nakit Akışı</h3>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setScenarioMode(!scenarioMode)}
            className={`px-2.5 py-1 text-xs rounded-md font-medium transition-all ${
              scenarioMode
                ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-sm'
                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
            }`}
            title="Senaryo simülatörü"
          >
            {scenarioMode ? '🔮 Senaryo: Açık' : '🔮 Senaryo'}
          </button>
          {onNavigateToSimulator && (
            <button
              onClick={onNavigateToSimulator}
              className="px-2 py-1 text-xs rounded-md font-medium bg-neutral-100 text-neutral-500 hover:bg-neutral-200 transition-colors"
              title="Detaylı Simülatör"
            >
              ↗
            </button>
          )}
        </div>
      </div>

      {/* SVG Grafik — Side-by-Side */}
      <ChartArea
        forecast={forecast}
        scenarioResult={scenarioResult}
        currentBalance={currentBalance}
        hasScenarioData={hasScenarioData}
      />

      {/* Etiketler */}
      {hasScenarioData && (
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-0.5 bg-emerald-500 rounded" />
            <span className="text-neutral-600">Mevcut Durum</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-0.5 bg-orange-500 rounded" style={{ borderTop: '2px dashed #f97316' }} />
            <span className="text-neutral-600">Senaryo</span>
          </div>
        </div>
      )}

      {/* Metrik Kartları */}
      <MetricCards
        forecast={forecast}
        currentBalance={currentBalance}
        scenarioResult={scenarioResult}
        hasScenarioData={hasScenarioData}
        fmt={fmt}
      />

      {/* Senaryo Modu Panel */}
      <AnimatePresence>
        {scenarioMode && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-neutral-200 pt-3 space-y-3"
          >
            {/* Senaryo Tip Seçici */}
            <div className="flex gap-1.5">
              {(Object.keys(SCENARIO_LABELS) as ScenarioType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => setActiveScenario(type)}
                  className={`flex-1 px-2 py-1.5 text-xs rounded-md font-medium transition-all ${
                    activeScenario === type
                      ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-sm'
                      : 'bg-neutral-50 text-neutral-500 border border-neutral-200 hover:bg-neutral-100'
                  }`}
                >
                  <span className="block">{SCENARIO_LABELS[type].icon}</span>
                  <span className="block mt-0.5 truncate">{SCENARIO_LABELS[type].title}</span>
                </button>
              ))}
            </div>

            {/* Parametre Giriş */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-neutral-700 block">
                {activeScenario === 'debt_payoff' && 'Ödeme Tutarı (₺)'}
                {activeScenario === 'big_purchase' && 'Alım Tutarı (₺)'}
                {activeScenario === 'extra_income' && 'Aylık Ek Gelir (₺)'}
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="flex-1 px-3 py-1.5 text-xs border border-neutral-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
                  min={0}
                  step={1000}
                  placeholder="Tutar girin..."
                />
                <button
                  onClick={() => {
                    if (onRunScenario && amount > 0) {
                      onRunScenario(activeScenario, { amount });
                    }
                  }}
                  disabled={amount <= 0}
                  className="px-3 py-1.5 text-xs font-medium bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-md hover:from-blue-600 hover:to-indigo-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                >
                  Hesapla
                </button>
              </div>
              <p className="text-xs text-neutral-400 italic">
                {SCENARIO_LABELS[activeScenario].description}
              </p>
            </div>

            {/* Senaryo Skor Karşılaştırma */}
            {hasScenarioData && (
              <ScoreComparison scenarioResult={scenarioResult!} fmt={fmt} />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tavsiyeler */}
      {forecast.recommendations.length > 0 && !scenarioMode && (
        <div className="border-t border-neutral-200 pt-3">
          <p className="text-xs font-medium text-neutral-700 mb-2">Tavsiyeler</p>
          <ul className="space-y-1">
            {forecast.recommendations.slice(0, 2).map((rec, i) => (
              <li key={i} className="text-xs text-neutral-600 flex gap-1">
                <span className="flex-shrink-0">•</span>
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-xs text-neutral-500 italic">
        ⓘ Bu tahmin geçmiş veriler ve tekrarlayan işlemlere dayanır, kesin yatırım tavsiyesi değildir.
      </p>
    </div>
  );
}

// ─── SVG Grafik Bileşeni ────────────────────────────────────────────
function ChartArea({
  forecast,
  scenarioResult,
  currentBalance,
  hasScenarioData,
}: {
  forecast: CashFlowForecast;
  scenarioResult?: ScenarioResult | null;
  currentBalance: number;
  hasScenarioData: boolean;
}) {
  const maxDataPoints = 31;

  const baselinePoints = useMemo(() => {
    return buildPolylinePoints(forecast.dailyBalances.slice(0, maxDataPoints), currentBalance);
  }, [forecast.dailyBalances, currentBalance]);

  const scenarioPoints = useMemo(() => {
    if (!hasScenarioData || !scenarioResult) return '';
    return buildPolylinePoints(scenarioResult.scenarioForecast.slice(0, maxDataPoints), currentBalance);
  }, [scenarioResult, currentBalance, hasScenarioData]);

  return (
    <div className="h-36 relative bg-neutral-50 rounded-lg border border-neutral-200 overflow-hidden">
      <svg viewBox="0 0 400 120" className="w-full h-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id="baselineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="scenarioGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#f97316" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#f97316" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Baseline çizgi (Mavi-Yeşil, düz) */}
        <polyline
          points={baselinePoints}
          fill="none"
          stroke="#10b981"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Senaryo çizgi (Turuncu, kesikli) */}
        {hasScenarioData && scenarioPoints && (
          <polyline
            points={scenarioPoints}
            fill="none"
            stroke="#f97316"
            strokeWidth="2"
            strokeDasharray="6,4"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}

        {/* Nakit tıkanıklığı çizgisi */}
        {forecast.hasCashTightness && (
          <line
            x1="0" y1="100" x2="400" y2="100"
            stroke="#f87171"
            strokeWidth="1"
            strokeDasharray="4,4"
          />
        )}
      </svg>

      {/* Nakit riski overlay */}
      {forecast.hasCashTightness && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center text-xs text-red-600 font-medium bg-red-50/80 px-2 py-1 rounded">
            ⚠ Nakit Riski
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Metrik Kartları ────────────────────────────────────────────────
function MetricCards({
  forecast,
  currentBalance,
  scenarioResult,
  hasScenarioData,
  fmt,
}: {
  forecast: CashFlowForecast;
  currentBalance: number;
  scenarioResult?: ScenarioResult | null;
  hasScenarioData: boolean;
  fmt: (n: number) => string;
}) {
  return (
    <div className="grid grid-cols-3 gap-2 text-xs">
      <div className="bg-blue-50 p-2 rounded border border-blue-200">
        <p className="text-neutral-600">Başlangıç</p>
        <p className="font-bold text-blue-900">{fmt(currentBalance)}</p>
      </div>
      <div
        className={`${
          forecast.projectedEndBalance >= currentBalance * 0.8
            ? 'bg-green-50 border-green-200'
            : 'bg-red-50 border-red-200'
        } p-2 rounded border`}
      >
        <p className="text-neutral-600">30 Gün Sonra</p>
        <p className="font-bold">{fmt(forecast.projectedEndBalance)}</p>
        {hasScenarioData && scenarioResult && (
          <p className="text-orange-600 font-medium mt-0.5">
            → {fmt(scenarioResult.summary.scenarioEndBalance)}
          </p>
        )}
      </div>
      <div
        className={`${
          forecast.minBalance >= 0 ? 'bg-neutral-50 border-neutral-200' : 'bg-red-50 border-red-200'
        } p-2 rounded border`}
      >
        <p className="text-neutral-600">En Düşük</p>
        <p className="font-bold">
          {forecast.minBalance >= 0 ? fmt(forecast.minBalance) : `−${fmt(forecast.minBalance)}`}
        </p>
        {hasScenarioData && scenarioResult && (
          <p className="text-orange-600 font-medium mt-0.5">
            → {scenarioResult.summary.scenarioMinBalance >= 0
              ? fmt(scenarioResult.summary.scenarioMinBalance)
              : `−${fmt(scenarioResult.summary.scenarioMinBalance)}`}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Skor Karşılaştırma ────────────────────────────────────────────
function ScoreComparison({
  scenarioResult,
  fmt,
}: {
  scenarioResult: ScenarioResult;
  fmt: (n: number) => string;
}) {
  const deltaColor =
    scenarioResult.scoreDelta > 0
      ? 'text-green-600'
      : scenarioResult.scoreDelta < 0
        ? 'text-red-600'
        : 'text-neutral-600';

  const riskColors: Record<string, string> = {
    safe: 'bg-green-100 text-green-700',
    moderate: 'bg-yellow-100 text-yellow-700',
    risky: 'bg-red-100 text-red-700',
  };
  const riskLabels: Record<string, string> = {
    safe: '✅ Güvenli',
    moderate: '🟡 Orta Risk',
    risky: '🔴 Yüksek Risk',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-indigo-50 to-blue-50 p-3 rounded-lg border border-indigo-200 space-y-2"
    >
      <div className="flex items-center justify-between">
        <div className="text-center">
          <p className="text-xs text-neutral-500">Mevcut Skor</p>
          <p className="text-xl font-bold text-neutral-900">{scenarioResult.baselineScore}</p>
        </div>
        <div className="text-center">
          <p className={`text-lg font-bold ${deltaColor}`}>
            {scenarioResult.scoreDelta >= 0 ? '→ +' : '→ '}{scenarioResult.scoreDelta}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-neutral-500">Senaryo Skoru</p>
          <p className={`text-xl font-bold ${deltaColor}`}>{scenarioResult.scenarioScore}</p>
        </div>
      </div>

      <div className="flex items-center justify-between pt-1 border-t border-indigo-200">
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${riskColors[scenarioResult.riskLevel]}`}>
          {riskLabels[scenarioResult.riskLevel]}
        </span>
        {scenarioResult.breakEvenMonth && (
          <span className="text-xs text-neutral-600">
            📅 {scenarioResult.breakEvenMonth}. ayda kâra geçiş
          </span>
        )}
      </div>

      {scenarioResult.recommendations.length > 0 && (
        <div className="pt-1">
          <p className="text-xs text-indigo-700 font-medium">
            {scenarioResult.recommendations[0]}
          </p>
        </div>
      )}
    </motion.div>
  );
}

// ─── Yardımcı Fonksiyonlar ──────────────────────────────────────────
function buildPolylinePoints(dailyBalances: DailyBalance[], referenceBalance: number): string {
  if (dailyBalances.length === 0) return '';

  const maxBalance = Math.max(
    referenceBalance,
    ...dailyBalances.map((db) => Math.abs(db.balance))
  );
  const normalizer = maxBalance > 0 ? maxBalance : 1;

  return dailyBalances
    .map((db, i) => {
      const x = (i / Math.max(dailyBalances.length - 1, 1)) * 400;
      const normalizedBalance = Math.max(0, db.balance) / normalizer;
      const y = 110 - Math.min(normalizedBalance * 100, 100);
      return `${x},${y}`;
    })
    .join(' ');
}
