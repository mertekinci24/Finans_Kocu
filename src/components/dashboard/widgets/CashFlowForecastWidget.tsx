import { useState } from 'react';
import { motion } from 'framer-motion';
import { CashFlowForecast } from '@/services/cashFlowEngine';
import { CURRENCY_SYMBOL } from '@/constants';

interface CashFlowForecastWidgetProps {
  forecast: CashFlowForecast | null;
  currentBalance: number;
  isLoading: boolean;
  onScenarioChange?: (scenario: { paymentDate: Date; amount: number }) => void;
}

export default function CashFlowForecastWidget({
  forecast,
  currentBalance,
  isLoading,
}: CashFlowForecastWidgetProps): JSX.Element {
  const [scenarioMode, setScenarioMode] = useState(false);
  const [selectedDate, setSelectedDate] = useState<number>(5);

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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-neutral-900">30 Günlük Nakit Akışı</h3>
        <button
          onClick={() => setScenarioMode(!scenarioMode)}
          className={`px-2 py-1 text-xs rounded font-medium transition-colors ${
            scenarioMode
              ? 'bg-blue-100 text-blue-700'
              : 'bg-neutral-100 text-neutral-600'
          }`}
          title="Senaryo simülatörü"
        >
          {scenarioMode ? 'Senaryo: Açık' : 'Senaryo'}
        </button>
      </div>

      <div
        className="h-32 relative bg-neutral-50 rounded border border-neutral-200 overflow-hidden"
      >
        <svg viewBox="0 0 400 100" className="w-full h-full" preserveAspectRatio="none">
          <defs>
            <linearGradient id="cashFlowGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
            </linearGradient>
          </defs>

          <polyline
            points={forecast.dailyBalances
              .map((db, i) => {
                const x = (i / 30) * 400;
                const normalizedBalance = Math.max(0, db.balance) / (currentBalance + 1);
                const y = 100 - Math.min(normalizedBalance * 100, 100);
                return `${x},${y}`;
              })
              .join(' ')}
            fill="none"
            stroke="#10b981"
            strokeWidth="2"
          />

          {forecast.hasCashTightness && (
            <line
              x1="0"
              y1="75"
              x2="400"
              y2="75"
              stroke="#f87171"
              strokeWidth="1"
              strokeDasharray="4,4"
            />
          )}
        </svg>

        {forecast.hasCashTightness && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center text-xs text-red-600 font-medium">
              ⚠ Nakit Riski
            </div>
          </div>
        )}
      </div>

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
        </div>
        <div
          className={`${
            forecast.minBalance >= 0 ? 'bg-neutral-50 border-neutral-200' : 'bg-red-50 border-red-200'
          } p-2 rounded border`}
        >
          <p className="text-neutral-600">En Düşük</p>
          <p className="font-bold">{forecast.minBalance >= 0 ? fmt(forecast.minBalance) : `−${fmt(forecast.minBalance)}`}</p>
        </div>
      </div>

      {scenarioMode && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="border-t border-neutral-200 pt-3"
        >
          <p className="text-xs font-medium text-neutral-700 mb-2">Senaryo: Borç Öde</p>
          <p className="text-xs text-neutral-600 mb-2">
            Gün: <span className="font-bold">{selectedDate}.</span>
          </p>
          <input
            type="range"
            min="1"
            max="30"
            value={selectedDate}
            onChange={(e) => setSelectedDate(Number(e.target.value))}
            className="w-full h-2 bg-neutral-200 rounded-lg appearance-none cursor-pointer"
          />
          <p className="text-xs text-neutral-500 mt-2">
            Bu tarihte borç ödediyseniz nakit akışı gösterilir
          </p>
        </motion.div>
      )}

      {forecast.recommendations.length > 0 && (
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
