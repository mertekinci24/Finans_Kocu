import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/services/supabase/adapter';
import { dataSourceAdapter } from '@/services/supabase/adapter';
import { CURRENCY_SYMBOL } from '@/constants';
import { useAuth } from '@/hooks/useAuth';
import type { Transaction, Account, Category } from '@/types';

const RECURRING_OPTIONS = [
  { value: 'none',    label: 'Tekrar Yok' },
  { value: 'daily',   label: 'Her Gün' },
  { value: 'weekly',  label: 'Her Hafta' },
  { value: 'monthly', label: 'Her Ay' },
  { value: 'yearly',  label: 'Her Yıl' },
] as const;

interface TransactionFormProps {
  accounts: Account[];
  transaction?: Transaction;
  onSave: (tx: Transaction) => void;
  onClose: () => void;
}

export default function TransactionForm({
  accounts,
  transaction,
  onSave,
  onClose,
}: TransactionFormProps): JSX.Element {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [saving, setSaving] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  const [form, setForm] = useState({
    accountId: transaction?.accountId ?? accounts[0]?.id ?? '',
    amount: transaction?.amount?.toString() ?? '',
    description: transaction?.description ?? '',
    category: transaction?.category ?? 'Diğer',
    date: transaction?.date
      ? new Date(transaction.date).toISOString().split('T')[0]
      : today,
    type: transaction?.type ?? ('gider' as 'gelir' | 'gider'),
    note: transaction?.note ?? '',
    recurring: (transaction?.recurring ?? 'none') as 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly',
  });

  useEffect(() => {
    if (user?.id) loadCategories(user.id);
  }, [user?.id]);

  const loadCategories = async (userId: string) => {
    const { data } = await supabase
      .from('categories')
      .select('*')
      .eq('user_id', userId)
      .order('name');
    if (data) {
      setCategories(
        data.map((c: any) => ({
          id: c.id,
          userId: c.user_id,
          name: c.name,
          color: c.color,
          icon: c.icon,
          monthlyBudget: c.monthly_budget,
          type: c.type,
          isDefault: c.is_default,
          createdAt: new Date(c.created_at),
        }))
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(form.amount);
    if (!form.accountId || isNaN(amount) || amount <= 0 || !form.description.trim()) return;

    setSaving(true);
    try {
      const payload = {
        accountId: form.accountId,
        amount,
        description: form.description,
        category: form.category,
        date: new Date(form.date),
        type: form.type,
        note: form.note || undefined,
        recurring: form.recurring,
      };

      let saved: Transaction;
      if (transaction?.id) {
        saved = await dataSourceAdapter.transaction.update(transaction.id, payload);
      } else {
        saved = await dataSourceAdapter.transaction.create(payload);
      }
      onSave(saved);
    } catch (err) {
      console.error('İşlem kaydedilemedi:', err);
    } finally {
      setSaving(false);
    }
  };

  const relevantCategories = categories.filter(
    (c) => c.type === form.type || c.type === 'ikisi_de'
  );

  const selectedCategory = categories.find((c) => c.name === form.category);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-lg"
        >
          <form onSubmit={handleSubmit}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100">
              <h3 className="font-semibold text-neutral-900">
                {transaction ? 'İşlemi Düzenle' : 'Yeni İşlem'}
              </h3>
              <button
                type="button"
                onClick={onClose}
                className="p-2 hover:bg-neutral-100 rounded-lg text-neutral-500 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex gap-1 p-1 bg-neutral-100 rounded-xl">
                {(['gider', 'gelir'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, type: t }))}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                      form.type === t
                        ? t === 'gider'
                          ? 'bg-error-600 text-white shadow-sm'
                          : 'bg-success-600 text-white shadow-sm'
                        : 'text-neutral-600 hover:text-neutral-800'
                    }`}
                  >
                    {t === 'gider' ? 'Gider' : 'Gelir'}
                  </button>
                ))}
              </div>

              <div>
                <label className="text-xs font-medium text-neutral-600 block mb-1">Tutar</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 font-medium">{CURRENCY_SYMBOL}</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.amount}
                    onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                    placeholder="0,00"
                    required
                    className="w-full border border-neutral-200 rounded-xl pl-8 pr-4 py-2.5 text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-primary-400"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-neutral-600 block mb-1">Açıklama</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="İşlem açıklaması"
                  required
                  className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-neutral-600 block mb-1">Tarih</label>
                  <input
                    type="date"
                    value={form.date}
                    max={today}
                    onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                    className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-neutral-600 block mb-1">Hesap</label>
                  <select
                    value={form.accountId}
                    onChange={(e) => setForm((f) => ({ ...f, accountId: e.target.value }))}
                    className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                  >
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>{acc.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-neutral-600 block mb-1">Kategori</label>
                <div className="relative">
                  {selectedCategory && (
                    <span
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full"
                      style={{ backgroundColor: selectedCategory.color }}
                    />
                  )}
                  <select
                    value={form.category}
                    onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                    className={`w-full border border-neutral-200 rounded-lg py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 ${selectedCategory ? 'pl-8 pr-3' : 'px-3'}`}
                  >
                    {relevantCategories.length > 0
                      ? relevantCategories.map((c) => (
                          <option key={c.id} value={c.name}>{c.icon} {c.name}</option>
                        ))
                      : <option value="Diğer">📦 Diğer</option>
                    }
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-neutral-600 block mb-1">Tekrarlama</label>
                <div className="flex gap-1 flex-wrap">
                  {RECURRING_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, recurring: opt.value }))}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                        form.recurring === opt.value
                          ? 'bg-primary-100 text-primary-700 border border-primary-200'
                          : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-neutral-600 block mb-1">Not (isteğe bağlı)</label>
                <textarea
                  value={form.note}
                  onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                  placeholder="Bu işlem hakkında notlar..."
                  rows={2}
                  className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t border-neutral-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm text-neutral-600 hover:text-neutral-800 transition-colors"
              >
                İptal
              </button>
              <button
                type="submit"
                disabled={saving || !form.amount || !form.description.trim()}
                className={`px-5 py-2 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2 ${
                  form.type === 'gider' ? 'bg-error-600 hover:bg-error-700' : 'bg-success-600 hover:bg-success-700'
                }`}
              >
                {saving && (
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                )}
                {transaction ? 'Güncelle' : 'Kaydet'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
