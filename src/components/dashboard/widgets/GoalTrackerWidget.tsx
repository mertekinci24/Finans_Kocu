import { motion } from 'framer-motion';
import { CURRENCY_SYMBOL } from '@/constants';
import type { GoalProjection } from '@/services/goalService';
import { GOAL_CATEGORY_META } from '@/services/goalService';

interface GoalTrackerWidgetProps {
  projections: GoalProjection[];
  isLoading: boolean;
  onNavigateToGoals?: () => void;
}

export default function GoalTrackerWidget({
  projections,
  isLoading,
  onNavigateToGoals,
}: GoalTrackerWidgetProps): JSX.Element {
  if (isLoading) {
    return (
      <div className="space-y-3 animate-pulse">
        <div className="h-6 bg-neutral-200 rounded w-32" />
        <div className="h-24 bg-neutral-200 rounded" />
      </div>
    );
  }

  const fmt = (n: number) =>
    `${CURRENCY_SYMBOL}${Math.abs(n).toLocaleString('tr-TR', { maximumFractionDigits: 0 })}`;

  if (projections.length === 0) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-neutral-900">🎯 Hedeflerim</h3>
          {onNavigateToGoals && (
            <button
              onClick={onNavigateToGoals}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors"
            >
              Hedef Ekle →
            </button>
          )}
        </div>
        <div className="text-center py-6">
          <div className="text-3xl mb-2">🎯</div>
          <p className="text-xs text-neutral-500">Henüz hedef eklenmedi</p>
          <p className="text-xs text-neutral-400 mt-1">İlk birikim hedefini oluştur!</p>
        </div>
      </div>
    );
  }

  // En yüksek öncelikli aktif hedefi göster
  const topGoal = projections[0];
  const meta = GOAL_CATEGORY_META[topGoal.goal.category];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-neutral-900">🎯 Hedeflerim</h3>
        {onNavigateToGoals && (
          <button
            onClick={onNavigateToGoals}
            className="text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors"
          >
            Tümü ({projections.length}) →
          </button>
        )}
      </div>

      {/* Ana hedef kartı */}
      <div
        className="p-3 rounded-lg border"
        style={{ borderColor: `${meta.color}40`, backgroundColor: `${meta.color}08` }}
      >
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">{meta.icon}</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-neutral-900 truncate">{topGoal.goal.name}</p>
            <p className="text-xs text-neutral-500">{meta.label} • {
              topGoal.goal.priority === 'high' ? '🔴 Yüksek' :
              topGoal.goal.priority === 'medium' ? '🟡 Orta' : '🟢 Düşük'
            }</p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-xs text-neutral-500">%{topGoal.progressPercent.toFixed(0)}</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="relative h-2.5 bg-neutral-200 rounded-full overflow-hidden mb-2">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, topGoal.progressPercent)}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="absolute inset-y-0 left-0 rounded-full"
            style={{ backgroundColor: meta.color }}
          />
        </div>

        {/* Tutarlar */}
        <div className="flex justify-between text-xs">
          <span className="text-neutral-600">
            {fmt(topGoal.goal.currentAmount)} / {fmt(topGoal.goal.targetAmount)}
          </span>
          <span className={topGoal.isOnTrack ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
            {topGoal.isOnTrack ? '✅ Hedeftesin' : `⏰ ${Math.ceil(topGoal.delayDays / 30)} ay gecikme`}
          </span>
        </div>
      </div>

      {/* Diğer hedefler özet */}
      {projections.length > 1 && (
        <div className="space-y-1.5">
          {projections.slice(1, 3).map((proj) => {
            const m = GOAL_CATEGORY_META[proj.goal.category];
            return (
              <div key={proj.goal.id} className="flex items-center gap-2 text-xs">
                <span>{m.icon}</span>
                <span className="flex-1 text-neutral-700 truncate">{proj.goal.name}</span>
                <span className="text-neutral-500">{proj.progressPercent.toFixed(0)}%</span>
                <div className="w-12 h-1.5 bg-neutral-200 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.min(100, proj.progressPercent)}%`,
                      backgroundColor: m.color,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* İlk önerisi */}
      {topGoal.recommendations.length > 0 && (
        <div className="pt-2 border-t border-neutral-200">
          <p className="text-xs text-neutral-600 italic">{topGoal.recommendations[0]}</p>
        </div>
      )}
    </div>
  );
}
