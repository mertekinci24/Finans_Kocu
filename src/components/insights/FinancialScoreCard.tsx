import type { FinancialScore } from '@/types';
import type { FinancialHealthAssessment } from '@/services/scoringEngine';

interface FinancialScoreCardProps {
  score: FinancialScore;
  explanation: string;
  label: string;
  color: string;
  assessment?: FinancialHealthAssessment;
}

export default function FinancialScoreCard({ 
  score, 
  explanation, 
  label, 
  color,
  assessment
}: FinancialScoreCardProps): JSX.Element {

  const getScoreBg = (s: number): string => {
    if (s >= 85) return 'bg-score-optimal-bg border-score-optimal/20';
    if (s >= 55) return 'bg-score-normal-bg border-score-normal/20';
    if (s >= 35) return 'bg-score-warning-bg border-score-warning/20';
    return 'bg-score-crisis-bg border-score-crisis/20';
  };

  const currentScore = score.overallScore;
  const scoreBg = getScoreBg(currentScore);

  // Dynamic color for UI elements (fallback if not provided by assessment)
  let scoreColor = 'text-score-crisis';
  if (currentScore >= 85) {
    scoreColor = 'text-score-optimal';
  } else if (currentScore >= 55) {
    scoreColor = 'text-score-normal';
  } else if (currentScore >= 35) {
    scoreColor = 'text-score-warning';
  }

  // Impossible state guard (DEV-only)
  if (import.meta.env.DEV && assessment) {
    if (assessment.severity === 'crisis' && assessment.overallScore > 14) {
      console.warn('[SSOT_GUARD] Impossible state: crisis severity with score > 14');
    }
    if (assessment.severity === 'critical' && assessment.overallScore > 25) {
      console.warn('[SSOT_GUARD] Impossible state: critical severity with score > 25');
    }
    if (assessment.statusLabel.includes('Teknik İflas') && assessment.badgeLabel.includes('Optimal')) {
      console.warn('[SSOT_GUARD] Impossible state: Teknik İflas with Optimal badge');
    }
    if (assessment.overallScore >= 85 && (assessment.severity === 'crisis' || assessment.severity === 'critical')) {
      console.warn('[SSOT_GUARD] Impossible state: score >= 85 with crisis/critical severity');
    }
  }

  // Use engine's badge if available, fallback for safety
  const finalBadgeLabel = assessment?.badgeLabel || (currentScore >= 85 ? '👑 Optimal Durum' : currentScore >= 55 ? '✅ Güvenli Bölge' : currentScore >= 35 ? '⚠️ Riskli Sinyal' : '🚨 KRİTİK SEVİYE');
  const finalStatusLabel = assessment?.statusLabel || label;

  return (
    <div className={`border rounded-xl p-5 space-y-4 shadow-sm transition-all duration-499 ${scoreBg}`}>
      <div className="flex justify-between items-start">
        <div>
          <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">
            Finansal Sağlık Skoru
          </div>
          <div className="flex items-baseline gap-2">
            <div className={`text-6xl font-black tabular-nums transition-all duration-700 ${color}`}>
              {score.overallScore}
            </div>
            <div className="text-sm font-bold opacity-40">/100</div>
          </div>
          <div className={`text-base font-black mt-1 uppercase tracking-tight ${color}`}>
            {finalStatusLabel}
          </div>
        </div>
          <div className="flex flex-col items-end">
          <div className="bg-card/50 backdrop-blur-sm px-3 py-1 rounded-full border border-border">
            <span className={`text-[10px] font-black uppercase ${color}`}>
              {finalBadgeLabel}
            </span>
          </div>
        </div>
      </div>

      <div className="h-3 bg-card/40 rounded-full overflow-hidden border border-border/50">
        <div
          className={`h-full rounded-full transition-all duration-1000 ease-out ${scoreColor.replace('text-', 'bg-')}`}
          style={{ width: `${score.overallScore}%` }}
        />
      </div>

      <div className="text-sm leading-relaxed font-bold text-foreground bg-card/50 p-3 rounded-lg border border-border">
        {explanation}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
        <div className="bg-card/50 p-2.5 rounded-lg border border-border">
          <div className="text-[9px] font-bold text-muted-foreground uppercase">Veri Güveni</div>
          <div className="text-sm font-black text-foreground">%{score.confidenceScore}</div>
        </div>
        <div className="bg-card/50 p-2.5 rounded-lg border border-border">
          <div className="text-[9px] font-bold text-muted-foreground uppercase">Aylık Borç Yükü</div>
          <div className="text-sm font-black text-foreground">{assessment ? `%${(assessment.metrics.structuralDti * 100).toFixed(0)}` : `${(score.installmentBurdenRatio).toFixed(0)}%`}</div>
        </div>
        <div className="bg-card/50 p-2.5 rounded-lg border border-border">
          <div className="text-[9px] font-bold text-muted-foreground uppercase">Nakit Tamponu</div>
          <div className="text-sm font-black text-foreground">{score.cashBufferMonths.toFixed(1)} ay</div>
        </div>
        <div className="bg-card/50 p-2.5 rounded-lg border border-border">
          <div className="text-[9px] font-bold text-muted-foreground uppercase">Tasarruf Oranı</div>
          <div className="text-sm font-black text-foreground">%{score.savingsRate.toFixed(0)}</div>
        </div>
      </div>

      <div className="flex justify-between items-center text-[9px] font-black text-muted-foreground uppercase tracking-tighter pt-1 opacity-71">
        <span>Sürüm: v{assessment?.version || '6.1.1'} DSS Protocol</span>
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
