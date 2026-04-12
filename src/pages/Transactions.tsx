import { useState, useEffect } from 'react';
import { CURRENCY_SYMBOL } from '@/constants';
import { dataSourceAdapter } from '@/services/supabase/adapter';
import QuickInput from '@/components/transactions/QuickInput';
import TransactionRow from '@/components/transactions/TransactionRow';
import type { Transaction, Account } from '@/types';

const TEMP_USER_ID = 'temp-user-id';

type FilterType = 'all' | 'gelir' | 'gider';

export default function Transactions(): JSX.Element {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [currentMonth, setCurrentMonth] = useState(new Date());

  useEffect(() => {
    loadData();
  }, [currentMonth]);

  const loadData = async () => {
    try {
      setLoading(true);
      const accs = await dataSourceAdapter.account.getByUserId(TEMP_USER_ID);
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
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setTransactions(all);
    } catch (err) {
      console.error('İşlemler yüklenemedi:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (data: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) => {
    const created = await dataSourceAdapter.transaction.create(data);
    setTransactions((prev) => [created, ...prev]);
  };

  const handleUpdate = async (id: string, updates: Partial<Transaction>) => {
    const updated = await dataSourceAdapter.transaction.update(id, updates);
    setTransactions((prev) => prev.map((t) => (t.id === id ? updated : t)));
  };

  const handleDelete = async (id: string) => {
    await dataSourceAdapter.transaction.delete(id);
    setTransactions((prev) => prev.filter((t) => t.id !== id));
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

  const filtered = transactions.filter((t) => {
    if (filter !== 'all' && t.type !== filter) return false;
    if (categoryFilter && t.category !== categoryFilter) return false;
    return true;
  });

  const totalIncome = transactions.filter((t) => t.type === 'gelir').reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions.filter((t) => t.type === 'gider').reduce((s, t) => s + t.amount, 0);
  const net = totalIncome - totalExpense;

  const formatCurrency = (amount: number) =>
    `${CURRENCY_SYMBOL}${amount.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900">İşlemler</h1>
          <p className="text-neutral-600 mt-1 text-sm">Tıklayarak inline düzenleyebilirsin</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={prevMonth}
            className="p-2 hover:bg-neutral-100 rounded-lg transition-colors text-neutral-600"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="text-sm font-medium text-neutral-700 w-36 text-center">
            {formatMonth(currentMonth)}
          </span>
          <button
            onClick={nextMonth}
            className="p-2 hover:bg-neutral-100 rounded-lg transition-colors text-neutral-600"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-success-50 border border-success-200 rounded-xl p-4">
          <div className="text-xs text-success-700 font-medium">Toplam Gelir</div>
          <div className="text-xl font-bold text-success-700 mt-1">{formatCurrency(totalIncome)}</div>
        </div>
        <div className="bg-error-50 border border-error-200 rounded-xl p-4">
          <div className="text-xs text-error-700 font-medium">Toplam Gider</div>
          <div className="text-xl font-bold text-error-700 mt-1">{formatCurrency(totalExpense)}</div>
        </div>
        <div className={`${net >= 0 ? 'bg-primary-50 border-primary-200' : 'bg-warning-50 border-warning-200'} border rounded-xl p-4`}>
          <div className={`text-xs font-medium ${net >= 0 ? 'text-primary-700' : 'text-warning-700'}`}>Net</div>
          <div className={`text-xl font-bold mt-1 ${net >= 0 ? 'text-primary-700' : 'text-warning-700'}`}>
            {net >= 0 ? '+' : ''}{formatCurrency(net)}
          </div>
        </div>
      </div>

      <QuickInput accounts={accounts} recentTransactions={transactions} onSave={handleSave} />

      <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
        <div className="flex items-center gap-3 p-4 border-b border-neutral-100 flex-wrap">
          <div className="flex gap-1">
            {(['all', 'gelir', 'gider'] as FilterType[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  filter === f
                    ? 'bg-primary-600 text-white'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                }`}
              >
                {f === 'all' ? 'Tümü' : f === 'gelir' ? 'Gelirler' : 'Giderler'}
              </button>
            ))}
          </div>

          {categories.length > 0 && (
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="border border-neutral-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary-400 text-neutral-600"
            >
              <option value="">Tüm kategoriler</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          )}

          <span className="ml-auto text-xs text-neutral-400">{filtered.length} işlem</span>
        </div>

        {loading ? (
          <div className="space-y-2 p-4 animate-pulse">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-neutral-100 rounded-lg" />
            ))}
          </div>
        ) : filtered.length > 0 ? (
          <div className="divide-y divide-neutral-50 p-2 space-y-1">
            {filtered.map((tx) => (
              <TransactionRow
                key={tx.id}
                transaction={tx}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-neutral-500">
            <p className="text-sm">Bu ay için işlem yok</p>
            <p className="text-xs text-neutral-400 mt-1">Yukarıdan hızlı giriş yapabilirsin</p>
          </div>
        )}
      </div>
    </div>
  );
}
