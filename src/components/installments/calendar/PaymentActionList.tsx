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
    <div className="mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-800 space-y-2 animate-in fade-in slide-in-from-top-1">
      {installments.map(inst => {
        const status = inst.paymentHistory?.[monthKey]?.status;
        const customAmount = inst.paymentHistory?.[monthKey]?.amount;
        const note = inst.paymentHistory?.[monthKey]?.note;
        const isMissingHistory = !status || status !== 'paid';
        const isHistoricalDelinquency = isMissingHistory && monthKey < currentMonthKey;

        return (
          <div key={inst.id} className={`flex flex-col gap-1 py-1.5 px-2.5 rounded-xl border transition-all ${
            isHistoricalDelinquency 
              ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-900/40' 
              : inst.type === 'kredi_kartı_taksiti'
                ? 'bg-amber-50/20 dark:bg-amber-900/10 border-amber-100/30'
                : 'bg-neutral-50/50 dark:bg-zinc-800/50 border-neutral-100 dark:border-zinc-800/50 hover:border-neutral-200 dark:hover:border-zinc-700/50'
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
                            ? 'bg-success-500 shadow-[0_0_10px_rgba(34,197,94,0.4)]' 
                            : isHistoricalDelinquency 
                              ? 'bg-red-500 animate-pulse' 
                              : isCC ? 'bg-amber-500' : 'bg-blue-500'
                        }`} />
                        <span className={`text-[11px] font-bold truncate ${isHistoricalDelinquency ? 'text-red-700 dark:text-red-400' : 'text-neutral-600 dark:text-zinc-100'}`}>
                          {inst.lenderName}
                        </span>
                        <span className="text-[9px] font-bold text-neutral-400 dark:text-zinc-500 tabular-nums">
                          {dueDateLabel}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <div className={`px-1.5 py-0.5 rounded text-[8px] font-black border uppercase tracking-tighter shrink-0 ${TYPE_BADGE_STYLE[inst.type || 'kredi_kartı_taksiti']}`}>
                          {TYPE_LABELS[inst.type || 'kredi_kartı_taksiti']}
                        </div>
                        {account && (
                          <span className="text-[8px] font-bold text-neutral-400 dark:text-zinc-500 opacity-80 uppercase tracking-[0.1em]">
                             • {account.name}
                          </span>
                        )}
                      </div>
                      {finishing.some(f => f.id === inst.id) && (
                        <span className="text-[9px] text-amber-500 font-bold pl-3 mt-1 animate-pulse">Taksit Bitimi</span>
                      )}
                    </div>
                    <span className={`text-xs font-black ${
                      status === 'paid' 
                        ? isCC ? 'text-emerald-500 line-through opacity-90' : 'text-success-600/80 line-through opacity-70' 
                        : 'text-neutral-900 dark:text-zinc-100'
                    }`}>
                      {fmt(customAmount ?? inst.monthlyPayment)}
                    </span>
                  </div>

                  {note && (
                    <div className="pl-3.5 text-[9px] italic text-neutral-500 dark:text-zinc-300 truncate">
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
                          className="p-1 text-neutral-400 dark:text-zinc-400 hover:text-primary-600 hover:bg-white dark:hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-50"
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
                          className="p-1 text-neutral-400 dark:text-zinc-400 hover:text-success-600 hover:bg-white dark:hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-50"
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
                        className="text-[10px] font-bold text-neutral-400 hover:text-neutral-600 dark:text-zinc-400 dark:hover:text-zinc-100 uppercase px-2 py-1 disabled:opacity-50"
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
