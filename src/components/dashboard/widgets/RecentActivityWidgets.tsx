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
        <h3 className="text-[11px] font-black text-foreground uppercase tracking-widest">Son İşlemler</h3>
        <button
          onClick={onNavigate}
          className="text-[9px] font-bold text-primary hover:underline tracking-widest uppercase"
        >
          Tümü »
        </button>
      </div>
      {transactions.length > 0 ? (
        <div className="space-y-1.5">
          {transactions.map((tx) => (
            <div
              key={tx.id}
              className="flex items-center justify-between p-2 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors border border-border"
            >
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-bold text-foreground truncate">{tx.description}</div>
                <div className="text-[8px] text-muted-foreground font-bold uppercase">{tx.category}</div>
              </div>
              <div
                className={`text-[11px] font-black ml-2 ${
                  tx.type === 'gelir' ? 'text-success' : 'text-error'
                }`}
              >
                {tx.type === 'gelir' ? '+' : '-'}{fmt(tx.amount)}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-5 space-y-2">
          <p className="text-xl">📋</p>
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">İşlem Bulunmuyor</p>
          <button
            onClick={onNavigate}
            className="text-[9px] font-black text-primary hover:underline uppercase tracking-widest"
          >
            + İşlem Ekle →
          </button>
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
        <h2 className="text-[11px] font-black text-foreground uppercase tracking-widest">
          Aktif Taksitler
        </h2>
        <button
          onClick={onNavigate}
          className="text-[9px] font-bold text-primary hover:underline tracking-widest uppercase"
        >
          Pazaryeri »
        </button>
      </div>
      {installments.length > 0 ? (
        <div className="space-y-1.5">
          {installments.slice(0, 5).map((inst) => (
            <div
              key={inst.id}
              className="flex items-center justify-between p-2 bg-muted/30 rounded-lg border border-border"
            >
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-bold text-foreground truncate">{inst.lenderName}</div>
                <div className="text-[8px] text-muted-foreground font-bold uppercase">
                  {inst.remainingMonths} Taksit Mevcut
                </div>
              </div>
              <div className="text-[11px] font-black text-primary ml-2">
                {fmt(inst.monthlyPayment)}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-5 space-y-2">
          <p className="text-xl">💳</p>
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Aktif Taksit Yok</p>
          <button
            onClick={onNavigate}
            className="text-[9px] font-black text-primary hover:underline uppercase tracking-widest"
          >
            Taksit Pazarı →
          </button>
        </div>
      )}
    </div>
  );
}
