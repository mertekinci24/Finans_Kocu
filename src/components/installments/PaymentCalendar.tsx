import { CURRENCY_SYMBOL } from '@/constants';
import type { Installment } from '@/types';

interface PaymentCalendarProps {
  installments: Installment[];
}

interface MonthData {
  label: string;
  year: number;
  month: number;
  total: number;
  active: Installment[];
  finishing: Installment[];
}

export default function PaymentCalendar({ installments }: PaymentCalendarProps): JSX.Element {
  const active = installments.filter((i) => i.status === 'active');

  if (active.length === 0) {
    return (
      <div className="text-center py-8 text-neutral-400 text-sm">
        Aktif taksit yok — takvim görüntülenecek bir şey bulunamadı.
      </div>
    );
  }

  const months: MonthData[] = [];
  const now = new Date();

  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const activeThisMonth = active.filter((inst) => inst.remainingMonths > i);
    const finishingThisMonth = active.filter((inst) => inst.remainingMonths === i + 1);
    const total = activeThisMonth.reduce((sum, inst) => sum + inst.monthlyPayment, 0);

    months.push({
      label: d.toLocaleDateString('tr-TR', { month: 'short', year: '2-digit' }),
      year: d.getFullYear(),
      month: d.getMonth(),
      total,
      active: activeThisMonth,
      finishing: finishingThisMonth,
    });
  }

  const maxTotal = Math.max(...months.map((m) => m.total), 1);

  const fmt = (n: number) =>
    `${CURRENCY_SYMBOL}${n.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-neutral-700">12 Aylık Taksit Takvimi</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {months.map((m, idx) => {
          const barHeight = maxTotal > 0 ? Math.max(4, (m.total / maxTotal) * 48) : 4;
          const isCurrentMonth = idx === 0;
          return (
            <div
              key={idx}
              className={`rounded-xl p-3 border transition-all ${
                isCurrentMonth
                  ? 'border-primary-400 bg-primary-50'
                  : m.finishing.length > 0
                    ? 'border-success-300 bg-success-50'
                    : 'border-neutral-200 bg-white'
              }`}
            >
              <div className="flex items-end justify-between mb-2">
                <span className={`text-xs font-medium ${isCurrentMonth ? 'text-primary-700' : 'text-neutral-600'}`}>
                  {m.label}
                </span>
                {m.finishing.length > 0 && (
                  <span className="text-xs bg-success-500 text-white px-1.5 py-0.5 rounded-full">
                    -{m.finishing.length}
                  </span>
                )}
              </div>

              <div className="flex items-end gap-0.5 h-12 mb-2">
                <div
                  className={`w-full rounded-sm transition-all ${
                    isCurrentMonth ? 'bg-primary-500' : m.total === 0 ? 'bg-neutral-100' : 'bg-primary-300'
                  }`}
                  style={{ height: `${barHeight}px` }}
                />
              </div>

              <div className={`text-sm font-bold ${m.total === 0 ? 'text-neutral-300' : isCurrentMonth ? 'text-primary-700' : 'text-neutral-800'}`}>
                {m.total === 0 ? '—' : fmt(m.total)}
              </div>
              <div className="text-xs text-neutral-400 mt-0.5">
                {m.active.length > 0 ? `${m.active.length} taksit` : 'Boş'}
              </div>

              {m.finishing.length > 0 && (
                <div className="text-xs text-success-600 font-medium mt-1">
                  {m.finishing.map((i) => i.lenderName).join(', ')} bitiyor
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
