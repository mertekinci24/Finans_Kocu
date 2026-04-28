import { CURRENCY_SYMBOL } from '@/constants';
import { Debt } from '@/types';

interface InstallmentLoadWidgetProps {
  monthlyInstallment: number;
  monthlyIncome: number;
}

export function InstallmentLoadWidget({
  monthlyInstallment,
  monthlyIncome,
}: InstallmentLoadWidgetProps) {
  const fmt = (n: number) =>
    `${CURRENCY_SYMBOL}${n.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}`;

  return (
    <div className="flex flex-col h-full justify-between">
      <div>
        <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-1 italic">
          Aylık Taksit Yükü
        </div>
        <div className="text-3xl font-black text-orange-500">{fmt(monthlyInstallment)}</div>
      </div>
      <div className="flex items-center gap-2 mt-4">
        <div className="px-2 py-0.5 bg-orange-100 text-orange-700 text-[10px] font-bold rounded-full">
          GELİRİN %{monthlyIncome > 0 ? ((monthlyInstallment / monthlyIncome) * 100).toFixed(0) : '—'}
        </div>
      </div>
    </div>
  );
}

interface TotalDebtWidgetProps {
  displayTotalDebt: number;
  activeDebtsCount: number;
}

export function TotalDebtWidget({
  displayTotalDebt,
  activeDebtsCount,
}: TotalDebtWidgetProps) {
  const fmt = (n: number) =>
    `${CURRENCY_SYMBOL}${n.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}`;

  return (
    <div className="flex flex-col h-full justify-between">
      <div>
        <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-1 italic">
          Toplam Borç Bakiyesi
        </div>
        <div className="text-3xl font-black text-rose-600">{fmt(displayTotalDebt)}</div>
      </div>
      <div className="text-[9px] text-neutral-400 font-bold uppercase tracking-wider mt-4">
        {activeDebtsCount} AKTİF BORÇ DOSYASI
      </div>
    </div>
  );
}
