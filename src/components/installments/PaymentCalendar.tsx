import { useState, useEffect, useMemo } from 'react';
import { CURRENCY_SYMBOL } from '@/constants';
import { dataSourceAdapter } from '@/services/supabase/adapter';
import type { Installment, Account, Transaction } from '@/types';
import { cashFlowEngine } from '@/services/cashFlowEngine';
import { calculateCCDates } from '@/utils/dateUtils';
import { useTimeStore } from '@/stores/timeStore';

// Refactored Sub-components
import { PaymentActionList } from './calendar/PaymentActionList';
import { PaymentModals } from './calendar/PaymentModals';

interface PaymentCalendarProps {
  installments: Installment[];
  accounts: Account[];
  onUpdateInstallment: (id: string, updates: Partial<Installment>) => Promise<void>;
}

interface MonthData {
  label: string;
  year: number;
  month: number;
  total: number;
  active: Installment[];
  finishing: Installment[];
  monthKey: string; // YYYY-MM
  isPaid: boolean;
  hasDelinquency: boolean;
}

export default function PaymentCalendar({ installments, accounts, onUpdateInstallment }: PaymentCalendarProps): JSX.Element {
  const { systemDate } = useTimeStore();
  const [monthOffset, setMonthOffset] = useState(0);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [editingDetails, setEditingDetails] = useState<{
    instId: string;
    monthKey: string;
    amount: string;
    note: string;
  } | null>(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [applyToAll, setApplyToAll] = useState(false);

  const [confirmModalData, setConfirmModalData] = useState<{
    type: 'single' | 'bulk';
    installment?: Installment;
    month?: MonthData;
    monthKey: string;
    accountId: string;
    isChangingAccount?: boolean;
    ccPaymentType?: 'full' | 'min';
  } | null>(null);

  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    const loadAllTransactions = async () => {
      // Takvimin [CC_PAYMENT] etiketlerini Cüzdan dahil her yerde görebilmesi için
      // tüm işlemleri çekiyoruz.
      const { data: txs } = await dataSourceAdapter.transaction.list();
      setTransactions(txs || []);
    };
    loadAllTransactions();
  }, [accounts]);

  const active = installments.filter((i) => i.status === 'active');

  if (active.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500 dark:text-slate-400 text-sm">
        Aktif taksit yok — takvim görüntülenecek bir şey bulunamadı.
      </div>
    );
  }

  const now = new Date(systemDate);
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const months: MonthData[] = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(currentYear, currentMonth + i + monthOffset, 1);
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    
    const installmentsThisMonth = active.filter((inst) => {
      const firstDate = new Date(inst.firstPaymentDate);
      const startTotalMonths = firstDate.getFullYear() * 12 + firstDate.getMonth();
      const currentTotalMonths = d.getFullYear() * 12 + d.getMonth();
      const diff = currentTotalMonths - startTotalMonths;
      return diff >= 0 && diff < inst.totalMonths;
    });

    // Kredi Kartı Sanal Ekstrelerini Takvime Enjekte Et
    const ccInstallments = accounts
      .filter(a => a.type === 'kredi_kartı')
      .map(cc => {
        const statementData = cashFlowEngine.calculateStatementBalance(cc, transactions, systemDate);
        
        // Ödeme durumunu kontrol et (TASK 47.24 - Date Hardening)
        const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const existingTx = transactions.find(t => 
          t.description?.includes('[CC_PAYMENT]') &&
          t.description?.includes(`[CC_ID:${cc.id}]`) &&
          new Date(t.date).getMonth() === d.getMonth() &&
          new Date(t.date).getFullYear() === d.getFullYear()
        );

        const isPaid = !!existingTx;

        // Eğer bu ay için bir ödeme yoksa ve borç da yoksa gösterme
        if (!isPaid && statementData.statementBalance <= 0) return null;

        // Ödeme Tarihi Kontrolü (Sadece ödenmemişler için tarih filtresi uygula)
        const ccDates = calculateCCDates(cc.statementDay || 1, cc.paymentDay || 15, systemDate);
        const pDate = ccDates.paymentDate;

        if (!isPaid) {
          if (pDate.getMonth() !== d.getMonth() || pDate.getFullYear() !== d.getFullYear()) {
            return null;
          }
        }

        return {
          id: `virtual_cc_${cc.id}`,
          accountId: cc.id,
          lenderName: `${cc.name} Ekstresi`,
          type: 'kredi_kartı_taksiti',
          monthlyPayment: isPaid ? (existingTx?.amount || 0) : statementData.statementBalance,
          firstPaymentDate: pDate.toISOString(),
          totalMonths: 1,
          remainingMonths: 1,
          status: 'active',
          paymentHistory: isPaid ? {
            [monthKey]: {
              status: 'paid',
              amount: existingTx.amount,
              date: existingTx.date,
              note: existingTx.note
            }
          } : {} 
        } as unknown as Installment;
      }).filter(Boolean) as Installment[];
    
    // Taksitleri ve CC ekstrelerini birleştir
    installmentsThisMonth.push(...ccInstallments);

    const hasDelinquency = installmentsThisMonth.some(inst => {
      if (!inst.firstPaymentDate) return false;
      const startDate = new Date(inst.firstPaymentDate);
      const startYear = startDate.getFullYear();
      const startMonth = startDate.getMonth();
      
      const scanLimitYear = d.getFullYear();
      const scanLimitMonth = d.getMonth();
      const monthsDistance = (scanLimitYear - startYear) * 12 + (scanLimitMonth - startMonth);
      
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      for (let m = 0; m <= monthsDistance; m++) {
        const targetTotal = (startYear * 12 + startMonth) + m;
        const targetYear = Math.floor(targetTotal / 12);
        const targetMonthZeroIdx = targetTotal % 12;
        const scanKey = `${targetYear}-${String(targetMonthZeroIdx + 1).padStart(2, '0')}`;
        
        if (scanKey !== monthKey) continue;

        const history = inst.paymentHistory?.[scanKey];
        const isUnpaid = !history || !history.status || history.status !== 'paid';
        
        const specificDueDate = new Date(Date.UTC(targetYear, targetMonthZeroIdx, 15));
        if (isUnpaid && specificDueDate < thirtyDaysAgo) return true;
      }
      return false;
    });

    const finishingThisMonth = installmentsThisMonth.filter((inst) => {
      if (inst.type === 'kredi_kartı_taksiti') return false;

      const firstDate = new Date(inst.firstPaymentDate);
      const startTotalMonths = firstDate.getFullYear() * 12 + firstDate.getMonth();
      const currentTotalMonths = d.getFullYear() * 12 + d.getMonth();
      return currentTotalMonths === (startTotalMonths + inst.totalMonths - 1);
    });
    
    const total = installmentsThisMonth.reduce((sum, inst) => {
      const history = inst.paymentHistory?.[monthKey];
      if (history?.status === 'paid') return sum;
      return sum + (history?.amount ?? inst.monthlyPayment);
    }, 0);

    const isPaid = installmentsThisMonth.length > 0 && installmentsThisMonth.every(inst => inst.paymentHistory?.[monthKey]?.status === 'paid');

    months.push({
      label: d.toLocaleDateString('tr-TR', { month: 'short', year: '2-digit' }),
      year: d.getFullYear(),
      month: d.getMonth(),
      total,
      active: installmentsThisMonth,
      finishing: finishingThisMonth,
      monthKey,
      isPaid,
      hasDelinquency,
    });
  }

  const maxTotal = Math.max(...months.map((m) => m.total), 1);

  const fmt = (n: number) =>
    `${CURRENCY_SYMBOL}${n.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  const processAtomicPayment = async (
    inst: Installment,
    monthKey: string,
    accountId: string,
    amount: number,
    monthName: string
  ) => {
    let createdTxId: string | null = null;
    try {
      const newTx = await dataSourceAdapter.transaction.create({
        accountId,
        amount,
        type: 'gider',
        category: 'Taksit Ödemesi',
        description: `${inst.lenderName} - ${monthName} Taksidi`,
        date: new Date(),
        note: inst.note || ''
      });
      createdTxId = newTx.id;

      const account = await dataSourceAdapter.account.getById(accountId);
      if (!account) throw new Error("Hesap bulunamadı.");
      
      await dataSourceAdapter.account.update(accountId, {
        balance: account.balance - amount
      });

      const history = { ...(inst.paymentHistory || {}) };
      const currentEntry = history[monthKey] || {};
      history[monthKey] = { ...currentEntry, status: 'paid' };
      await onUpdateInstallment(inst.id, { 
        paymentHistory: history,
        remainingMonths: Math.max(0, (inst.remainingMonths || 0) - 1)
      });
    } catch (err) {
      if (createdTxId) {
        try {
          await dataSourceAdapter.transaction.delete(createdTxId);
        } catch (rollbackErr) {
          console.error('Critical: Rollback failed!', rollbackErr);
        }
      }
      throw err;
    }
  };

  const handleMarkPaid = async (month: MonthData) => {
    const activeToPay = month.active.filter(inst => inst.paymentHistory?.[month.monthKey]?.status !== 'paid');
    if (activeToPay.length === 0) return;

    const defaultAccountId = activeToPay.find(inst => inst.accountId)?.accountId || '';

    setConfirmModalData({
      type: 'bulk',
      month,
      monthKey: month.monthKey,
      accountId: defaultAccountId,
      isChangingAccount: !defaultAccountId
    });
  };

  const handleFinalExecutePayment = async () => {
    if (!confirmModalData || !confirmModalData.accountId) return;

    try {
      setIsProcessing(true);
      const { type, installment, month, monthKey, accountId } = confirmModalData;
      const installmentDate = new Date(month!.year, month!.month, 1);
      const monthName = installmentDate.toLocaleDateString('tr-TR', { month: 'long' });

      if (type === 'single' && installment) {
        const amount = (installment.paymentHistory?.[monthKey] as any)?.amount || installment.monthlyPayment;
        
        // Sanal Kredi Kartı Ödemesi (Interceptor)
        if (installment.id.startsWith('virtual_cc_')) {
          await dataSourceAdapter.transaction.create({
            accountId,
            amount,
            type: 'gider',
            category: 'Taksit Ödemesi',
            description: `[CC_PAYMENT] [CC_ID:${installment.accountId}] ${installment.lenderName} - ${monthName} Taksidi`,
            date: new Date(),
            note: installment.note || ''
          });
          const account = await dataSourceAdapter.account.getById(accountId);
          if (account) {
            await dataSourceAdapter.account.update(accountId, {
              balance: account.balance - amount
            });

            // Hedef Kredi Kartının (Debt) borcunu düşür
            const targetCcId = installment.accountId;
            console.log(`[CC_PAYMENT_EXECUTE] Kaynak Hesap: ${accountId}, Miktar: ${amount}, Hedef CC: ${targetCcId}`);
            
            if (targetCcId) {
              const targetCc = await dataSourceAdapter.account.getById(targetCcId);
              if (targetCc) {
                await dataSourceAdapter.account.update(targetCcId, {
                  balance: Math.max(0, targetCc.balance - amount)
                });
              }
            }
            console.log(`[CC_PAYMENT_SUCCESS] Ödeme tamamlandı, UI yenileniyor...`);
            setTimeout(() => window.location.reload(), 500);
          }
        } else {
          await processAtomicPayment(installment, monthKey, accountId, amount, monthName);
        }
      } else if (type === 'bulk' && month) {
        const activeToPay = month.active.filter(inst => inst.paymentHistory?.[monthKey]?.status !== 'paid');
        for (const inst of activeToPay) {
          const accountIdToUse = applyToAll ? accountId : (inst.accountId || accountId);
          let finalAmount = (inst.paymentHistory?.[monthKey] as any)?.amount || inst.monthlyPayment;
          await processAtomicPayment(inst, monthKey, accountIdToUse, finalAmount, monthName);
        }
      }

      setConfirmModalData(null);
      setApplyToAll(false);
    } catch (err) {
      console.error('Final ödeme yürütme hatası:', err);
      alert('İşlem sırasında bir hata oluştu ve finansal bütünlük için geri alındı.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMarkSinglePaid = async (inst: Installment, monthKey: string, month: MonthData) => {
    const defaultAccountId = inst.type === 'kredi_kartı_taksiti' 
      ? (accounts.find(a => a.type !== 'kredi_kartı')?.id || '') 
      : (inst.accountId || '');

    setConfirmModalData({
      type: 'single',
      installment: inst,
      month,
      monthKey,
      accountId: defaultAccountId,
      isChangingAccount: !defaultAccountId,
      ccPaymentType: 'full'
    });
  };

  const handleUndoPayment = async (inst: Installment, monthKey: string) => {
    try {
      setIsProcessing(true);
      const { data: txs } = await dataSourceAdapter.transaction.list();
      
      // 1. Bu aya ve bu karta ait KESİN işlemi bul (TASK 47.21)
      const paymentTx = txs.find(t => 
        t.description.includes(`[CC_PAYMENT]`) && 
        t.description.includes(`[CC_ID:${inst.accountId}]`) &&
        t.amount === (inst.monthlyPayment || (inst as any).amount)
      );

      if (paymentTx) {
        // 2. KAYNAK HESABI İADE ET (Beyin Cerrahı - TASK 47.26)
        const sourceAcc = await dataSourceAdapter.account.getById(paymentTx.accountId);
        if (sourceAcc) {
          const newSourceBalance = paymentTx.type === 'gider' 
            ? sourceAcc.balance + paymentTx.amount 
            : sourceAcc.balance - paymentTx.amount;
            
          await dataSourceAdapter.account.update(sourceAcc.id, {
            balance: newSourceBalance
          });
          console.log(`[UNDO_SYNC] Kaynak hesap (${sourceAcc.name}) iade edildi: ${newSourceBalance}`);
        }

        // 3. HEDEF KREDİ KARTINI İADE ET (Borcu geri yükle)
        const targetCcId = inst.accountId;
        const targetCc = await dataSourceAdapter.account.getById(targetCcId);
        
        if (targetCc && targetCc.type === 'kredi_kartı') {
          await dataSourceAdapter.account.update(targetCc.id, {
            balance: targetCc.balance + paymentTx.amount
          });
          console.log(`[UNDO_SYNC] Hedef CC (${targetCc.name}) borcu geri yüklendi.`);
        }

        // 4. İşlemi sil
        await dataSourceAdapter.transaction.delete(paymentTx.id);
      }
      // UI Senkronizasyonu için buffer'lı reload (Race condition engelleme)
      setTimeout(() => window.location.reload(), 800); 
    } catch (err) { 
      console.error(err); 
    } finally { 
      setIsProcessing(false); 
    }
  };

  const handleUpdateDetails = async (instId: string, monthKey: string, newAmount: number, newNote: string) => {
    const inst = installments.find(i => i.id === instId);
    if (!inst) return;
    const history = { ...(inst.paymentHistory || {}) };
    history[monthKey] = { ...history[monthKey], amount: newAmount, note: newNote };
    await onUpdateInstallment(instId, { paymentHistory: history });
    setEditingDetails(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <h3 className="text-sm font-bold text-neutral-800 dark:text-zinc-100 italic">
            {months[0].label} - {months[11].label} Perspektifi
          </h3>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">12 Aylık Finansal Öngörü</p>
        </div>
        <div className="flex items-center gap-1.5 p-1 bg-neutral-100 dark:bg-zinc-800/50 rounded-xl border border-neutral-200 dark:border-zinc-800">
          <button 
            onClick={() => setMonthOffset(p => p - 12)}
            className="p-1.5 hover:bg-white dark:hover:bg-zinc-800 rounded-lg text-neutral-500 dark:text-zinc-400 transition-all hover:text-primary-600"
            title="Önceki Yıl"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button 
            onClick={() => setMonthOffset(0)}
            className="px-2 py-0.5 text-[9px] font-black uppercase text-primary-600 dark:text-primary-400 bg-white dark:bg-zinc-800 rounded-md border border-neutral-200 dark:border-zinc-700 hover:shadow-sm"
          >
            BU YIL
          </button>
          <button 
            onClick={() => setMonthOffset(p => p + 12)}
            className="p-1.5 hover:bg-white dark:hover:bg-zinc-800 rounded-lg text-neutral-500 dark:text-zinc-400 transition-all hover:text-primary-600"
            title="Sonraki Yıl"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {months.map((m, idx) => {
          const barHeight = maxTotal > 0 ? Math.max(4, (m.total / maxTotal) * 48) : 4;
          const isCurrentMonth = idx === 0;
          
          return (
            <div
              key={idx}
              onClick={() => setSelectedMonth(selectedMonth === m.monthKey ? null : m.monthKey)}
              className={`rounded-2xl p-3 border-2 transition-all cursor-pointer relative overflow-hidden group ${
                m.isPaid
                  ? 'border-success-200 bg-success-50/50 dark:border-success-900/30 dark:bg-success-900/10 opacity-60'
                  : isCurrentMonth
                    ? 'border-primary-400 bg-primary-50 dark:border-primary-800 dark:bg-primary-900/20'
                    : m.finishing.length > 0
                      ? 'border-warning-300 bg-warning-50 dark:border-warning-900/30 dark:bg-warning-900/10'
                      : 'border-neutral-100 bg-white dark:border-zinc-800 dark:bg-zinc-900/50'
              } ${selectedMonth === m.monthKey ? 'ring-2 ring-primary-500 ring-offset-2 dark:ring-offset-slate-950 shadow-lg scale-[1.02]' : 'hover:border-neutral-300 dark:hover:border-zinc-700'}`}
            >
              {m.isPaid && (
                <div className="absolute top-0 right-0 bg-success-500 text-white text-[8px] font-bold px-2 py-0.5 rounded-bl-lg shadow-sm">
                  ÖDENDİ
                </div>
              )}

              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${isCurrentMonth ? 'text-primary-700 dark:text-primary-300' : 'text-slate-500 dark:text-zinc-300'}`}>
                    {m.label}
                  </span>
                  {m.hasDelinquency && (
                    <div 
                      className="w-4 h-4 bg-red-600 text-white rounded-full flex items-center justify-center text-[9px] font-black shadow-lg shadow-red-500/50 animate-pulse cursor-help shrink-0"
                      title="Bu tarihte veya öncesinde geciken taksit borcunuz var."
                    >
                      !
                    </div>
                  )}
                </div>
                
                <div className={`flex gap-1 transition-opacity ${selectedMonth === m.monthKey || 'group-hover:opacity-100 opacity-0'}`}>
                  {!m.isPaid && m.active.length > 0 && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleMarkPaid(m); }}
                      className="p-1 bg-success-100 dark:bg-success-900/40 text-success-600 dark:text-success-400 rounded-md hover:bg-success-200"
                      title="Tümünü Ödendi İşaretle"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-end gap-1 h-12 mb-2">
                <div
                  className={`w-full rounded-md transition-all ${
                    m.isPaid ? 'bg-success-400 dark:bg-success-600' : isCurrentMonth ? 'bg-blue-700 dark:bg-blue-400' : 'bg-blue-600 dark:bg-blue-500'
                  }`}
                  style={{ height: `${barHeight}px` }}
                />
              </div>

              <div className="text-sm font-black text-neutral-900 dark:text-white">
                {m.total === 0 && !m.isPaid ? '—' : fmt(m.total)}
              </div>
              
              <div className="flex items-center justify-between mt-1">
                <div className="text-[10px] font-bold text-neutral-700 dark:text-zinc-200">
                  {m.active.length} Taksit
                </div>
                {m.finishing.length > 0 && (
                  <div className="text-[10px] text-amber-500 font-bold text-right leading-tight">
                    {m.finishing.length === m.active.length ? 'BİTİYOR' : 'Bu Ay Biten Bir Taksit Var'}
                  </div>
                )}
              </div>

              {selectedMonth === m.monthKey && m.active.length > 0 && (
                <PaymentActionList 
                  installments={m.active}
                  finishing={m.finishing}
                  monthKey={m.monthKey}
                  monthData={{ year: m.year, month: m.month }}
                  accounts={accounts}
                  fmt={fmt}
                  isProcessing={isProcessing}
                  onEdit={(inst, amount, note) => setEditingDetails({ instId: inst.id, monthKey: m.monthKey, amount, note })}
                  onMarkPaid={(inst) => handleMarkSinglePaid(inst, m.monthKey, m)}
                  onUndo={(inst) => handleUndoPayment(inst, m.monthKey, m)}
                />
              )}
            </div>
          );
        })}
      </div>

      <PaymentModals 
        editingDetails={editingDetails}
        setEditingDetails={setEditingDetails}
        confirmModalData={confirmModalData}
        setConfirmModalData={setConfirmModalData}
        accounts={accounts}
        fmt={fmt}
        applyToAll={applyToAll}
        setApplyToAll={setApplyToAll}
        isProcessing={isProcessing}
        handleUpdateDetails={handleUpdateDetails}
        handleFinalExecutePayment={handleFinalExecutePayment}
      />
    </div>
  );
}
