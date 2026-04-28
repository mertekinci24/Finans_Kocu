import { CURRENCY_SYMBOL } from '@/constants';
import { MonthlySummarySkeleton } from '../WidgetSkeletons';

interface MonthlySummaryWidgetProps {
  monthlyIncome: number;
  monthlyExpenses: number;
  monthlyInstallment: number;
  monthlyMRE: number;
  isLoading: boolean;
  displayIncome: number;
  displayExpenses: number;
  displayMRE: number;
}

export default function MonthlySummaryWidget({
  monthlyInstallment,
  isLoading,
  displayIncome,
  displayMRE,
}: MonthlySummaryWidgetProps): JSX.Element {
  if (isLoading) {
    return <MonthlySummarySkeleton />;
  }

  const fmt = (n: number) =>
    `${CURRENCY_SYMBOL}${n.toLocaleString('tr-TR', { minimumFractionDigits: 0 })}`;

  const savings = displayIncome - displayMRE;

  return (
    <div className="space-y-3">
      <div>
        <p className="text-xs text-neutral-600">Aylık Gelir</p>
        <p className="text-lg font-bold text-success-600">{fmt(displayIncome)}</p>
      </div>
      <div className="border-t border-neutral-200 pt-3">
        <div className="flex items-center gap-1.5 mb-0.5">
          <p className="text-xs text-neutral-600 uppercase tracking-tighter font-bold">Aylık Gider (MRE)</p>
          <div className="w-3 h-3 rounded-full bg-neutral-100 flex items-center justify-center text-[8px] font-bold text-neutral-400 cursor-help" title="Sabit faturalar, taksitler ve zorunlu yaşam giderleri toplamı (Hayatta Kalma Maliyeti)">?</div>
        </div>
        <p className="text-lg font-bold text-error-600">{fmt(displayMRE)}</p>
        <p className="text-[10px] text-neutral-500 mt-1 leading-tight">Bu rakam taksitleriniz ve aylık ortalama zorunlu giderlerinizden oluşur.</p>
      </div>
      <div className="border-t border-neutral-200 pt-3">
        <p className="text-xs text-neutral-600">Taksitler</p>
        <p className="text-lg font-bold text-warning-600">{fmt(monthlyInstallment)}</p>
      </div>
      <div className="border-t border-neutral-200 pt-3 bg-blue-50 dark:bg-zinc-800/50 p-3 rounded">
        <p className="text-xs text-neutral-600">Nefes Payı / Tasarruf</p>
        <p className={`text-lg font-bold ${savings >= 0 ? 'text-success-600' : 'text-red-500'}`}>
          {savings < 0 ? '-' : ''}{fmt(Math.abs(savings))}
        </p>
      </div>
    </div>
  );
}
