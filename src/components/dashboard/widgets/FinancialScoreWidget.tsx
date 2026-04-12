import { FinancialScoreSkeleton } from '../WidgetSkeletons';
import FinancialScoreCard from '@/components/insights/FinancialScoreCard';
import { DetailedScore } from '@/services/scoringEngine';

interface FinancialScoreWidgetProps {
  score: DetailedScore | null;
  isLoading: boolean;
}

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
        <p className="text-neutral-500 text-center">Veri yüklenemedi</p>
      </div>
    );
  }

  return <FinancialScoreCard score={score.score} explanation={score.explanation} />;
}
