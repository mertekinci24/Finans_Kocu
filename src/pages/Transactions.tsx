import { useState, useEffect, useMemo } from 'react';
import { CURRENCY_SYMBOL } from '@/constants';
import { useAuth } from '@/hooks/useAuth';
import { dataSourceAdapter } from '@/services/supabase/adapter';
import QuickInput from '@/components/transactions/QuickInput';
import TransactionRow from '@/components/transactions/TransactionRow';
import ImportPreview from '@/components/transactions/ImportPreview';
import TransactionForm from '@/components/transactions/TransactionForm';
import RecurringFlowPanel from '@/components/installments/RecurringFlowPanel';
import { Repeat } from 'lucide-react';
import type { Transaction, Account, Installment } from '@/types';

const TR_MONTHS = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
];

type FilterType = 'all' | 'gelir' | 'gider';

export default function Transactions(): JSX.Element {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAccountFilter, setSelectedAccountFilter] = useState('');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showImport, setShowImport] = useState(false);
  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const [dateRangeFilter, setDateRangeFilter] = useState<'all' | 'today' | 'week'>('all');
  const [sortConfig, setSortConfig] = useState<{ key: 'date' | 'amount'; direction: 'asc' | 'desc' }>({
    key: 'date',
    direction: 'desc',
  });

  // Task 45.15 & 45.91 Sync States
  const [pendingInstallmentDelete, setPendingInstallmentDelete] = useState<Transaction | null>(null);
  const [activeTab, setActiveTab] = useState<'records' | 'recurring'>('records');
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    console.log('[Filter Change]', { filter, categoryFilter, searchQuery, selectedAccountFilter });
  }, [filter, categoryFilter, searchQuery, selectedAccountFilter]);

  useEffect(() => {
    if (user?.id) {
      loadData(user.id);
    }
  }, [currentMonth, user?.id]);

  const loadData = async (userId: string) => {
    try {
      setLoading(true);
      const accs = await dataSourceAdapter.account.getByUserId(userId);
      setAccounts(accs);

      if (accs.length === 0) {
        setLoading(false);
        return;
      }

      const startDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      const endDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

      const txPromises = accs.map((acc) =>
        dataSourceAdapter.transaction.getByDateRange(acc.id, startDate, endDate)
      );
      const txArrays = await Promise.all(txPromises);
      const all = txArrays
        .flat()
        .sort((a, b) => {
          const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
          if (dateDiff !== 0) return dateDiff;
          return b.createdAt.getTime() - a.createdAt.getTime();
        });
      setTransactions(all);
    } catch (err) {
      console.error('İşlemler yüklenemedi:', err);
    } finally {
      setLoading(false);
    }
  };

  const syncAccountBalance = async (accountId: string, amount: number, type: 'gelir' | 'gider') => {
    const acc = accounts.find(a => a.id === accountId);
    if (!acc) return;
    
    let newBalance = acc.balance;
    if (acc.type === 'kredi_kartı') {
      // Credit card balance is usually treated as debt outstanding.
      // So expense increases debt, income (payment) decreases it.
      newBalance = type === 'gider' ? acc.balance + amount : acc.balance - amount;
    } else {
      // Bank / Cash
      newBalance = type === 'gelir' ? acc.balance + amount : acc.balance - amount;
    }

    try {
      const updatedAcc = await dataSourceAdapter.account.update(accountId, { balance: newBalance });
      setAccounts(prev => prev.map(a => a.id === accountId ? updatedAcc : a));
    } catch (err) {
      console.error('Bakiye güncellenirken hata:', err);
    }
  };

  const handleSave = async (data: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      setIsSyncing(true);
      const created = await dataSourceAdapter.transaction.create(data);
      setTransactions((prev) => [created, ...prev]);
      await syncAccountBalance(data.accountId, data.amount, data.type);
    } catch (err) {
      console.error('İşlem kaydedilirken hata:', err);
      alert('İşlem kaydedilemedi.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleUpdate = async (id: string, updates: Partial<Transaction>) => {
    const oldTx = transactions.find(t => t.id === id);
    if (!oldTx) return;

    try {
      setIsSyncing(true);
      const updated = await dataSourceAdapter.transaction.update(id, updates);
      
      // Task 45.91: If amount or type changed, recalibrate to maintain 100% integrity
      if (updates.amount !== undefined || updates.type !== undefined) {
        const acc = accounts.find(a => a.id === oldTx.accountId);
        if (acc) {
          const recalibratedAcc = await dataSourceAdapter.account.recalibrateBalance(acc.id);
          setAccounts(prev => prev.map(a => a.id === acc.id ? recalibratedAcc : a));
        }
      }

      setTransactions((prev) => prev.map((t) => (t.id === id ? updated : t)));
    } catch (err) {
      console.error('İşlem güncellenirken hata:', err);
      alert('İşlem güncellenemedi.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDelete = async (id: string) => {
    const tx = transactions.find(t => t.id === id);
    if (!tx) return;

    if (tx.category === 'Taksit Ödemesi') {
      setPendingInstallmentDelete(tx);
      return;
    }

    const warningText = `⚠️ BU İŞLEM GERİ ALINAMAZ!\n\n"${tx.description}" işlemini silmek istediğinize emin misiniz? Hesabınızın bakiyesi buna göre ters yönde güncellenecektir.`;
    if (!confirm(warningText)) return;

    try {
      setIsSyncing(true);

      // Task 45.91: Atomic Reversal
      const acc = accounts.find(a => a.id === tx.accountId);
      if (acc) {
        let newBalance = acc.balance;
        if (acc.type === 'kredi_kartı') {
          // Expense delete -> debt decreases
          // Income delete -> debt increases
          newBalance = tx.type === 'gider' ? acc.balance - tx.amount : acc.balance + tx.amount;
        } else {
          // Income delete -> balance decreases
          // Expense delete -> balance increases
          newBalance = tx.type === 'gelir' ? acc.balance - tx.amount : acc.balance + tx.amount;
        }
        
        await dataSourceAdapter.account.update(acc.id, { balance: newBalance });
        setAccounts(prev => prev.map(a => a.id === acc.id ? { ...a, balance: newBalance } : a));
      }

      // TASK 47.25: Global CC Undo Interceptor
      if (tx.description?.includes('[CC_PAYMENT]')) {
        const match = tx.description.match(/\[CC_ID:(.*?)\]/);
        if (match && match[1]) {
          const targetCcId = match[1];
          console.log(`[GLOBAL_UNDO_INTERCEPT] Kredi kartı ödemesi siliniyor. Hedef CC: ${targetCcId}, İade: +${tx.amount}`);
          const targetCc = await dataSourceAdapter.account.getById(targetCcId);
          if (targetCc && targetCc.type === 'kredi_kartı') {
            await dataSourceAdapter.account.update(targetCcId, {
              balance: targetCc.balance + tx.amount
            });
            setAccounts(prev => prev.map(a => a.id === targetCcId ? { ...a, balance: targetCc.balance + tx.amount } : a));
          }
        }
      } else if (tx.description?.includes('[DEBT_PAYMENT]')) {
        const match = tx.description.match(/\[DEBT_ID:(.*?)\]/);
        if (match && match[1]) {
          const targetDebtId = match[1];
          console.log(`[GLOBAL_UNDO_INTERCEPT] Borç ödemesi siliniyor. Hedef Borç: ${targetDebtId}, İade: +${tx.amount}`);
          const targetDebt = await dataSourceAdapter.debt.getById(targetDebtId);
          if (targetDebt) {
            await dataSourceAdapter.debt.update(targetDebtId, {
              remainingAmount: targetDebt.remainingAmount + tx.amount,
              status: 'active'
            });
          }
        }
      }

      await dataSourceAdapter.transaction.delete(id);
      setTransactions((prev) => prev.filter((t) => t.id !== id));
      
    } catch (err) {
      console.error('İşlem silinirken hata:', err);
      alert('Bakiye güncellenemediği için işlem silinemedi. Finansal bütünlük için işlem durduruldu.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRecalibrateAccount = async () => {
    if (!selectedAccountFilter) {
      alert('Lütfen önce bir hesap seçin.');
      return;
    }
    
    const acc = accounts.find(a => a.id === selectedAccountFilter);
    if (!acc) return;

    if (!confirm(`${acc.name} hesabının bakiyesi işlem geçmişine göre yeniden hesaplanacak. Emin misiniz?`)) return;

    try {
      setIsSyncing(true);
      const updatedAcc = await dataSourceAdapter.account.recalibrateBalance(acc.id);
      setAccounts(prev => prev.map(a => a.id === acc.id ? updatedAcc : a));
      alert('Kasa başarıyla eşitlendi (v7.0).');
    } catch (err) {
      console.error('Senkronizasyon hatası:', err);
      alert('Bakiye senkronize edilemedi.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleExecuteSyncDelete = async () => {
    if (!pendingInstallmentDelete) return;
    const tx = pendingInstallmentDelete;

    try {
      setIsSyncing(true);
      
      // 1. Account Balance reversal
      const acc = accounts.find(a => a.id === tx.accountId);
      if (acc) {
        let newBalance = acc.balance;
        if (acc.type === 'kredi_kartı') {
          // Refund decreases debt
          newBalance = acc.balance - tx.amount;
        } else {
          // Refund increases balance
          newBalance = acc.balance + tx.amount;
        }
        await dataSourceAdapter.account.update(acc.id, { balance: newBalance });
        setAccounts(prev => prev.map(a => a.id === acc.id ? { ...a, balance: newBalance } : a));
      }

      // TASK 47.25: Global CC Undo Interceptor (Sync Delete)
      if (tx.description?.includes('[CC_PAYMENT]')) {
        const match = tx.description.match(/\[CC_ID:(.*?)\]/);
        if (match && match[1]) {
          const targetCcId = match[1];
          console.log(`[GLOBAL_UNDO_INTERCEPT] Kredi kartı ödemesi siliniyor (Sync). Hedef CC: ${targetCcId}, İade: +${tx.amount}`);
          const targetCc = await dataSourceAdapter.account.getById(targetCcId);
          if (targetCc && targetCc.type === 'kredi_kartı') {
            await dataSourceAdapter.account.update(targetCcId, {
              balance: targetCc.balance + tx.amount
            });
            setAccounts(prev => prev.map(a => a.id === targetCcId ? { ...a, balance: targetCc.balance + tx.amount } : a));
          }
        }
      } else if (tx.description?.includes('[DEBT_PAYMENT]')) {
        const match = tx.description.match(/\[DEBT_ID:(.*?)\]/);
        if (match && match[1]) {
          const targetDebtId = match[1];
          console.log(`[GLOBAL_UNDO_INTERCEPT] Borç ödemesi siliniyor (Sync). Hedef Borç: ${targetDebtId}, İade: +${tx.amount}`);
          const targetDebt = await dataSourceAdapter.debt.getById(targetDebtId);
          if (targetDebt) {
            await dataSourceAdapter.debt.update(targetDebtId, {
              remainingAmount: targetDebt.remainingAmount + tx.amount,
              status: 'active'
            });
          }
        }
      }

      // 2. Installment Reversion
      // Description format: "${lenderName} - ${monthName} Taksidi"
      const [lender, rest] = tx.description.split(' - ');
      if (lender && rest) {
        const monthName = rest.replace(' Taksidi', '').trim();
        const monthIdx = TR_MONTHS.indexOf(monthName);
        
        if (monthIdx !== -1) {
          const installmentDate = new Date(tx.date);
          const monthStr = String(monthIdx + 1).padStart(2, '0');
          const monthKey = `${installmentDate.getFullYear()}-${monthStr}`;

          // Find matching installment
          const installments = await dataSourceAdapter.installment.getByUserId(user!.id);
          const inst = installments.find(i => i.lenderName === lender.trim());

          if (inst && inst.paymentHistory?.[monthKey]) {
            const updatedHistory = { ...inst.paymentHistory };
            delete updatedHistory[monthKey];
            
            await dataSourceAdapter.installment.update(inst.id, {
              paymentHistory: updatedHistory,
              remainingMonths: inst.remainingMonths + 1
            });
          }
        }
      }

      // 3. Final Transaction Delete
      await dataSourceAdapter.transaction.delete(tx.id);
      setTransactions((prev) => prev.filter((t) => t.id !== tx.id));
      setPendingInstallmentDelete(null);

    } catch (err) {
      console.error('Senkronize silme hatası:', err);
      alert('İşlem geri alınırken bir hata oluştu. Finansal bütünlük için işlem durduruldu.');
    } finally {
      setIsSyncing(false);
    }
  };

  const formatMonth = (date: Date) =>
    date.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' });

  const prevMonth = () => {
    setCurrentMonth((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    const next = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
    if (next <= new Date()) setCurrentMonth(next);
  };

  const categories = Array.from(new Set(transactions.map((t) => t.category))).sort();

  const filtered = useMemo(() => {
    let result = transactions.filter((t) => {
      // Basic type and category filters
      if (filter !== 'all' && t.type !== filter) return false;
      if (categoryFilter && t.category !== categoryFilter) return false;
      
      // Account filter
      if (selectedAccountFilter && t.accountId !== selectedAccountFilter) return false;
      
      // Date Range sub-filter
      if (dateRangeFilter !== 'all') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const txDate = new Date(t.date);
        txDate.setHours(0, 0, 0, 0);

        if (dateRangeFilter === 'today') {
          if (txDate.getTime() !== today.getTime()) return false;
        } else if (dateRangeFilter === 'week') {
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          weekAgo.setHours(0, 0, 0, 0);
          if (txDate < weekAgo) return false;
        }
      }

      // Search query (Description, Category, or Note)
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const desc = t.description.toLowerCase();
        const cat = t.category.toLowerCase();
        const note = (t.note || '').toLowerCase();
        if (!desc.includes(query) && !cat.includes(query) && !note.includes(query)) return false;
      }
      return true;
    });

    // Sorting
    return result.sort((a, b) => {
      if (sortConfig.key === 'date') {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        if (dateA !== dateB) {
          return sortConfig.direction === 'asc' ? dateA - dateB : dateB - dateA;
        }
        return sortConfig.direction === 'asc' 
          ? a.createdAt.getTime() - b.createdAt.getTime() 
          : b.createdAt.getTime() - a.createdAt.getTime();
      }
      return sortConfig.direction === 'asc' ? a.amount - b.amount : b.amount - a.amount;
    });
  }, [transactions, filter, categoryFilter, selectedAccountFilter, searchQuery, dateRangeFilter, sortConfig]);

  const { totalIncome, totalExpense, net } = useMemo(() => {
    const income = filtered.filter((t) => t.type === 'gelir').reduce((s, t) => s + t.amount, 0);
    const expense = filtered.filter((t) => t.type === 'gider').reduce((s, t) => s + t.amount, 0);
    return {
      totalIncome: income,
      totalExpense: expense,
      net: income - expense
    };
  }, [filtered]);

  const formatCurrency = (amount: number) =>
    `${CURRENCY_SYMBOL}${amount.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  const handleImportComplete = (imported: Transaction[]) => {
    setTransactions((prev) => [...imported, ...prev]);
  };

  const handleFormSave = async (tx: Transaction) => {
    const exists = transactions.find((t) => t.id === tx.id);
    
    setTransactions((prev) => {
      if (exists) return prev.map((t) => (t.id === tx.id ? tx : t));
      return [tx, ...prev];
    });

    if (!exists) {
      // Only sync balance for new transactions to avoid complex diffing logic right now
      await syncAccountBalance(tx.accountId, tx.amount, tx.type);
    }
    
    setShowTransactionForm(false);
  };

  return (
    <div className={`space-y-6 min-h-screen transition-colors duration-500 ${activeTab === 'recurring' ? 'bg-zinc-950 px-4 py-2 -mx-4 -my-2' : ''}`}>
       {showImport && (
        <ImportPreview
          accounts={accounts}
          existingTransactions={transactions}
          onImportComplete={handleImportComplete}
          onClose={() => setShowImport(false)}
        />
      )}

      {/* AMOLED Sync Delete Confirmation Modal */}
      {pendingInstallmentDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 rounded-3xl p-6 max-w-md w-full shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="w-16 h-16 bg-error-50 dark:bg-error-900/20 rounded-2xl flex items-center justify-center mb-6 mx-auto">
              <svg className="w-8 h-8 text-error-600 dark:text-error-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            
            <h3 className="text-xl font-bold text-center text-neutral-900 dark:text-white mb-2">Taksit İşlemini Sil?</h3>
            <p className="text-center text-neutral-500 dark:text-zinc-400 text-sm mb-8 leading-relaxed">
              Bu bir <span className="font-bold text-neutral-900 dark:text-white">taksit ödemesidir</span>. Sildiğinizde:
              <br/><br/>
              • <span className="text-success-600 font-bold">%{pendingInstallmentDelete.amount}</span> hesabınıza iade edilecek.
              <br/>
              • Taksit takviminde bu ay <span className="text-error-600 font-bold">"Ödenmedi"</span> olarak işaretlenecek.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <button
                disabled={isSyncing}
                onClick={handleExecuteSyncDelete}
                className="py-3.5 bg-error-600 hover:bg-error-700 text-white rounded-2xl text-sm font-bold transition-all shadow-lg shadow-error-500/20 disabled:opacity-50"
              >
                {isSyncing ? 'İşleniyor...' : 'Onayla ve Sil'}
              </button>
              <button
                disabled={isSyncing}
                onClick={() => setPendingInstallmentDelete(null)}
                className="py-3.5 bg-neutral-100 dark:bg-zinc-800 text-neutral-600 dark:text-zinc-300 rounded-2xl text-sm font-bold hover:bg-neutral-200 dark:hover:bg-zinc-700 transition-all"
              >
                Vazgeç
              </button>
            </div>
          </div>
        </div>
      )}

      {showTransactionForm && (
        <TransactionForm
          accounts={accounts}
          onSave={handleFormSave}
          onClose={() => setShowTransactionForm(false)}
        />
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-white">
            {activeTab === 'recurring' ? 'Sabit Akış Planlama' : 'İşlem Kayıtları'}
          </h1>
          <p className="text-neutral-600 dark:text-zinc-400 mt-1 text-sm">
            {activeTab === 'recurring' ? 'Gelecek ödemeleri ve gelirleri yönet' : 'Bugün ve geçmişteki tüm hareketlerin'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {activeTab === 'recurring' && (
            <button
              onClick={() => setShowTransactionForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-black rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20"
            >
              <Repeat className="w-4 h-4" />
              + Sabit/Planlı Akış
            </button>
          )}
          
              <button
                onClick={() => setShowImport(true)}
                disabled={accounts.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 text-neutral-700 dark:text-zinc-300 text-sm font-medium rounded-xl hover:bg-neutral-50 dark:hover:bg-zinc-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                İçe Aktar
              </button>

              {selectedAccountFilter && (
                <button
                  onClick={handleRecalibrateAccount}
                  className="flex items-center gap-2 px-4 py-2 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 text-amber-700 dark:text-amber-400 text-sm font-black rounded-xl hover:bg-amber-100 transition-all shadow-sm"
                  title="Kasayı Eşitle (Registry Audit)"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  Kasayı Eşitle
                </button>
              )}
          <div className="flex items-center gap-1 bg-neutral-100 dark:bg-zinc-900 p-1 rounded-xl border border-neutral-200 dark:border-zinc-800">
             <button
               onClick={prevMonth}
               className="p-1.5 hover:bg-white dark:hover:bg-zinc-800 rounded-lg transition-all text-neutral-600 dark:text-zinc-400"
             >
               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
               </svg>
             </button>
             <span className="text-[11px] font-black text-neutral-700 dark:text-zinc-300 w-24 text-center uppercase tracking-tighter">
               {formatMonth(currentMonth)}
             </span>
             <button
               onClick={nextMonth}
               className="p-1.5 hover:bg-white dark:hover:bg-zinc-800 rounded-lg transition-all text-neutral-600 dark:text-zinc-400"
             >
               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
               </svg>
             </button>
          </div>
        </div>
      </div>

      {/* Radical Tabs */}
      <div className="flex p-1 bg-neutral-100 dark:bg-zinc-900 rounded-2xl w-fit border border-neutral-200 dark:border-zinc-800">
        <button
          onClick={() => setActiveTab('records')}
          className={`px-6 py-2 rounded-xl text-xs font-black transition-all ${
            activeTab === 'records' 
              ? 'bg-white dark:bg-zinc-800 text-primary-600 dark:text-white shadow-sm ring-1 ring-black/5' 
              : 'text-neutral-500 hover:text-neutral-700'
          }`}
        >
          KAYITLAR (ŞİMDİ)
        </button>
        <button
          onClick={() => setActiveTab('recurring')}
          className={`px-6 py-2 rounded-xl text-xs font-black transition-all ${
            activeTab === 'recurring' 
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' 
              : 'text-neutral-500 hover:text-neutral-700'
          }`}
        >
          PLANLAMA (GELECEK)
        </button>
      </div>

      {activeTab === 'records' ? (
        <>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-success-50 dark:bg-success-900/10 border border-success-200 dark:border-success-800/30 rounded-2xl p-4">
              <div className="text-[10px] text-success-700 dark:text-success-400 font-black uppercase tracking-widest">Gelir</div>
              <div className="text-2xl font-bold text-success-700 dark:text-success-400 mt-1">{formatCurrency(totalIncome)}</div>
            </div>
            <div className="bg-error-50 dark:bg-error-900/10 border border-error-200 dark:border-error-800/30 rounded-2xl p-4">
              <div className="text-[10px] text-error-700 dark:text-error-400 font-black uppercase tracking-widest">Gider</div>
              <div className="text-2xl font-bold text-error-700 dark:text-error-400 mt-1">{formatCurrency(totalExpense)}</div>
            </div>
            <div className={`${net >= 0 ? 'bg-primary-50 dark:bg-primary-900/10 border-primary-200 dark:border-primary-800/30' : 'bg-warning-50 dark:bg-warning-900/10 border-warning-200 dark:border-warning-800/30'} border rounded-2xl p-4`}>
              <div className={`text-[10px] font-black uppercase tracking-widest ${net >= 0 ? 'text-primary-700 dark:text-primary-400' : 'text-warning-700 dark:text-warning-400'}`}>Net</div>
              <div className={`text-2xl font-bold mt-1 ${net >= 0 ? 'text-primary-700 dark:text-primary-400' : 'text-warning-700 dark:text-warning-400'}`}>
                {net >= 0 ? '+' : ''}{formatCurrency(net)}
              </div>
            </div>
          </div>

          <QuickInput accounts={accounts} recentTransactions={transactions} onSave={handleSave} />

          <div className="bg-white dark:bg-zinc-900/50 border border-neutral-200 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-neutral-100 dark:border-zinc-800/50 flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="İşlem ara..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-white dark:bg-zinc-950 border border-neutral-200 dark:border-zinc-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all text-neutral-900 dark:text-white"
                />
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={selectedAccountFilter}
                  onChange={(e) => setSelectedAccountFilter(e.target.value)}
                  className="border border-neutral-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 text-neutral-600 dark:text-zinc-400 min-w-[140px]"
                >
                  <option value="">Hesap Seçin</option>
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>{acc.name}</option>
                  ))}
                </select>

                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="border border-neutral-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 text-neutral-600 dark:text-zinc-400 min-w-[140px]"
                >
                  <option value="">Tüm Kategoriler</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>

                <div className="flex bg-neutral-100 dark:bg-zinc-950 p-1 rounded-xl border border-neutral-200 dark:border-zinc-800">
                  {(['all', 'gelir', 'gider'] as FilterType[]).map((f) => (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter transition-all ${
                        filter === f
                          ? 'bg-white dark:bg-zinc-800 text-primary-600 dark:text-white shadow-sm'
                          : 'text-neutral-500'
                      }`}
                    >
                      {f === 'all' ? 'Tümü' : f === 'gelir' ? 'Gelir' : 'Gider'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {loading ? (
              <div className="space-y-2 p-4 animate-pulse">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-12 bg-neutral-100 rounded-lg" />
                ))}
              </div>
            ) : filtered.length > 0 ? (
              <div className="divide-y divide-neutral-50 dark:divide-zinc-800/50 p-2">
                {filtered.map((tx) => (
                  <TransactionRow
                    key={tx.id}
                    transaction={tx}
                    account={accounts.find((a) => a.id === tx.accountId)}
                    onUpdate={handleUpdate}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-neutral-500">
                <p className="text-sm font-bold opacity-30">BU AY İŞLEM BULUNAMADI</p>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-6 shadow-2xl animate-in slide-in-from-right-4 duration-300">
          <RecurringFlowPanel isObserver={true} />
        </div>
      )}
    </div>
  );
}
