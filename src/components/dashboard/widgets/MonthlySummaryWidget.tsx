import { CURRENCY_SYMBOL } from '@/constants';
import { MonthlySummarySkeleton } from '../WidgetSkeletons';

interface MonthlySummaryWidgetProps {
  monthlyIncome: number;
  monthlyExpenses: number;
  monthlyInstallment: number;
  isLoading: boolean;
  displayIncome: number;
  displayExpenses: number;
}

export default function MonthlySummaryWidget({
  monthlyInstallment,
  isLoading,
  displayIncome,
  displayExpenses,
}: MonthlySummaryWidgetProps): JSX.Element {
  if (isLoading) {
    return <MonthlySummarySkeleton />;
  }

  const fmt = (n: number) =>
    `${CURRENCY_SYMBOL}${n.toLocaleString('tr-TR', { minimumFractionDigits: 0 })}`;

  const savings = displayIncome - displayExpenses - monthlyInstallment;

  return (
    <div className="space-y-3">
      <div>
        <p className="text-xs text-neutral-600">Aylık Gelir</p>
        <p className="text-lg font-bold text-success-600">{fmt(displayIncome)}</p>
      </div>
      <div className="border-t border-neutral-200 pt-3">
        <p className="text-xs text-neutral-600">Aylık Gider</p>
        <p className="text-lg font-bold text-error-600">{fmt(displayExpenses)}</p>
      </div>
      <div className="border-t border-neutral-200 pt-3">
        <p className="text-xs text-neutral-600">Taksitler</p>
        <p className="text-lg font-bold text-warning-600">{fmt(monthlyInstallment)}</p>
      </div>
      <div className="border-t border-neutral-200 pt-3 bg-blue-50 p-3 rounded">
        <p className="text-xs text-neutral-600">Tasarruf</p>
        <p className={`text-lg font-bold ${savings >= 0 ? 'text-success-600' : 'text-error-600'}`}>
          {fmt(Math.abs(savings))}
        </p>
      </div>
    </div>
  );
}
