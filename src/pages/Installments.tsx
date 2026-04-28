import { useState, useEffect } from 'react';
import { CURRENCY_SYMBOL } from '@/constants';
import { useAuth } from '@/hooks/useAuth';
import { dataSourceAdapter } from '@/services/supabase/adapter';
import InstallmentCard from '@/components/installments/InstallmentCard';
import InstallmentForm from '@/components/installments/InstallmentForm';
import PaymentCalendar from '@/components/installments/PaymentCalendar';
import RecurringFlowPanel from '@/components/installments/RecurringFlowPanel';
import type { Installment, Account } from '@/types';

const WARNING_THRESHOLD = 30;

export default function Installments(): JSX.Element {
  const { user } = useAuth();
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [monthlyIncome, setMonthlyIncome] = useState<number>(0);
  const [editingIncome, setEditingIncome] = useState(false);
  const [incomeInput, setIncomeInput] = useState('');
  const [activeTab, setActiveTab] = useState<'installments' | 'recurring'>('installments');

  useEffect(() => {
    if (user?.id) {
      loadData(user.id);
    }
  }, [user?.id]);

  const loadData = async (userId: string) => {
    try {
      setLoading(true);
      const [data, accounts] = await Promise.all([
        dataSourceAdapter.installment.getByUserId(userId),
        dataSourceAdapter.account.getByUserId(userId),
      ]);
      setInstallments(data);
      setAccounts(accounts);

      if (accounts.length > 0) {
        const now = new Date();
        const startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const endDate = new Date(now.getFullYear(), now.getMonth(), 0);
        const txArrays = await Promise.all(
          accounts.map((a) => dataSourceAdapter.transaction.getByDateRange(a.id, startDate, endDate))
        );
        const income = txArrays.flat().filter((t) => t.type === 'gelir').reduce((s, t) => s + t.amount, 0);
        if (income > 0) setMonthlyIncome(income);
      }
    } catch (err) {
      console.error('Taksitler yüklenemedi:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (data: Omit<Installment, 'id' | 'createdAt'>) => {
    if (!user?.id) return;
    const payload = { ...data, userId: user.id };
    const created = await dataSourceAdapter.installment.create(payload);
    setInstallments((prev) => [created, ...prev]);
    setShowForm(false);
  };

  const handleUpdate = async (id: string, updates: Partial<Installment>) => {
    const updated = await dataSourceAdapter.installment.update(id, updates);
    setInstallments((prev) => prev.map((i) => (i.id === id ? updated : i)));
  };

  const handleDelete = async (id: string) => {
    await dataSourceAdapter.installment.delete(id);
    setInstallments((prev) => prev.filter((i) => i.id !== id));
  };

  const saveIncome = () => {
    const val = parseFloat(incomeInput.replace(',', '.'));
    if (!isNaN(val) && val > 0) setMonthlyIncome(val);
    setEditingIncome(false);
  };

  const active = installments.filter((i) => i.status === 'active');
  const totalMonthlyLoad = active.reduce((sum, i) => sum + i.monthlyPayment, 0);
  const burdenRatio = monthlyIncome > 0 ? (totalMonthlyLoad / monthlyIncome) * 100 : 0;
  const isOverThreshold = burdenRatio > WARNING_THRESHOLD;

  const fmt = (n: number) =>
    `${CURRENCY_SYMBOL}${n.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 w-48 bg-neutral-200 rounded" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-neutral-200 rounded-xl" />)}
        </div>
      </div>
    );
  }

  const calculateTotalRemaining = () => {
    return active.reduce((sum, inst) => {
      let instSum = 0;
      const first = new Date(inst.firstPaymentDate);
      const startTotal = first.getFullYear() * 12 + first.getMonth();

      for (let m = 0; m < inst.totalMonths; m++) {
        const targetTotal = startTotal + m;
        const targetYear = Math.floor(targetTotal / 12);
        const targetMonth = (targetTotal % 12) + 1;
        const monthKey = `${targetYear}-${String(targetMonth).padStart(2, '0')}`;
        
        const history = inst.paymentHistory?.[monthKey];
        if (history?.status !== 'paid') {
          instSum += (history?.amount ?? inst.monthlyPayment);
        }
      }
      return sum + instSum;
    }, 0);
  };

  // Motivation Module Logic
  const getFinancialFreedomDate = () => {
    if (active.length === 0) return null;
    
    // Find the furthest absolute end date
    // Each installment ends at: nextPaymentDate + (remainingMonths - 1) months
    const now = new Date();
    const endDates = active.map(inst => {
      const date = new Date(inst.nextPaymentDate);
      date.setMonth(date.getMonth() + inst.remainingMonths - 1);
      return date.getTime();
    });

    const maxEndTime = Math.max(...endDates);
    const freedomDate = new Date(maxEndTime);
    
    const diffTime = freedomDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const totalMonthsLeft = Math.ceil(diffDays / 30);
    
    return {
      date: freedomDate.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' }),
      days: diffDays > 0 ? diffDays : 0,
      months: totalMonthsLeft > 0 ? totalMonthsLeft : 0
    };
  };

  const freedom = getFinancialFreedomDate();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-white">Taksit Merkezi</h1>
          <p className="text-neutral-600 dark:text-neutral-400 mt-1 text-sm">{active.length} aktif yükümlülük</p>
        </div>
        {activeTab === 'installments' && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Taksit Ekle
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-neutral-200 dark:border-zinc-800">
        <button
          onClick={() => setActiveTab('installments')}
          className={`px-6 py-3 text-sm font-bold transition-all relative ${
            activeTab === 'installments' 
              ? 'text-primary-600 dark:text-primary-400' 
              : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
          }`}
        >
          Kredi & Taksitler
          {activeTab === 'installments' && (
            <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary-600 dark:bg-primary-400" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('recurring')}
          className={`px-6 py-3 text-sm font-bold transition-all relative ${
            activeTab === 'recurring' 
              ? 'text-primary-600 dark:text-primary-400' 
              : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
          }`}
        >
          Sabit Akışlar (Maaş/Kira)
          {activeTab === 'recurring' && (
            <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary-600 dark:bg-primary-400" />
          )}
        </button>
      </div>

      {activeTab === 'installments' && (
        <>
          {/* Motivation Module - Compact Status Bar Style */}
      {freedom && (
        <div className="relative overflow-hidden bg-gradient-to-r from-primary-600 via-primary-500 to-indigo-600 rounded-2xl py-3 px-6 shadow-lg border border-white/10 dark:border-white/5">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <svg className="w-32 h-32 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
            </svg>
          </div>
          <div className="relative z-10">
            <div className="text-white/80 text-xs font-bold uppercase tracking-[0.2em] mb-1">Finansal Özgürlüğe Kalan</div>
            <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-6">
              <div className="flex items-center gap-2">
                <span className="text-2xl md:text-3xl font-black text-white">{freedom.days}</span>
                <span className="text-sm font-bold text-white/90">GÜN</span>
              </div>
              <div className="h-10 w-px bg-white/30 hidden md:block" />
              <div>
                <div className="text-white/80 text-[10px] font-bold uppercase tracking-wider">Hedef Tarih</div>
                <div className="text-lg font-black text-white">{freedom.date}</div>
              </div>
              <div className="flex-1 text-right self-center hidden lg:block">
                <div className="inline-flex items-center px-3 py-1 bg-white/10 backdrop-blur-md rounded-lg border border-white/20 text-white text-xs font-semibold">
                  <span className="mr-2">🎉</span> {freedom.months} ay sonra borçsuz bir hayat!
                </div>
              </div>
            </div>
          </div>
          {/* Subtle Progress Track background */}
          <div className="absolute bottom-0 left-0 w-full h-1 bg-white/10">
            <div className="h-full bg-white/30 animate-pulse" style={{ width: '40%' }} />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className={`rounded-xl border p-4 flex flex-col justify-between ${isOverThreshold ? 'bg-error-50 border-error-300 dark:bg-error-900/10 dark:border-error-800' : 'bg-primary-50 border-primary-200 dark:bg-zinc-900/50 dark:border-zinc-800'}`}>
          <div>
            <div className={`text-xs font-medium ${isOverThreshold ? 'text-error-700 dark:text-error-400' : 'text-primary-700 dark:text-primary-400'}`}>Aylık Taksit Yükü</div>
            <div className={`text-2xl font-bold mt-1 ${isOverThreshold ? 'text-error-700 dark:text-error-400' : 'text-primary-700 dark:text-primary-400'}`}>
              {fmt(totalMonthlyLoad)}
            </div>
          </div>
          
          {/* Summary Note Sync (Task 45.83) */}
          <div className="mt-4 pt-3 border-t border-primary-200/30 dark:border-zinc-700/50">
            <p className="text-[10px] leading-relaxed text-neutral-500 dark:text-zinc-400 italic font-medium">
              ℹ️ Bu aydaki kredi kartı ödemeleriniz, kartlarınızın ({
                [...new Set(active.filter(i => i.type === 'kredi_kartı_taksiti')
                  .map(i => accounts.find(a => a.id === i.accountId))
                  .filter(Boolean)
                  .map(a => `${a?.name} [${a?.paymentDay}]`))
                ].join(', ') || 'aktif kart yok'
              }) son ödeme günlerine göre navigatöre yansıtılmıştır.
            </p>
          </div>
        </div>

        <div className={`rounded-xl border p-4 ${isOverThreshold ? 'bg-error-50 border-error-300 dark:bg-error-900/10 dark:border-error-800' : 'bg-neutral-50 border-neutral-200 dark:bg-zinc-900/50 dark:border-zinc-800'}`}>
          <div className="flex items-center justify-between">
            <div className={`text-xs font-medium ${isOverThreshold ? 'text-error-700 dark:text-zinc-300' : 'text-neutral-600 dark:text-zinc-300'}`}>
              Gelirin %{burdenRatio > 0 ? burdenRatio.toFixed(0) : '—'}'i taksitte
            </div>
            <button
              onClick={() => { setIncomeInput(String(monthlyIncome || '')); setEditingIncome(true); }}
              className="text-xs text-primary-600 hover:underline"
            >
              Gelir gir
            </button>
          </div>
          {editingIncome ? (
            <div className="flex gap-1 mt-2">
              <input
                value={incomeInput}
                onChange={(e) => setIncomeInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') saveIncome(); if (e.key === 'Escape') setEditingIncome(false); }}
                placeholder="Aylık net gelir"
                autoFocus
                className="flex-1 bg-white dark:bg-zinc-900 border border-neutral-300 dark:border-zinc-800 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 text-neutral-900 dark:text-white"
              />
              <button onClick={saveIncome} className="px-2 py-1 bg-primary-600 text-white text-xs rounded">Tamam</button>
            </div>
          ) : (
            <div className={`text-2xl font-bold mt-1 ${isOverThreshold ? 'text-error-700 dark:text-error-400' : 'text-neutral-700 dark:text-neutral-200'}`}>
              {monthlyIncome > 0 ? `%${burdenRatio.toFixed(1)}` : '—'}
            </div>
          )}
        </div>

        <div className="bg-neutral-50 dark:bg-zinc-900/50 border border-neutral-200 dark:border-zinc-800 rounded-xl p-4">
          <div className="text-xs font-medium text-neutral-600 dark:text-zinc-300">Toplam Kalan Ödeme</div>
          <div className="text-2xl font-bold text-neutral-800 dark:text-zinc-100 mt-1">
            {fmt(calculateTotalRemaining())}
          </div>
          <div className="text-xs text-neutral-400 dark:text-zinc-500 mt-1">Gelecek ödemelerin net toplamı</div>
        </div>
      </div>

      {isOverThreshold && monthlyIncome > 0 && (
        <div className="bg-error-50 dark:bg-error-900/10 border border-error-300 dark:border-error-800 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-error-100 dark:bg-error-900/40 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg className="w-4 h-4 text-error-600 dark:text-error-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.728-.833-2.498 0L4.316 15.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div>
              <div className="text-sm font-semibold text-error-800 dark:text-error-200">Taksit Yükü Uyarısı</div>
              <div className="text-sm text-error-700 dark:text-zinc-300 mt-1">
                Bu ayki taksit ödemelerin ({fmt(totalMonthlyLoad)}) gelirinizin %{burdenRatio.toFixed(0)}'ine ulaştı.
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'installments' && showForm && (
        <div className="bg-white dark:bg-zinc-900/50 border border-neutral-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm">
          <h2 className="text-base font-semibold text-neutral-900 dark:text-white mb-4">Yeni Taksit</h2>
          <InstallmentForm 
            accounts={accounts}
            onSubmit={handleCreate} 
            onCancel={() => setShowForm(false)} 
          />
        </div>
      )}

      {active.length === 0 && !showForm ? (
        <div className="text-center py-16 bg-white dark:bg-zinc-900/50 rounded-xl border border-dashed border-neutral-300 dark:border-zinc-800">
          <div className="text-neutral-400 text-4xl mb-3">📋</div>
          <p className="text-neutral-600 dark:text-zinc-300 font-medium">Henüz aktif taksit yok</p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-4 px-5 py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
          >
            Taksit Ekle
          </button>
        </div>
      ) : (
        <div className={active.length < 3 ? "flex flex-wrap gap-4" : "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"}>
          {active.map((inst) => (
            <div key={inst.id} className={active.length < 3 ? "w-full max-w-md" : ""}>
              <InstallmentCard
                installment={inst}
                accounts={accounts}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
              />
            </div>
          ))}
        </div>
      )}
        </>
      )}

      {activeTab === 'installments' && active.length > 0 && (
        <div className="bg-white dark:bg-zinc-900/50 border border-neutral-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm">
          <PaymentCalendar 
            installments={installments} 
            accounts={accounts}
            onUpdateInstallment={handleUpdate}
          />
        </div>
      )}

      {activeTab === 'recurring' && (
        <div className="bg-white dark:bg-zinc-900/50 border border-neutral-200 dark:border-zinc-800 rounded-3xl p-8 shadow-sm">
          <RecurringFlowPanel />
        </div>
      )}
    </div>
  );
}
