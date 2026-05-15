import { FinancialScoreSkeleton } from '../WidgetSkeletons';
import FinancialScoreCard from '@/components/insights/FinancialScoreCard';
import { DetailedScore } from '@/services/scoringEngine';

interface FinancialScoreWidgetProps {
  score: DetailedScore | null;
  isLoading: boolean;
}

/**
 * v8.9 Honest Math Pass-Through
 * This component performs ZERO logic, ZERO rounding, and ZERO intercepts.
 * It is a pure mirror of the ScoringEngine payload.
 */
export default function FinancialScoreWidget({
  score,
  isLoading,
}: FinancialScoreWidgetProps): JSX.Element {

  if (isLoading) {
    return <FinancialScoreSkeleton />;
  }

  if (!score) {
    return (
      <div className="h-48 flex flex-col items-center justify-center gap-2 text-center px-4">
        <span className="text-3xl">🎯</span>
        <p className="text-foreground font-black text-sm uppercase tracking-tight">
          Finansal Sağlık Skoru Yok
        </p>
        <p className="text-muted-foreground text-xs leading-relaxed max-w-48">
          İlk skorunu oluşturmak için hesap, gelir/gider veya borç bilgisi ekle.
        </p>
      </div>
    );
  }

  // BARE-METAL PASS THROUGH: No modification of score data allowed here.
  return (
    <FinancialScoreCard 
      score={score.score} 
      explanation={score.explanation} 
      label={score.label} 
      color={score.color}
      assessment={score.assessment}
    />
  );
}
