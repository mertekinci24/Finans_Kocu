import { useState, useEffect } from 'react';
import { CURRENCY_SYMBOL } from '@/constants';
import { useAuth } from '@/hooks/useAuth';
import { dataSourceAdapter } from '@/services/supabase/adapter';
import InstallmentCard from '@/components/installments/InstallmentCard';
import InstallmentForm from '@/components/installments/InstallmentForm';
import PaymentCalendar from '@/components/installments/PaymentCalendar';
import type { Installment } from '@/types';

const WARNING_THRESHOLD = 30;

export default function Installments(): JSX.Element {
  const { user } = useAuth();
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [monthlyIncome, setMonthlyIncome] = useState<number>(0);
  const [editingIncome, setEditingIncome] = useState(false);
  const [incomeInput, setIncomeInput] = useState('');

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900">Taksit Merkezi</h1>
          <p className="text-neutral-600 mt-1 text-sm">{active.length} aktif taksit</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Taksit Ekle
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className={`rounded-xl border p-4 ${isOverThreshold ? 'bg-error-50 border-error-300' : 'bg-primary-50 border-primary-200'}`}>
          <div className={`text-xs font-medium ${isOverThreshold ? 'text-error-700' : 'text-primary-700'}`}>Aylık Taksit Yükü</div>
          <div className={`text-2xl font-bold mt-1 ${isOverThreshold ? 'text-error-700' : 'text-primary-700'}`}>
            {fmt(totalMonthlyLoad)}
          </div>
        </div>

        <div className={`rounded-xl border p-4 ${isOverThreshold ? 'bg-error-50 border-error-300' : 'bg-neutral-50 border-neutral-200'}`}>
          <div className="flex items-center justify-between">
            <div className={`text-xs font-medium ${isOverThreshold ? 'text-error-700' : 'text-neutral-600'}`}>
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
                className="flex-1 border border-neutral-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
              />
              <button onClick={saveIncome} className="px-2 py-1 bg-primary-600 text-white text-xs rounded">Tamam</button>
            </div>
          ) : (
            <div className={`text-2xl font-bold mt-1 ${isOverThreshold ? 'text-error-700' : 'text-neutral-700'}`}>
              {monthlyIncome > 0 ? `%${burdenRatio.toFixed(1)}` : '—'}
            </div>
          )}
          {monthlyIncome === 0 && !editingIncome && (
            <div className="text-xs text-neutral-400 mt-1">Oran hesabı için gelirinizi girin</div>
          )}
        </div>

        <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-4">
          <div className="text-xs font-medium text-neutral-600">Toplam Kalan Ödeme</div>
          <div className="text-2xl font-bold text-neutral-800 mt-1">
            {fmt(active.reduce((s, i) => s + i.monthlyPayment * i.remainingMonths, 0))}
          </div>
          <div className="text-xs text-neutral-400 mt-1">Tüm aktif taksitler</div>
        </div>
      </div>

      {isOverThreshold && monthlyIncome > 0 && (
        <div className="bg-error-50 border border-error-300 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-error-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg className="w-4 h-4 text-error-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.728-.833-2.498 0L4.316 15.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div>
              <div className="text-sm font-semibold text-error-800">Taksit Yükü Uyarısı</div>
              <div className="text-sm text-error-700 mt-1">
                Bu ayki taksit ödemelerin ({fmt(totalMonthlyLoad)}) gelirinizin %{burdenRatio.toFixed(0)}'ine ulaştı.
                Master Plan sınırı %{WARNING_THRESHOLD} olarak belirlenmiş.
              </div>
              <div className="text-sm text-error-600 mt-2">
                <span className="font-medium">Öneri:</span> Bu ay yeni taksite girmek yerine, en az taksit kalan ödemeyi bitirerek önümüzdeki aya alan açabilirsin.
              </div>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-sm">
          <h2 className="text-base font-semibold text-neutral-900 mb-4">Yeni Taksit</h2>
          <InstallmentForm onSubmit={handleCreate} onCancel={() => setShowForm(false)} />
        </div>
      )}

      {active.length === 0 && !showForm ? (
        <div className="text-center py-16 bg-white rounded-xl border border-dashed border-neutral-300">
          <div className="text-neutral-400 text-4xl mb-3">📋</div>
          <p className="text-neutral-600 font-medium">Henüz aktif taksit yok</p>
          <p className="text-neutral-400 text-sm mt-1">Kredi kartı taksitin varsa buraya ekle</p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-4 px-5 py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
          >
            Taksit Ekle
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {active.map((inst) => (
            <InstallmentCard
              key={inst.id}
              installment={inst}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {active.length > 0 && (
        <div className="bg-white border border-neutral-200 rounded-xl p-5">
          <PaymentCalendar installments={installments} />
        </div>
      )}
    </div>
  );
}
