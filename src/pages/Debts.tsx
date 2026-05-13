import { useState, useEffect } from 'react';
import { CURRENCY_SYMBOL } from '@/constants';
import { useAuth } from '@/hooks/useAuth';
import { dataSourceAdapter } from '@/services/supabase/adapter';
import DebtCard from '@/components/debts/DebtCard';
import DebtForm from '@/components/debts/DebtForm';
import type { Debt } from '@/types';
const RISK_THRESHOLD = 35;

export default function Debts(): JSX.Element {
  const { user } = useAuth();
  const [debts, setDebts] = useState<Debt[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [monthlyIncome, setMonthlyIncome] = useState<number>(0);
  const [editingIncome, setEditingIncome] = useState(false);
  const [incomeInput, setIncomeInput] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | Debt['status']>('all');

  useEffect(() => {
    if (user?.id) {
      loadData(user.id);
    }
  }, [user?.id]);

  const loadData = async (userId: string) => {
    try {
      setLoading(true);
      const [data, accountsData, flows] = await Promise.all([
        dataSourceAdapter.debt.getByUserId(userId),
        dataSourceAdapter.account.getByUserId(userId),
        dataSourceAdapter.recurringFlow.getByUserId(userId),
      ]);
      setDebts(data);
      setAccounts(accountsData);

      // TASK 47.27: Smart Income Sync for Debt Ratio
      const now = new Date();
      const startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endDate = new Date(now.getFullYear(), now.getMonth(), 0);
      
      const txArrays = await Promise.all(
        accountsData.map((a) => dataSourceAdapter.transaction.getByDateRange(a.id, startDate, endDate))
      );
      
      const actualIncome = txArrays.flat().filter((t) => t.type === 'gelir').reduce((s, t) => s + t.amount, 0);
      const fixedIncome = flows.filter(f => f.type === 'gelir' && f.isActive).reduce((s, f) => s + f.amount, 0);
      
      const finalIncome = Math.max(actualIncome, fixedIncome);
      if (finalIncome > 0) setMonthlyIncome(finalIncome);
    } catch (err) {
      console.error('Borçlar yüklenemedi:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (data: Omit<Debt, 'id' | 'createdAt'>) => {
    if (!user?.id) return;
    const payload = { ...data, userId: user.id };
    const created = await dataSourceAdapter.debt.create(payload);
    setDebts((prev) => [created, ...prev]);
    setShowForm(false);
  };

  const handleUpdate = async (id: string, updates: Partial<Debt>) => {
    const updated = await dataSourceAdapter.debt.update(id, updates);
    setDebts((prev) => prev.map((d) => (d.id === id ? updated : d)));
  };

  const handleDelete = async (id: string) => {
    await dataSourceAdapter.debt.delete(id);
    setDebts((prev) => prev.filter((d) => d.id !== id));
  };

  const handlePay = async (debtId: string, amount: number, accountId: string) => {
    const debt = debts.find(d => d.id === debtId);
    const account = accounts.find(a => a.id === accountId);
    if (!debt || !account) return;

    try {
      setLoading(true); // Re-use loading or add isSyncing
      
      // 1. Update Account Balance
      const newBalance = account.balance - amount;
      await dataSourceAdapter.account.update(accountId, { balance: newBalance });
      setAccounts(prev => prev.map(a => a.id === accountId ? { ...a, balance: newBalance } : a));

      // 2. Update Debt
      const newRemaining = Math.max(0, debt.remainingAmount - amount);
      const newStatus = newRemaining <= 0 ? 'paid_off' : debt.status;
      const updatedDebt = await dataSourceAdapter.debt.update(debtId, {
        remainingAmount: newRemaining,
        status: newStatus
      });
      setDebts(prev => prev.map(d => d.id === debtId ? updatedDebt : d));

      // 3. Create Transaction with [DEBT_PAYMENT] tag
      await dataSourceAdapter.transaction.create({
        accountId,
        amount,
        type: 'gider',
        category: 'Borç Ödemesi',
        description: `[DEBT_PAYMENT] [DEBT_ID:${debt.id}] ${debt.creditorName} Ödemesi`,
        date: new Date(),
        userId: user!.id
      });

      console.log(`[DEBT_PAYMENT_SUCCESS] Borç ödemesi tamamlandı: ${amount} TL -> ${debt.creditorName}`);
    } catch (err) {
      console.error('Borç ödemesi sırasında hata:', err);
      alert('Ödeme gerçekleştirilemedi.');
    } finally {
      setLoading(false);
    }
  };

  const saveIncome = () => {
    const val = parseFloat(incomeInput.replace(',', '.'));
    if (!isNaN(val) && val > 0) setMonthlyIncome(val);
    setEditingIncome(false);
  };

  const activeDebts = debts.filter((d) => d.status === 'active');
  const totalRemaining = activeDebts.reduce((s, d) => s + d.remainingAmount, 0);
  const totalMonthlyPayments = activeDebts.reduce((s, d) => s + d.monthlyPayment, 0);
  const debtToIncomeRatio = monthlyIncome > 0 ? (totalMonthlyPayments / monthlyIncome) * 100 : 0;
  const isHighRisk = debtToIncomeRatio > RISK_THRESHOLD;

  const filtered = debts.filter((d) => statusFilter === 'all' || d.status === statusFilter);

  const fmt = (n: number) =>
    `${CURRENCY_SYMBOL}${n.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
      <div className="h-10 w-48 bg-muted rounded" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-muted rounded-xl" />)}
      </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Borç Merkezi</h1>
          <p className="text-muted-foreground mt-1 text-sm">{activeDebts.length} aktif borç</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-colors shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Borç Ekle
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4">
          <div className="text-xs font-medium text-destructive">Toplam Aktif Borç</div>
          <div className="text-2xl font-bold text-destructive mt-1">{fmt(totalRemaining)}</div>
          <div className="text-xs text-destructive/60 mt-1">{activeDebts.length} alacaklı</div>
        </div>

        <div className={`rounded-xl border p-4 ${isHighRisk ? 'bg-destructive/10 border-destructive/20' : 'bg-success/10 border-success/20'}`}>
          <div className="flex items-center justify-between">
            <div className={`text-xs font-medium ${isHighRisk ? 'text-destructive' : 'text-success'}`}>
              Aylık Taksit Yükü
            </div>
            <button
              onClick={() => { setIncomeInput(String(monthlyIncome || '')); setEditingIncome(true); }}
              className="text-xs text-primary hover:underline"
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
                className="flex-1 border border-border bg-background rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              <button onClick={saveIncome} className="px-2 py-1 bg-primary text-primary-foreground text-xs rounded">Tamam</button>
            </div>
          ) : (
            <div className={`text-2xl font-bold mt-1 ${isHighRisk ? 'text-destructive' : 'text-success'}`}>
              {monthlyIncome > 0 ? `%${debtToIncomeRatio.toFixed(1)}` : '—'}
            </div>
          )}
          <div className={`text-xs mt-1 ${isHighRisk ? 'text-destructive/80' : 'text-success/80'}`}>
            {monthlyIncome > 0
              ? isHighRisk ? 'Taksit Yükü Kritik (%35+)' : 'Taksit Yükü Güvenli (<%35)'
              : 'Oran için gelir girin'}
          </div>
        </div>

        <div className="bg-muted/50 border border-border rounded-xl p-4">
          <div className="text-xs font-medium text-muted-foreground">Aylık Toplam Ödeme</div>
          <div className="text-2xl font-bold text-foreground mt-1">{fmt(totalMonthlyPayments)}</div>
          <div className="text-xs text-muted-foreground/60 mt-1">Tüm aktif borçlar</div>
        </div>
      </div>

      {isHighRisk && monthlyIncome > 0 && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-destructive/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg className="w-4 h-4 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.728-.833-2.498 0L4.316 15.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div>
              <div className="text-sm font-semibold text-destructive">Borç/Gelir Riski Tespit Edildi</div>
              <div className="text-sm text-destructive/80 mt-1">
                Aylık borç ödemelerin ({fmt(totalMonthlyPayments)}) gelirinizin %{debtToIncomeRatio.toFixed(0)}'ine ulaştı.
                Logic Spec'e göre güvenli üst sınır %{RISK_THRESHOLD}.
              </div>
              <div className="text-sm text-destructive/60 mt-2">
                <span className="font-medium">Koç Önerisi:</span> En yüksek faizli borcunu önce kapatmayı hedefle.
                Yeni borç almadan önce gelir artışı planlaması yap.
              </div>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
          <h2 className="text-base font-semibold text-foreground mb-4">Yeni Borç</h2>
          <DebtForm onSubmit={handleCreate} onCancel={() => setShowForm(false)} />
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        {(['all', 'active', 'overdue', 'paid_off'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              statusFilter === s
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {s === 'all' ? 'Tümü' : s === 'active' ? 'Aktif' : s === 'overdue' ? 'Gecikmiş' : 'Kapandı'}
            <span className="ml-1.5 text-xs opacity-70">
              ({s === 'all' ? debts.length : debts.filter((d) => d.status === s).length})
            </span>
          </button>
        ))}
      </div>

      {filtered.length === 0 && !showForm ? (
        <div className="text-center py-16 bg-card rounded-xl border border-dashed border-border">
          <div className="text-muted-foreground text-4xl mb-3">💳</div>
          <p className="text-foreground font-medium">Henüz borç kaydı yok</p>
          <p className="text-muted-foreground text-sm mt-1">Kredi, kişisel borç veya tüketici kredisi ekleyebilirsin</p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-4 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-colors"
          >
            Borç Ekle
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((debt) => (
            <DebtCard
              key={debt.id}
              debt={debt}
              accounts={accounts}
              monthlyIncome={monthlyIncome}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
              onPay={handlePay}
            />
          ))}
        </div>
      )}
    </div>
  );
}
