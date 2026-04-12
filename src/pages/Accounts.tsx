import { useState, useEffect } from 'react';
import { CURRENCY_SYMBOL } from '@/constants';
import { dataSourceAdapter } from '@/services/supabase/adapter';
import AccountCard from '@/components/accounts/AccountCard';
import AccountForm from '@/components/accounts/AccountForm';
import type { Account } from '@/types';

const TEMP_USER_ID = 'temp-user-id';

export default function Accounts(): JSX.Element {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      setLoading(true);
      const data = await dataSourceAdapter.account.getByUserId(TEMP_USER_ID);
      setAccounts(data);
    } catch (err) {
      console.error('Hesaplar yüklenemedi:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (data: Omit<Account, 'id' | 'createdAt' | 'updatedAt' | 'isActive'>) => {
    const created = await dataSourceAdapter.account.create({ ...data, isActive: true });
    setAccounts((prev) => [created, ...prev]);
    setShowForm(false);
  };

  const handleUpdate = async (id: string, updates: Partial<Account>) => {
    const updated = await dataSourceAdapter.account.update(id, updates);
    setAccounts((prev) => prev.map((a) => (a.id === id ? updated : a)));
  };

  const handleDelete = async (id: string) => {
    await dataSourceAdapter.account.delete(id);
    setAccounts((prev) => prev.filter((a) => a.id !== id));
  };

  const totalBalance = accounts
    .filter((a) => a.type !== 'kredi_kartı')
    .reduce((sum, a) => sum + a.balance, 0);

  const totalDebt = accounts
    .filter((a) => a.type === 'kredi_kartı')
    .reduce((sum, a) => sum + a.balance, 0);

  const formatCurrency = (amount: number) =>
    `${CURRENCY_SYMBOL}${amount.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 w-48 bg-neutral-200 rounded" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-36 bg-neutral-200 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900">Hesaplarım</h1>
          <p className="text-neutral-600 mt-1 text-sm">
            {accounts.length} hesap · Tıklayarak düzenleyebilirsin
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Hesap Ekle
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-primary-50 border border-primary-200 rounded-xl p-4">
          <div className="text-sm text-primary-700 font-medium">Toplam Varlık</div>
          <div className="text-3xl font-bold text-primary-700 mt-1">{formatCurrency(totalBalance)}</div>
          <div className="text-xs text-primary-500 mt-1">Nakit + Banka hesapları</div>
        </div>
        <div className="bg-error-50 border border-error-200 rounded-xl p-4">
          <div className="text-sm text-error-700 font-medium">Kredi Kartı Borcu</div>
          <div className="text-3xl font-bold text-error-700 mt-1">{formatCurrency(totalDebt)}</div>
          <div className="text-xs text-error-500 mt-1">Tüm kredi kartları toplamı</div>
        </div>
      </div>

      {showForm && (
        <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-sm">
          <h2 className="text-base font-semibold text-neutral-900 mb-4">Yeni Hesap</h2>
          <AccountForm onSubmit={handleCreate} onCancel={() => setShowForm(false)} />
        </div>
      )}

      {accounts.length === 0 && !showForm ? (
        <div className="text-center py-16 bg-white rounded-xl border border-dashed border-neutral-300">
          <div className="text-neutral-400 text-4xl mb-3">🏦</div>
          <p className="text-neutral-600 font-medium">Henüz hesap yok</p>
          <p className="text-neutral-400 text-sm mt-1">İlk hesabını ekleyerek başla</p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-4 px-5 py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
          >
            Hesap Ekle
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {accounts.map((account) => (
            <AccountCard
              key={account.id}
              account={account}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
