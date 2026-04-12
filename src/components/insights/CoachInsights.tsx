import type { Insight } from '@/services/ruleEngine';

interface CoachInsightsProps {
  insights: Insight[];
  title?: string;
}

const typeIcons: Record<Insight['type'], string> = {
  warning: '⚠️',
  opportunity: '💡',
  info: 'ℹ️',
};

const typeBgColors: Record<Insight['type'], string> = {
  warning: 'bg-warning-50 border-warning-300',
  opportunity: 'bg-success-50 border-success-300',
  info: 'bg-primary-50 border-primary-300',
};

const typeTitleColors: Record<Insight['type'], string> = {
  warning: 'text-warning-700',
  opportunity: 'text-success-700',
  info: 'text-primary-700',
};

const priorityLabels: Record<Insight['priority'], string> = {
  high: 'Acil',
  medium: 'Normal',
  low: 'Düşük',
};

export default function CoachInsights({ insights, title = 'Koç Önerileri' }: CoachInsightsProps): JSX.Element {
  if (insights.length === 0) {
    return (
      <div className="bg-success-50 border border-success-200 rounded-xl p-4 text-center">
        <div className="text-3xl mb-2">🎉</div>
        <p className="text-success-700 font-medium">Mükemmel!</p>
        <p className="text-success-600 text-sm">Şu an uyaracak bir durum yok. Böyle devam et!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-base font-semibold text-neutral-900">{title}</h3>
      <div className="space-y-2">
        {insights.map((insight, idx) => (
          <div
            key={idx}
            className={`border rounded-lg p-3 space-y-1.5 ${typeBgColors[insight.type]}`}
          >
            <div className="flex items-start gap-2">
              <span className="text-lg mt-0.5">{typeIcons[insight.type]}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <h4 className={`font-semibold text-sm ${typeTitleColors[insight.type]}`}>
                    {insight.title}
                  </h4>
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ${
                      insight.priority === 'high'
                        ? 'bg-error-100 text-error-700'
                        : insight.priority === 'medium'
                          ? 'bg-warning-100 text-warning-700'
                          : 'bg-neutral-100 text-neutral-600'
                    }`}
                  >
                    {priorityLabels[insight.priority]}
                  </span>
                </div>
                <p className={`text-xs leading-relaxed ${typeTitleColors[insight.type]} mt-0.5`}>
                  {insight.message}
                </p>
                {insight.actionableHint && (
                  <p className={`text-xs italic mt-1 ${typeTitleColors[insight.type]}`}>
                    💬 {insight.actionableHint}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
