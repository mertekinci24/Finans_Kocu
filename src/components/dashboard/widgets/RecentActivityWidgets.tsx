import { CURRENCY_SYMBOL } from '@/constants';
import { Transaction, Installment } from '@/types';

interface RecentTransactionsWidgetProps {
  transactions: Transaction[];
  onNavigate: () => void;
}

export function RecentTransactionsWidget({
  transactions,
  onNavigate,
}: RecentTransactionsWidgetProps) {
  const fmt = (n: number) =>
    `${CURRENCY_SYMBOL}${n.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}`;

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center mb-1">
        <h3 className="text-[11px] font-black text-neutral-800 uppercase tracking-widest">Son İşlemler</h3>
        <button
          onClick={onNavigate}
          className="text-[9px] font-bold text-primary-600 hover:underline tracking-widest uppercase"
        >
          Tümü »
        </button>
      </div>
      {transactions.length > 0 ? (
        <div className="space-y-1.5">
          {transactions.map((tx) => (
            <div
              key={tx.id}
              className="flex items-center justify-between p-2 bg-neutral-50/50 rounded-lg hover:bg-neutral-100 transition-colors border border-neutral-100"
            >
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-bold text-neutral-900 truncate">{tx.description}</div>
                <div className="text-[8px] text-neutral-400 font-bold uppercase">{tx.category}</div>
              </div>
              <div
                className={`text-[11px] font-black ml-2 ${
                  tx.type === 'gelir' ? 'text-emerald-600' : 'text-rose-600'
                }`}
              >
                {tx.type === 'gelir' ? '+' : '-'}{fmt(tx.amount)}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-4 text-neutral-400 text-[10px] font-bold uppercase">
          İşlem Bulunmuyor
        </div>
      )}
    </div>
  );
}

interface ActiveInstallmentsWidgetProps {
  installments: Installment[];
  onNavigate: () => void;
}

export function ActiveInstallmentsWidget({
  installments,
  onNavigate,
}: ActiveInstallmentsWidgetProps) {
  const fmt = (n: number) =>
    `${CURRENCY_SYMBOL}${n.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}`;

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center mb-1">
        <h2 className="text-[11px] font-black text-neutral-800 uppercase tracking-widest">
          Aktif Taksitler
        </h2>
        <button
          onClick={onNavigate}
          className="text-[9px] font-bold text-primary-600 hover:underline tracking-widest uppercase"
        >
          Pazaryeri »
        </button>
      </div>
      {installments.length > 0 ? (
        <div className="space-y-1.5">
          {installments.slice(0, 5).map((inst) => (
            <div
              key={inst.id}
              className="flex items-center justify-between p-2 bg-neutral-50/50 rounded-lg border border-neutral-100"
            >
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-bold text-neutral-900 truncate">{inst.lenderName}</div>
                <div className="text-[8px] text-neutral-400 font-bold uppercase">
                  {inst.remainingMonths} Taksit Mevcut
                </div>
              </div>
              <div className="text-[11px] font-black text-primary-600 ml-2">
                {fmt(inst.monthlyPayment)}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-4 text-neutral-400 text-[10px] font-bold uppercase">
          Aktif Taksit Bulunmuyor
        </div>
      )}
    </div>
  );
}
