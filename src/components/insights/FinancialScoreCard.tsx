import type { FinancialScore } from '@/types';

interface FinancialScoreCardProps {
  score: FinancialScore;
  explanation: string;
}

export default function FinancialScoreCard({ score, explanation }: FinancialScoreCardProps): JSX.Element {
  const getScoreColor = (s: number): string => {
    if (s >= 80) return 'text-success-600';
    if (s >= 60) return 'text-primary-600';
    if (s >= 40) return 'text-warning-600';
    if (s >= 20) return 'text-error-600';
    return 'text-error-700';
  };

  const getScoreBg = (s: number): string => {
    if (s >= 80) return 'bg-success-50 border-success-300';
    if (s >= 60) return 'bg-primary-50 border-primary-300';
    if (s >= 40) return 'bg-warning-50 border-warning-300';
    if (s >= 20) return 'bg-error-50 border-error-300';
    return 'bg-error-100 border-error-400';
  };

  const getScoreLabel = (s: number): string => {
    if (s >= 80) return 'Mükemmel';
    if (s >= 60) return 'İyi';
    if (s >= 40) return 'Orta';
    if (s >= 20) return 'Düşük';
    return 'Kriz';
  };

  const scoreColor = getScoreColor(score.overallScore);
  const scoreBg = getScoreBg(score.overallScore);

  return (
    <div className={`border rounded-xl p-5 space-y-4 ${scoreBg}`}>
      <div>
        <div className="text-xs font-medium text-neutral-600 uppercase tracking-wide">
          Finansal Sağlık Skoru
        </div>
        <div className="flex items-baseline gap-2 mt-2">
          <div className={`text-5xl font-bold ${scoreColor}`}>{score.overallScore}</div>
          <div className="text-xs text-neutral-600">/100</div>
        </div>
        <div className={`text-sm font-semibold mt-1 ${scoreColor}`}>
          {getScoreLabel(score.overallScore)}
        </div>
      </div>

      <div className="h-2 bg-neutral-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${scoreColor.replace('text-', 'bg-')}`}
          style={{ width: `${score.overallScore}%` }}
        />
      </div>

      <div className="text-sm leading-relaxed text-neutral-700">
        {explanation}
      </div>

      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-current border-opacity-20">
        <div className="text-xs">
          <div className="text-neutral-500">Güven Skoru</div>
          <div className="font-semibold text-neutral-700">%{score.confidenceScore}</div>
        </div>
        <div className="text-xs">
          <div className="text-neutral-500">Borç/Gelir</div>
          <div className="font-semibold text-neutral-700">%{score.debtToIncomeRatio.toFixed(1)}</div>
        </div>
        <div className="text-xs">
          <div className="text-neutral-500">Nakit Tamponu</div>
          <div className="font-semibold text-neutral-700">{score.cashBufferMonths.toFixed(1)} ay</div>
        </div>
        <div className="text-xs">
          <div className="text-neutral-500">Tasarruf Oranı</div>
          <div className="font-semibold text-neutral-700">%{score.savingsRate.toFixed(1)}</div>
        </div>
      </div>

      <div className="text-xs text-neutral-500 pt-1">
        Son hesaplama: {score.lastCalculatedAt.toLocaleDateString('tr-TR', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })}
      </div>
    </div>
  );
}
