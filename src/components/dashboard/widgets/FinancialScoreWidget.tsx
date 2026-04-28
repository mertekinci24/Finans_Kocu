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
      <div className="h-48 flex items-center justify-center">
        <p className="text-neutral-500 text-center uppercase font-black text-[10px] tracking-widest">Veri Bulunamadı</p>
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
    />
  );
}
