import React from 'react';
import type { Installment, Account } from '@/types';
import { 
  INSTALLMENT_TYPE_LABELS as TYPE_LABELS, 
  INSTALLMENT_TYPE_BADGE_STYLE as TYPE_BADGE_STYLE 
} from '@/constants';

interface PaymentActionListProps {
  installments: Installment[];
  finishing: Installment[];
  monthKey: string;
  monthData: { year: number; month: number };
  accounts: Account[];
  fmt: (n: number) => string;
  isProcessing: boolean;
  onEdit: (inst: Installment, amount: string, note: string) => void;
  onMarkPaid: (inst: Installment) => void;
  onUndo: (inst: Installment) => void;
}

export const PaymentActionList: React.FC<PaymentActionListProps> = ({
  installments,
  finishing,
  monthKey,
  monthData,
  accounts,
  fmt,
  isProcessing,
  onEdit,
  onMarkPaid,
  onUndo
}) => {
  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  return (
    <div className="mt-3 pt-3 border-t border-border space-y-2 animate-in fade-in slide-in-from-top-1">
      {installments.map(inst => {
        const status = inst.paymentHistory?.[monthKey]?.status;
        const customAmount = inst.paymentHistory?.[monthKey]?.amount;
        const note = inst.paymentHistory?.[monthKey]?.note;
        const isMissingHistory = !status || status !== 'paid';
        const isHistoricalDelinquency = isMissingHistory && monthKey < currentMonthKey;

        return (
          <div key={inst.id} className={`flex flex-col gap-1 py-1.5 px-2.5 rounded-xl border transition-all ${
            isHistoricalDelinquency 
              ? 'bg-destructive/10 border-destructive/20' 
              : inst.type === 'kredi_kartı_taksiti'
                ? 'bg-score-warning-bg border-score-warning/20'
                : 'bg-muted border-border hover:border-border/80'
          }`}>
            {(() => {
              const account = accounts.find(a => a.id === inst.accountId);
              const isCC = inst.type === 'kredi_kartı_taksiti';
              const dueDateObj = new Date(monthData.year, monthData.month, 1);
              if (isCC && account?.paymentDay) {
                dueDateObj.setDate(account.paymentDay);
              } else {
                dueDateObj.setDate(new Date(inst.firstPaymentDate).getDate());
              }
              const dueDateLabel = dueDateObj.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });

              return (
                <>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                          status === 'paid' 
                            ? 'bg-success shadow-[0_0_10px_hsl(var(--success)/0.4)]' 
                            : isHistoricalDelinquency 
                              ? 'bg-destructive animate-pulse' 
                              : isCC ? 'bg-score-warning' : 'bg-primary'
                        }`} />
                        <span className={`text-[11px] font-bold truncate ${isHistoricalDelinquency ? 'text-destructive' : 'text-foreground'}`}>
                          {inst.lenderName}
                        </span>
                        <span className="text-[9px] font-bold text-muted-foreground tabular-nums">
                          {dueDateLabel}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <div className={`px-1.5 py-0.5 rounded text-[8px] font-black border uppercase tracking-tighter shrink-0 ${TYPE_BADGE_STYLE[inst.type || 'kredi_kartı_taksiti']}`}>
                          {TYPE_LABELS[inst.type || 'kredi_kartı_taksiti']}
                        </div>
                        {account && (
                          <span className="text-[8px] font-bold text-muted-foreground opacity-80 uppercase tracking-[0.1em]">
                             • {account.name}
                          </span>
                        )}
                      </div>
                      {finishing.some(f => f.id === inst.id) && (
                        <span className="text-[9px] text-score-warning font-bold pl-3 mt-1 animate-pulse">Taksit Bitimi</span>
                      )}
                    </div>
                    <span className={`text-xs font-black ${
                      status === 'paid' 
                        ? isCC ? 'text-emerald-500 line-through opacity-90' : 'text-success/80 line-through opacity-70' 
                        : 'text-foreground'
                    }`}>
                      {fmt(customAmount ?? inst.monthlyPayment)}
                    </span>
                  </div>

                  {note && (
                    <div className="pl-3.5 text-[9px] italic text-muted-foreground truncate">
                      📝 {note}
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2 justify-end mt-1">
                    {status !== 'paid' && (
                      <>
                        <button 
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            onEdit(inst, String(customAmount ?? inst.monthlyPayment), note || '');
                          }}
                          disabled={isProcessing}
                          className="p-1 text-muted-foreground hover:text-primary hover:bg-card rounded-lg transition-colors disabled:opacity-50"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            onMarkPaid(inst);
                          }}
                          disabled={isProcessing}
                          className="p-1 text-muted-foreground hover:text-success hover:bg-card rounded-lg transition-colors disabled:opacity-50"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </button>
                      </>
                    )}
                    {status === 'paid' && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          onUndo(inst);
                        }}
                        disabled={isProcessing}
                        className="text-[10px] font-bold text-muted-foreground hover:text-foreground uppercase px-2 py-1 disabled:opacity-50"
                      >
                        {isProcessing ? '...' : 'Geri Al'}
                      </button>
                    )}
                  </div>
                </>
              );
            })()}
          </div>
        );
      })}
    </div>
  );
};
