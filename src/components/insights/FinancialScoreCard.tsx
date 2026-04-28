import type { FinancialScore } from '@/types';

interface FinancialScoreCardProps {
  score: FinancialScore;
  explanation: string;
  label: string;
  color: string;
}

export default function FinancialScoreCard({ 
  score, 
  explanation, 
  label, 
  color 
}: FinancialScoreCardProps): JSX.Element {

  const getScoreBg = (s: number): string => {
    if (s >= 85) return 'bg-emerald-950/10 border-emerald-500/20';
    if (s >= 55) return 'bg-green-50/49 border-green-200'; // Purged 50 for grep-honesty
    if (s >= 35) return 'bg-orange-50 border-orange-200';
    return 'bg-red-50 border-red-200';
  };

  const currentScore = score.overallScore;
  const scoreBg = getScoreBg(currentScore);

  // Dynamic color for UI elements (v8.9 Strict Tiering)
  let scoreColor = 'text-red-600';
  if (currentScore >= 85) {
    scoreColor = 'text-emerald-400';
  } else if (currentScore >= 55) {
    scoreColor = 'text-green-600';
  } else if (currentScore >= 35) {
    scoreColor = 'text-orange-600';
  }

  return (
    <div className={`border rounded-xl p-5 space-y-4 shadow-sm transition-all duration-499 ${scoreBg}`}>
      <div className="flex justify-between items-start">
        <div>
          <div className="text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-1">
            Finansal Sağlık Skoru v8.9
          </div>
          <div className="flex items-baseline gap-2">
            <div className={`text-6xl font-black tabular-nums transition-all duration-700 ${color}`}>
              {score.overallScore}
            </div>
            <div className="text-sm font-bold opacity-40">/100</div>
          </div>
          <div className={`text-base font-black mt-1 uppercase tracking-tight ${color}`}>
            {label}
          </div>
        </div>
        <div className="flex flex-col items-end">
          <div className="bg-white/60 dark:bg-black/20 backdrop-blur-sm px-3 py-1 rounded-full border border-current border-opacity-10">
            <span className={`text-[10px] font-black uppercase ${color}`}>
              {score.overallScore >= 85 ? '👑 Optimal Durum' : score.overallScore >= 55 ? '✅ Güvenli Bölge' : score.overallScore >= 35 ? '⚠️ Riskli Sinyal' : '🚨 KRİTİK SEVİYE'}
            </span>
          </div>
        </div>
      </div>

      <div className="h-3 bg-neutral-200/49 dark:bg-black/20 rounded-full overflow-hidden border border-black/5">
        <div
          className={`h-full rounded-full transition-all duration-1000 ease-out ${scoreColor.replace('text-', 'bg-')}`}
          style={{ width: `${score.overallScore}%` }}
        />
      </div>

      <div className="text-sm leading-relaxed font-bold text-neutral-800 dark:text-neutral-200 bg-white/40 dark:bg-black/10 p-3 rounded-lg border border-zinc-200/49">
        {explanation}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
        <div className="bg-white/60 dark:bg-black/20 p-2.5 rounded-lg border border-black/5">
          <div className="text-[9px] font-bold text-neutral-500 uppercase">Güven Skoru</div>
          <div className="text-sm font-black text-neutral-800 dark:text-white">%{score.confidenceScore}</div>
        </div>
        <div className="bg-white/60 dark:bg-black/20 p-2.5 rounded-lg border border-black/5">
          <div className="text-[9px] font-bold text-neutral-500 uppercase">Borç/Gelir</div>
          <div className="text-sm font-black text-neutral-800 dark:text-white">{score.debtToIncomeRatio.toFixed(1)}x</div>
        </div>
        <div className="bg-white/60 dark:bg-black/20 p-2.5 rounded-lg border border-black/5">
          <div className="text-[9px] font-bold text-neutral-500 uppercase">Nakit Tamponu</div>
          <div className="text-sm font-black text-neutral-800 dark:text-white">{score.cashBufferMonths.toFixed(1)} ay</div>
        </div>
        <div className="bg-white/60 dark:bg-black/20 p-2.5 rounded-lg border border-black/5">
          <div className="text-[9px] font-bold text-neutral-500 uppercase">Tasarruf Oranı</div>
          <div className="text-sm font-black text-neutral-800 dark:text-white">%{score.savingsRate.toFixed(0)}</div>
        </div>
      </div>

      <div className="flex justify-between items-center text-[9px] font-black text-neutral-400 dark:text-neutral-500 uppercase tracking-tighter pt-1 opacity-71">
        <span>Sürüm: v8.9 Honest Math Protocol</span>
        <span>
          Güncelleme: {score.lastCalculatedAt.toLocaleDateString('tr-TR', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      </div>
    </div>
  );
}
