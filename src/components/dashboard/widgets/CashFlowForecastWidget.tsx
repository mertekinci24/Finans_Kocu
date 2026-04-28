import { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CashFlowForecast, DailyBalance } from '@/services/cashFlowEngine';
import { CURRENCY_SYMBOL } from '@/constants';
import { SCENARIO_LABELS, type ScenarioResult, type ScenarioType } from '@/services/scenarioSimulator';
import { ScenarioNavigator } from './ScenarioNavigator';
import type { Installment, Account, Transaction, Debt, RecurringFlow } from '@/types';

interface CashFlowForecastWidgetProps {
  forecast: CashFlowForecast | null;
  currentBalance: number;
  monthlyIncome: number;
  isLoading: boolean;
  scenarioResult?: ScenarioResult | null;
  onRunScenario?: (type: ScenarioType, params: any) => void;
  onCommitRestructuring?: (installmentId: string, updates: Partial<Installment>) => void;
  onResetScenario?: () => void;
  onNavigateToSimulator?: () => void;
  installments: Installment[];
  accounts: Account[];
  transactions: Transaction[];
  debts: Debt[];
  recurringFlows: RecurringFlow[];
}

export default function CashFlowForecastWidget({
  forecast,
  currentBalance,
  monthlyIncome,
  isLoading,
  scenarioResult,
  onRunScenario,
  onCommitRestructuring,
  onResetScenario,
  onNavigateToSimulator,
  installments,
  accounts,
  transactions,
  debts,
  recurringFlows,
}: CashFlowForecastWidgetProps): JSX.Element {
  const [scenarioMode, setScenarioMode] = useState(false);
  const [activeScenario, setActiveScenario] = useState<ScenarioType>('debt_payoff');
  const [amount, setAmount] = useState<number>(20000);
  const [showTheoryModal, setShowTheoryModal] = useState(false);

  if (isLoading || !forecast) {
    return (
      <div className="space-y-3 animate-pulse">
        <div className="h-6 bg-neutral-200 rounded w-32" />
        <div className="h-40 bg-neutral-200 rounded" />
      </div>
    );
  }

  const fmt = (n: number) =>
    `${CURRENCY_SYMBOL}${n.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}`;

  const hasScenarioData = scenarioResult !== null && scenarioResult !== undefined;

  return (
    <div className="space-y-4 bg-[#000000] p-4 lg:p-5 rounded-3xl border border-zinc-800 relative shadow-2xl overflow-hidden group hover:border-zinc-700 transition-colors">
      {/* Background Accent */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -mr-32 -mt-32" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
        <div className="flex items-center gap-2">
          <h3 className="text-[13px] font-black text-zinc-100 tracking-wider uppercase">Nakit Akışı Navigatörü</h3>
          <button 
            onClick={() => setShowTheoryModal(true)}
            className="w-5 h-5 flex items-center justify-center rounded-full bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors"
            title="Nasıl Çalışır?"
          >
            <span className="text-[10px] font-bold italic">i</span>
          </button>
        </div>
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

      {/* Interactive SVG Grafik */}
      <div className="relative z-10">
        <InteractiveCashFlowChart
          forecast={forecast}
          scenarioResult={scenarioResult}
          currentBalance={currentBalance}
          monthlyIncome={monthlyIncome}
          hasScenarioData={hasScenarioData}
          fmt={fmt}
        />
      </div>

      {/* Etiketler */}
      {hasScenarioData && (
        <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-wider relative z-10 pt-2">
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-0.5 bg-[#10b981] rounded shadow-[0_0_5px_#10b981]" />
            <span className="text-zinc-400">Mevcut Durum</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-0.5 bg-[#f97316] rounded border-t border-dashed border-[#f97316] shadow-[0_0_5px_#f97316]" />
            <span className="text-zinc-400">Senaryo</span>
          </div>
        </div>
      )}

      {/* Metrik Kartları */}
      <div className="relative z-10 pt-2">
        <MetricCards
          forecast={forecast}
          currentBalance={currentBalance}
          scenarioResult={scenarioResult}
          hasScenarioData={hasScenarioData}
          fmt={fmt}
        />
      </div>

      {/* Senaryo Modu Panel */}
      <AnimatePresence>
        {scenarioMode && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-zinc-800 pt-3 space-y-3 relative z-10"
          >
            {/* Senaryo Tip Seçici */}
            <div className="flex gap-1.5">
              {(Object.keys(SCENARIO_LABELS) as ScenarioType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => setActiveScenario(type)}
                  className={`flex-1 px-2 py-1.5 text-xs rounded-xl font-bold uppercase tracking-wider transition-all border ${
                    activeScenario === type
                      ? 'bg-zinc-800 text-white border-zinc-600 shadow-sm'
                      : 'bg-zinc-900/50 text-zinc-500 border-zinc-800 hover:text-zinc-300'
                  }`}
                >
                  <span className="block text-base">{SCENARIO_LABELS[type].icon}</span>
                  <span className="block mt-1 text-[9px] truncate">{SCENARIO_LABELS[type].title}</span>
                </button>
              ))}
            </div>

            {/* Parametre Giriş / Advanced Navigator Integration */}
            <div className="space-y-2">
              {activeScenario === 'debt_restructuring' ? (
                <ScenarioNavigator
                  installments={installments}
                  onRunScenario={onRunScenario!}
                  onCommit={onCommitRestructuring!}
                  scenarioResult={scenarioResult || null}
                  fmt={fmt}
                  accounts={accounts}
                  transactions={transactions}
                  debts={debts}
                  recurringFlows={recurringFlows}
                />
              ) : (
                <>
                  <label className="text-[10px] font-bold text-zinc-500 block uppercase tracking-wider">
                    {activeScenario === 'debt_payoff' && 'Ödeme Tutarı (₺)'}
                    {activeScenario === 'big_purchase' && 'Alım Tutarı (₺)'}
                    {activeScenario === 'extra_income' && 'Aylık Ek Gelir (₺)'}
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(Number(e.target.value))}
                      className="flex-1 px-3 py-1.5 text-xs font-black border border-zinc-700 rounded-lg focus:ring-1 focus:ring-orange-500 focus:border-orange-500 transition-colors bg-zinc-900 text-white placeholder-zinc-600"
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
                      className="px-4 py-1.5 text-[10px] font-bold tracking-widest uppercase bg-gradient-to-r from-orange-500 to-rose-500 text-white rounded-lg hover:from-orange-600 hover:to-rose-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_10px_rgba(249,115,22,0.3)]"
                    >
                      Test Et
                    </button>
                  </div>
                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                    ⓘ {SCENARIO_LABELS[activeScenario].description}
                  </p>
                </>
              )}
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
        <div className="border-t border-zinc-800 pt-3 relative z-10">
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Tavsiyeler</p>
          <ul className="space-y-1.5">
            {forecast.recommendations.slice(0, 2).map((rec, i) => (
              <li key={i} className="text-xs text-zinc-500 flex gap-2 items-start">
                <span className="text-orange-500 mt-0.5 text-[10px]">♦</span>
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex items-center justify-between relative z-10 pt-2 border-t border-zinc-800/50">
        <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">
          ⓘ Tahminler tekrarlayan işlemlere dayanır
        </p>
      </div>

      {/* Theory Modal */}
      <TheoryModal isOpen={showTheoryModal} onClose={() => setShowTheoryModal(false)} />
    </div>
  );
}

// ─── SVG Grafik Bileşeni (Interactive & AMOLED) ────────────────────
function InteractiveCashFlowChart({
  forecast,
  scenarioResult,
  currentBalance,
  monthlyIncome,
  hasScenarioData,
  fmt,
}: {
  forecast: CashFlowForecast;
  scenarioResult?: ScenarioResult | null;
  currentBalance: number;
  monthlyIncome: number;
  hasScenarioData: boolean;
  fmt: (n: number) => string;
}) {
  const [zoomLevel, setZoomLevel] = useState<7 | 14 | 30>(30);
  const [panIndex, setPanIndex] = useState(0);
  const [activePoint, setActivePoint] = useState<number | null>(null);
  const [mousePosX, setMousePosX] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [tooltipWidth, setTooltipWidth] = useState(208); // Default w-52

  useEffect(() => {
    if (containerRef.current) {
      setContainerWidth(containerRef.current.offsetWidth);
    }
    const handleResize = () => {
      if (containerRef.current) setContainerWidth(containerRef.current.offsetWidth);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Non-passive wheel listener to prevent page scroll during zoom
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleNativeWheel = (e: WheelEvent) => {
      // If cursor is over the chart, prevent page scroll
      e.preventDefault();
      // Logic for zoom
      if (e.deltaY < 0) {
        setZoomLevel(prev => {
          if (prev === 30) return 14;
          if (prev === 14) return 7;
          return prev;
        });
        setPanIndex(0);
      } else if (e.deltaY > 0) {
        setZoomLevel(prev => {
          if (prev === 7) return 14;
          if (prev === 14) return 30;
          return prev;
        });
        setPanIndex(0);
      }
    };

    container.addEventListener('wheel', handleNativeWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleNativeWheel);
  }, [containerWidth]); // Only Re-bind if container changes, internal state is handled by setZoomLevel

  useEffect(() => {
    if (tooltipRef.current) {
      setTooltipWidth(tooltipRef.current.offsetWidth);
    }
  }, [activePoint]);

  const maxDataPoints = forecast.dailyBalances.length;
  const maxPan = Math.max(0, maxDataPoints - zoomLevel);
  const safePanIndex = Math.min(panIndex, maxPan);

  const visibleDays = forecast.dailyBalances.slice(safePanIndex, safePanIndex + zoomLevel);
  const visibleScenario = scenarioResult ? scenarioResult.scenarioForecast.slice(safePanIndex, safePanIndex + zoomLevel) : [];

  const handlePan = (dir: 1 | -1) => {
    setPanIndex((prev) => Math.max(0, Math.min(prev + dir * Math.floor(zoomLevel / 2), maxPan)));
  };

  const handleWheel = (e: React.WheelEvent) => {
    // Handled by non-passive effect now
  };

  const { dataMin, dataMax } = useMemo(() => {
    const allDays = [...visibleDays, ...visibleScenario];
    if (allDays.length === 0) return { dataMin: 0, dataMax: 100 };
    
    let min = Math.min(...allDays.map(d => d.balance));
    let max = Math.max(...allDays.map(d => d.balance));
    
    // Zero-Variance / Small Dataset Protection (Task 45.56)
    const diff = Math.abs(max - min);
    if (allDays.length < 10 || diff === 0) {
      const base = diff === 0 ? min : (min + max) / 2;
      const offset = Math.abs(base * 0.1) || 1000;
      min = base - offset;
      max = base + offset;
    } else {
      // 15% vertical padding for professional breathing room
      const pad = diff * 0.15;
      min -= pad;
      max += pad;
    }
    
    console.log("NAVIGATOR_DATA_INTEGRITY:", { 
      points: allDays.length, 
      yDomain: [min, max], 
      currentMode: zoomLevel === 30 ? '1 AY' : zoomLevel === 14 ? '2 HFT' : '1 HFT'
    });

    return { dataMin: min, dataMax: max };
  }, [visibleDays, visibleScenario, zoomLevel]);

  const buildPoints = (days: DailyBalance[]) => {
    if (days.length === 0) return '';
    const range = dataMax - dataMin || 1;
    return days
      .map((db, i) => {
        const x = (i / Math.max(days.length - 1, 1)) * 400;
        const normBal = (db.balance - dataMin) / range;
        const y = 110 - (normBal * 100);
        return `${x},${y}`;
      })
      .join(' ');
  };

  const baselinePoints = useMemo(() => buildPoints(visibleDays), [visibleDays, currentBalance, dataMin, dataMax]);
  const scenarioPoints = useMemo(() => hasScenarioData ? buildPoints(visibleScenario) : '', [visibleScenario, hasScenarioData, currentBalance, dataMin, dataMax]);

  const activeDay = activePoint !== null ? visibleDays[activePoint] : null;

  // X Coordinates for hover rects
  const getX = (i: number) => (i / Math.max(visibleDays.length - 1, 1)) * 400;

  const getCategoryIcon = (desc: string) => {
    const lower = desc.toLowerCase();
    if (lower.includes('maaş') || lower.includes('gelir')) return '💼';
    if (lower.includes('kredi') || lower.includes('taksit')) return '💳';
    if (lower.includes('fatura') || lower.includes('aidat')) return '🧾';
    if (lower.includes('kira')) return '🏠';
    return '🔄';
  };

  return (
    <div 
      className="space-y-3 outline-none" 
      ref={containerRef}
      tabIndex={0}
    >
      {/* Chart Canvas */}
      <div className="h-52 relative bg-black rounded-xl border border-zinc-900 shadow-inner overflow-visible">
        <svg 
          viewBox="0 0 400 150" 
          className="w-full h-full pb-2" 
          preserveAspectRatio="none"
          onMouseMove={(e) => {
            if (containerRef.current) {
              const rect = containerRef.current.getBoundingClientRect();
              setMousePosX(e.clientX - rect.left);
            }
          }}
        >
          <defs>
            <filter id="neonGlowRed" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <filter id="neonGlowGreen" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <linearGradient id="securityFog" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="transparent" />
              <stop offset="100%" stopColor="rgba(0,0,0,0.4)" />
            </linearGradient>
          </defs>

          {/* Security Fog (Stale Data Layer) */}
          <rect x="350" y="0" width="50" height="150" fill="url(#securityFog)" className="pointer-events-none" />

          {/* Grid lines (Optimized for contrast) */}
          <line x1="0" y1="20" x2="400" y2="20" stroke="#1f2937" strokeWidth="0.5" strokeDasharray="3,3" strokeOpacity="0.5" />
          <line x1="0" y1="80" x2="400" y2="80" stroke="#1f2937" strokeWidth="0.5" strokeDasharray="3,3" strokeOpacity="0.5" />
          
          {/* Baseline */}
          <motion.polyline
            initial={false}
            animate={{ points: baselinePoints }}
            fill="none"
            stroke="#10b981"
            strokeWidth="4"
            strokeLinejoin="round"
            strokeLinecap="round"
            filter="url(#neonGlowGreen)"
            style={{ filter: 'drop-shadow(0 0 4px rgba(16, 185, 129, 0.4))' }}
          />

          {/* Scenario */}
          {hasScenarioData && scenarioPoints && (
            <motion.polyline
              initial={false}
              animate={{ points: scenarioPoints }}
              fill="none"
              stroke="#f97316"
              strokeWidth="2"
              strokeDasharray="4,4"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          )}

          {/* Critical Threshold */}
          {forecast.hasCashTightness && (
            <line
              x1="0" y1="100" x2="400" y2="100"
              stroke="#FF4D4D"
              strokeWidth="1"
              strokeDasharray="4,4"
              filter="url(#neonGlowRed)"
            />
          )}

          {/* Interactive Hover Zones & Point Markers */}
          {visibleDays.map((_, i) => {
            const x = getX(i);
            return (
              <g key={i}>
                {/* Invisible Hover Rect */}
                <rect
                  x={x - (400 / zoomLevel) / 2}
                  y="0"
                  width={400 / zoomLevel}
                  height="120"
                  fill="transparent"
                  onMouseEnter={() => setActivePoint(i)}
                  onMouseLeave={() => setActivePoint(null)}
                  className="cursor-crosshair"
                />
                
                {/* Active Indicator Line */}
                {activePoint === i && (
                  <line x1={x} y1="0" x2={x} y2="120" stroke="#3f3f46" strokeWidth="1" strokeDasharray="2,2" className="pointer-events-none" />
                )}
              </g>
            );
          })}

          {/* X-Axis Labels (Bloomberg Refined Typography) */}
          {visibleDays.map((db, i) => {
            const showLabel = 
              zoomLevel === 7 ? true :
              zoomLevel === 14 ? i % 2 === 0 :
              i % 5 === 0;

            if (!showLabel) return null;

            const x = getX(i);
            const dateStr = new Date(db.date).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' });
            
            return (
              <text
                key={`label-${i}`}
                x={x}
                y={130}
                fill="currentColor"
                fontSize="10"
                fontWeight="300"
                fontFamily="Inter, system-ui, sans-serif"
                style={{ fontStyle: 'normal' }}
                textAnchor="start"
                transform={`rotate(45, ${x}, 130) translate(-10, 10)`}
                className="pointer-events-none select-none uppercase tracking-tighter text-zinc-400/80 dark:text-zinc-500/80"
              >
                {dateStr}
              </text>
            );
          })}
        </svg>

        {/* Floating Tooltip */}
        <AnimatePresence>
          {activeDay && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ 
                opacity: 1, 
                scale: 1,
                x: mousePosX + tooltipWidth + 30 > containerWidth 
                   ? mousePosX - tooltipWidth - 10 
                   : mousePosX + 15
              }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ 
                opacity: { duration: 0.15 },
                x: { duration: 0.1, ease: "easeOut" } // Surgical fast flip (Task 45.57)
              }}
              className="absolute z-50 pointer-events-none"
              style={{
                top: '5%',
                maxWidth: 'calc(100% - 20px)'
              }}
            >
              <div ref={tooltipRef} className="bg-zinc-900 border border-zinc-700/50 rounded-xl p-3 shadow-2xl backdrop-blur-xl w-60 text-left">
                {/* TOOLTIP HEADER */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm">{getCategoryIcon(activeDay.description)}</span>
                    <span className="text-[10px] font-black text-zinc-400 tracking-widest uppercase">
                      {new Date(activeDay.date).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' })}{zoomLevel < 30 ? ' 15:00' : ''}
                    </span>
                  </div>
                  <div className={`w-2.5 h-2.5 rounded-full ${activeDay.balance < 0 ? 'bg-[#FF4D4D] shadow-[0_0_8px_#FF4D4D]' : activeDay.balance < currentBalance * 0.2 ? 'bg-[#FFA500] shadow-[0_0_8px_#FFA500]' : 'bg-[#10b981] shadow-[0_0_8px_#10b981]'}`} />
                </div>

                {/* TOOLTIP MAIN DETAIL */}
                <div className="mb-3">
                  <div className="text-[9px] font-bold text-zinc-500 uppercase tracking-tighter mb-0.5">Tahmini Bakiye</div>
                  <div className="text-xl font-black text-white leading-none">
                    {fmt(activeDay.balance)}
                  </div>
                </div>
                
                {activeDay.description !== 'Sıradan Gün' && (
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-2 rounded-lg mb-3 border border-emerald-500/20">
                    <span className="truncate">{activeDay.description}</span>
                  </div>
                )}

                {/* TOOLTIP METRICS GRID */}
                <div className="grid grid-cols-2 gap-2 text-[9px] mb-2 font-bold uppercase tracking-wider">
                  <div className="bg-zinc-800/80 p-2 rounded-lg flex flex-col gap-1 border border-zinc-700/30">
                    <span className="text-zinc-500">Gelir Etkisi</span>
                    <span className={activeDay.netExpense > 0 ? "text-orange-400" : "text-emerald-400"}>
                      {activeDay.netExpense > 0 && monthlyIncome > 0 
                        ? `%${((activeDay.netExpense / monthlyIncome) * 100).toFixed(1)}` 
                        : 'Stabil'}
                    </span>
                  </div>
                  <div className="bg-zinc-800/80 p-2 rounded-lg flex flex-col gap-1 border border-zinc-700/30">
                    <span className="text-zinc-500">Tampon (NT)</span>
                    <span className={activeDay.balance < 0 ? "text-red-400" : "text-emerald-400"}>
                      {(activeDay.balance / (monthlyIncome || 1)).toFixed(1)} AY
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-center mt-2 pt-2 border-t border-zinc-800/50 text-[10px] font-black">
                  <div className="flex flex-col">
                    <span className="text-[8px] text-zinc-600 uppercase">Giriş</span>
                    <span className="text-emerald-500">+{fmt(activeDay.netIncome)}</span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[8px] text-zinc-600 uppercase">Çıkış</span>
                    <span className="text-red-500">-{fmt(activeDay.netExpense)}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Control Bar */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-1 bg-zinc-900 rounded-lg p-0.5 border border-zinc-800">
          <button onClick={() => handlePan(-1)} disabled={panIndex === 0} className="px-2 py-1 text-zinc-400 hover:text-white disabled:opacity-30">‹</button>
          <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest px-1">Zaman</span>
          <button onClick={() => handlePan(1)} disabled={panIndex === maxPan} className="px-2 py-1 text-zinc-400 hover:text-white disabled:opacity-30">›</button>
        </div>
        
        <div className="flex items-center gap-1 bg-zinc-900 rounded-lg p-0.5 border border-zinc-800">
          {[7, 14, 30].map(zoom => (
            <button
              key={zoom}
              onClick={() => {
                setZoomLevel(zoom as 7|14|30);
                setPanIndex(0); // Reset pan on zoom
              }}
              className={`px-2 py-1 text-[9px] font-black uppercase rounded transition-colors ${zoomLevel === zoom ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              {zoom === 30 ? '1 AY' : zoom === 14 ? '2 HFT' : '1 HFT'}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Teori Modalı ───────────────────────────────────────────────────
function TheoryModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-black border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden relative"
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-zinc-500 hover:text-white">✕</button>
        <div className="p-6">
          <h3 className="text-xl font-black text-white mb-2 tracking-tight">Nakit Akışı Formülü</h3>
          <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mb-6">Katman 1.1 Motor Özellikleri</p>
          
          <div className="space-y-4">
            <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800">
              <span className="text-emerald-400 font-mono text-sm block mb-1">$$Db(t+1) = Db(t) + I(t) - E(t)$$</span>
              <p className="text-xs text-zinc-300 leading-relaxed mt-2">
                Her gün için mevcut bakiye (Db(t)), o güne ait beklenen gelirler I(t) eklenip, kesinleşmiş ödemeler ve kredi kartı ekstreleri E(t) düşülerek hesaplanır. Günlük hesaplama (Intra-month) sayesinde ay sonunu beklemeden "Nakit Tıkanıklığı" aylar öncesinden tespit edilir.
              </p>
            </div>
            
            <div className="bg-neutral-950/40 p-4 rounded-xl border border-zinc-800">
              <span className="text-[10px] font-black text-orange-400 uppercase tracking-widest mb-1.5 block">Pratik Analiz Örneği:</span>
              <p className="text-xs text-zinc-400 leading-relaxed italic">
                "25 Nisan'daki ₺26.277'lik düşüş, Akbank kredi kartınızın son ödeme günüdür. Bu harcama aylık gelirinizin %52'sine denk gelmektedir."
              </p>
            </div>
          </div>
        </div>
      </motion.div>
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
  const getMinBalColor = (val: number) => {
    if (val < 0) return 'bg-red-950/20 border-red-900/50 text-red-400';
    if (val < currentBalance * 0.2) return 'bg-orange-950/20 border-orange-900/50 text-orange-400';
    return 'bg-emerald-950/20 border-emerald-900/50 text-emerald-400';
  };

  return (
    <div className="grid grid-cols-3 gap-2">
      <div className="bg-zinc-900 border border-zinc-800 p-3 rounded-xl bg-opacity-70 group-hover:bg-opacity-90 transition-all">
        <p className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Mevcut</p>
        <p className="font-black text-white text-base tracking-tight">{fmt(currentBalance)}</p>
      </div>
      
      <div className={`${getMinBalColor(forecast.projectedEndBalance)} p-3 rounded-xl border transition-all duration-500`}>
        <p className="text-[10px] uppercase font-bold tracking-wider opacity-60">30G Sonra</p>
        <p className="font-black text-white text-base tracking-tight">{fmt(forecast.projectedEndBalance)}</p>
        {hasScenarioData && scenarioResult && (
          <motion.p 
            initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }}
            className="text-[10px] text-orange-400 font-bold mt-1 tracking-wider uppercase flex items-center gap-1"
          >
            <span>→</span> {fmt(scenarioResult.summary.scenarioEndBalance)}
          </motion.p>
        )}
      </div>

      <div className={`${getMinBalColor(forecast.minBalance)} p-3 rounded-xl border transition-all duration-500`}>
        <p className="text-[10px] uppercase font-bold tracking-wider opacity-60">En Düşük</p>
        <p className="font-black text-white text-base tracking-tight">
          {forecast.minBalance >= 0 ? fmt(forecast.minBalance) : `−${fmt(Math.abs(forecast.minBalance))}`}
        </p>
        {hasScenarioData && scenarioResult && (
          <motion.p 
            initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }}
            className="text-[10px] text-orange-400 font-bold mt-1 tracking-wider uppercase flex items-center gap-1"
          >
            <span>→</span> {scenarioResult.summary.scenarioMinBalance >= 0
              ? fmt(scenarioResult.summary.scenarioMinBalance)
              : `−${fmt(Math.abs(scenarioResult.summary.scenarioMinBalance))}`}
          </motion.p>
        )}
      </div>
    </div>
  );
}

// ─── Neon Speedometer (İbre) ──────────────────────────────────────
function NeonSpeedometer({ 
  baselineScore, 
  scenarioScore, 
  scoreDelta 
}: { 
  baselineScore: number; 
  scenarioScore: number; 
  scoreDelta: number 
}) {
  const rotation = (score: number) => (score / 100) * 180 - 90;
  const isPositive = scoreDelta > 0;
  const arcColor = isPositive ? '#10b981' : '#f97316';

  return (
    <div className="relative flex flex-col items-center justify-center py-4 mb-2">
      <div className="relative">
        <svg viewBox="0 0 200 120" className="w-48 h-32">
          <defs>
            <filter id="neonGlowOuter" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Background Arc */}
          <path
            d="M 30 100 A 70 70 0 0 1 170 100"
            fill="none"
            stroke="#1f2937"
            strokeWidth="12"
            strokeLinecap="round"
          />
          
          {/* Progress Arc (Baseline) */}
          <motion.path
            d="M 30 100 A 70 70 0 0 1 170 100"
            fill="none"
            stroke="#374151"
            strokeWidth="12"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: baselineScore / 100 }}
            transition={{ duration: 1, ease: "easeOut" }}
          />

          {/* Progress Arc (Scenario) */}
          <motion.path
            d="M 30 100 A 70 70 0 0 1 170 100"
            fill="none"
            stroke={arcColor}
            strokeWidth="12"
            strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 8px ${arcColor})` }}
            initial={{ pathLength: 0 }}
            animate={{ pathLength: scenarioScore / 100 }}
            transition={{ duration: 2, ease: "backOut", delay: 0.3 }}
          />

          {/* Needle Pin */}
          <circle cx="100" cy="100" r="4" fill="white" />

          {/* Needle Line */}
          <motion.g
            initial={{ rotate: rotation(baselineScore) }}
            animate={{ rotate: rotation(scenarioScore) }}
            transition={{ duration: 2, ease: "backOut", delay: 0.3 }}
            style={{ originX: "100px", originY: "100px" }}
          >
            <line
              x1="100" y1="100"
              x2="100" y2="40"
              stroke="white"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </motion.g>
        </svg>

        {/* Value Display */}
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-4 pointer-events-none">
          <motion.span 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-3xl font-black text-white leading-none"
          >
            {Math.round(scenarioScore)}
          </motion.span>
          <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest mt-1">
            STRATEJİK SKOR
          </span>
        </div>
      </div>
      
      {/* Momentum Badge */}
      {isPositive && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mt-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.2)]"
        >
          <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest flex items-center gap-1">
            <span className="animate-bounce">⚡</span> +{scoreDelta} PUANLIK IVME
          </span>
        </motion.div>
      )}
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
  const score = scenarioResult.scenarioScore;
  
  // ─── 4-TIER UNIFIED COLOR SYSTEM ───
  const getTierData = (val: number) => {
    if (val >= 85) return { color: 'text-emerald-400', bg: 'bg-emerald-950/40 border-emerald-500/50', label: '💎 Mükemmel' };
    if (val >= 55) return { color: 'text-green-400', bg: 'bg-green-950/40 border-green-500/50', label: '✅ Güvenli' };
    if (val >= 35) return { color: 'text-orange-400', bg: 'bg-orange-950/40 border-orange-500/50', label: '🟠 Orta Risk' };
    return { color: 'text-red-400', bg: 'bg-red-950/40 border-red-500/50', label: '🔴 Kritik Risk' };
  };

  const tier = getTierData(score);
  const deltaColor = scenarioResult.scoreDelta > 0 ? 'text-emerald-400' : scenarioResult.scoreDelta < 0 ? 'text-red-400' : 'text-zinc-400';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-zinc-950/80 p-4 rounded-2xl border border-zinc-800 space-y-4 backdrop-blur-xl"
    >
      <div className="flex flex-col items-center">
        <NeonSpeedometer 
          baselineScore={scenarioResult.baselineScore}
          scenarioScore={scenarioResult.scenarioScore}
          scoreDelta={scenarioResult.scoreDelta}
        />
        
        <div className="grid grid-cols-2 w-full gap-4 pt-2 border-t border-zinc-900">
          <div className="text-center">
            <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider mb-1">Mevcut Durum</p>
            <p className="text-lg font-black text-zinc-400 leading-none">{scenarioResult.baselineScore}</p>
          </div>
          <div className="text-center">
            <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider mb-1">Yeni Hedef</p>
            <p className={`text-lg font-black leading-none ${deltaColor}`}>{scenarioResult.scenarioScore}</p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
        <span className={`px-2 py-0.5 rounded text-[10px] font-black border transition-colors duration-1000 ${tier.bg} ${tier.color}`}>
          {tier.label}
        </span>
        {scenarioResult.breakEvenMonth && (
          <span className="text-[10px] text-zinc-400 font-bold">
            📅 {scenarioResult.breakEvenMonth}. ayda kâra geçiş
          </span>
        )}
      </div>

      {scenarioResult.recommendations.length > 0 && (
        <div className="pt-2 space-y-3">
          {scenarioResult.scenarioScore >= 45 && scenarioResult.scoreDelta > 5 && (
            <motion.div 
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-emerald-500/10 border border-emerald-500/30 p-3 rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.1)]"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm">✨</span>
                <h4 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Stratejik İyileşme Sinyali</h4>
              </div>
              <p className="text-[10px] font-bold text-emerald-200/60 leading-tight">
                Bu simülasyon, borç yükünüzü rasyonel bir koridora çekiyor. Onaylamanız durumunda Dashboard'daki kırmızı baskı kalkacaktır.
              </p>
            </motion.div>
          )}
          <div className="bg-zinc-900/50 p-3 rounded-xl border border-zinc-800/50">
            <p className="text-[11px] font-bold text-zinc-100 leading-relaxed italic">
               " {scenarioResult.recommendations[0]} "
            </p>
          </div>
        </div>
      )}
    </motion.div>
  );
}
