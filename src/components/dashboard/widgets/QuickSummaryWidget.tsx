import { CURRENCY_SYMBOL } from '@/constants';

interface QuickSummaryWidgetProps {
  displayIncome: number;
  displayExpenses: number;
  useRealValue?: boolean;
}

export default function QuickSummaryWidget({
  displayIncome,
  displayExpenses,
  useRealValue = false,
}: QuickSummaryWidgetProps) {
  const fmt = (n: number) =>
    `${CURRENCY_SYMBOL}${n.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}`;

  return (
    <div className="space-y-4">
      <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-1 italic">
        Hızlı Performans Özeti
      </div>
      <div className="space-y-3">
        <div className="flex justify-between items-center bg-neutral-50 p-2 rounded-lg">
          <span className="text-xs font-medium text-neutral-600">Aylık Gelir</span>
          <span className="text-sm font-black text-emerald-600">{fmt(displayIncome)}</span>
        </div>
        <div className="flex justify-between items-center bg-neutral-50 p-2 rounded-lg">
          <span className="text-xs font-medium text-neutral-600">Aylık Gider</span>
          <span className="text-sm font-black text-rose-600">{fmt(displayExpenses)}</span>
        </div>
        <div className="flex justify-between items-center pt-2 border-t border-neutral-200">
          <span className="text-xs font-bold text-neutral-800">Net Akış</span>
          <span
            className={`text-sm font-black ${
              displayIncome - displayExpenses > 0 ? 'text-emerald-600' : 'text-rose-600'
            }`}
          >
            {fmt(displayIncome - displayExpenses)}
          </span>
        </div>
        {useRealValue && (
          <p className="text-[9px] text-neutral-400 font-bold uppercase text-center mt-2">
            Enflasyon Düzeltmeli (Reel) Veriler
          </p>
        )}
      </div>
    </div>
  );
}
