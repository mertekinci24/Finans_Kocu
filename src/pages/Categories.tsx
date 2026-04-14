import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { dataSourceAdapter } from '@/services/supabase/adapter';
import { CURRENCY_SYMBOL, DEFAULT_CATEGORIES } from '@/constants';
import type { Category, Transaction } from '@/types';
import { supabase } from '@/services/supabase/adapter';

const EMOJI_OPTIONS = ['💰','💻','🍔','🚗','💊','📚','⚡','🎬','👗','🏠','📱','📦','✈️','🏋️','🎵','🛒','💳','🏦','🎁','☕'];

interface CategoryWithSpend extends Category {
  currentSpend: number;
  budgetUsedPct: number;
}

type FilterType = 'all' | 'gelir' | 'gider';

export default function Categories(): JSX.Element {
  const { user } = useAuth();
  const [categories, setCategories] = useState<CategoryWithSpend[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>('all');

  const [form, setForm] = useState({
    name: '',
    color: '#0284c7',
    icon: '📦',
    monthly_budget: '',
    type: 'gider' as 'gelir' | 'gider' | 'ikisi_de',
  });

  useEffect(() => {
    if (user?.id) loadCategories(user.id);
  }, [user?.id]);

  const loadCategories = async (userId: string) => {
    try {
      setLoading(true);
      const { data: cats } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      const accs = await dataSourceAdapter.account.getByUserId(userId);
      const allTx: Transaction[] = [];
      const now = new Date();
      const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      for (const acc of accs) {
        const txs = await dataSourceAdapter.transaction.getByDateRange(acc.id, startDate, endDate);
        allTx.push(...txs);
      }

      const spendByCategory: Record<string, number> = {};
      allTx.forEach((tx) => {
        if (tx.type === 'gider') {
          const key = tx.category.toLowerCase();
          spendByCategory[key] = (spendByCategory[key] ?? 0) + tx.amount;
        }
      });

      const catList = (cats ?? []).map((c: Record<string, unknown>) => {
        const key = c.name.toLowerCase();
        const spend = spendByCategory[key] ?? 0;
        const budget = c.monthly_budget ?? 0;
        return {
          id: c.id,
          userId: c.user_id,
          name: c.name,
          color: c.color,
          icon: c.icon,
          monthlyBudget: c.monthly_budget ?? undefined,
          type: c.type,
          isDefault: c.is_default,
          createdAt: new Date(c.created_at),
          currentSpend: spend,
          budgetUsedPct: budget > 0 ? Math.min(100, (spend / budget) * 100) : 0,
        } as CategoryWithSpend;
      });

      setCategories(catList);

      if (catList.length === 0) {
        await seedDefaults(userId);
        await loadCategories(userId);
        return;
      }
    } catch (err) {
      console.error('Kategoriler yüklenemedi:', err);
    } finally {
      setLoading(false);
    }
  };

  const seedDefaults = async (userId: string) => {
    const rows = DEFAULT_CATEGORIES.map((c) => ({
      user_id: userId,
      name: c.name,
      color: c.color,
      icon: c.icon,
      type: c.type,
      is_default: true,
    }));
    await supabase.from('categories').insert(rows);
  };

  const handleSubmit = async () => {
    if (!user?.id || !form.name.trim()) return;
    try {
      if (editingId) {
        await supabase
          .from('categories')
          .update({
            name: form.name,
            color: form.color,
            icon: form.icon,
            monthly_budget: form.monthly_budget ? parseFloat(form.monthly_budget) : null,
            type: form.type,
          })
          .eq('id', editingId);
      } else {
        await supabase.from('categories').insert({
          user_id: user.id,
          name: form.name,
          color: form.color,
          icon: form.icon,
          monthly_budget: form.monthly_budget ? parseFloat(form.monthly_budget) : null,
          type: form.type,
          is_default: false,
        });
      }
      setShowForm(false);
      setEditingId(null);
      resetForm();
      await loadCategories(user.id);
    } catch (err) {
      console.error('Kategori kaydedilemedi:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!user?.id) return;
    await supabase.from('categories').delete().eq('id', id);
    setCategories((prev) => prev.filter((c) => c.id !== id));
  };

  const openEdit = (cat: CategoryWithSpend) => {
    setForm({
      name: cat.name,
      color: cat.color,
      icon: cat.icon ?? '📦',
      monthly_budget: cat.monthlyBudget?.toString() ?? '',
      type: cat.type,
    });
    setEditingId(cat.id);
    setShowForm(true);
  };

  const resetForm = () => {
    setForm({ name: '', color: '#0284c7', icon: '📦', monthly_budget: '', type: 'gider' });
  };

  const filtered = categories.filter(
    (c) => filter === 'all' || c.type === filter || c.type === 'ikisi_de'
  );

  const fmt = (n: number) =>
    `${CURRENCY_SYMBOL}${n.toLocaleString('tr-TR', { minimumFractionDigits: 0 })}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900">Kategoriler</h1>
          <p className="text-sm text-neutral-500 mt-1">Harcama kategorilerini yönet ve bütçe limiti ata</p>
        </div>
        <button
          onClick={() => { resetForm(); setEditingId(null); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Yeni Kategori
        </button>
      </div>

      <div className="flex gap-2">
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
            {f === 'all' ? 'Tümü' : f === 'gelir' ? 'Gelir' : 'Gider'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
          {[...Array(6)].map((_, i) => <div key={i} className="h-28 bg-neutral-100 rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {filtered.map((cat, idx) => (
              <motion.div
                key={cat.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: idx * 0.03 }}
                className="bg-white border border-neutral-200 rounded-xl p-4 group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                      style={{ backgroundColor: cat.color + '20' }}
                    >
                      {cat.icon}
                    </span>
                    <div>
                      <div className="text-sm font-semibold text-neutral-900">{cat.name}</div>
                      <div className="text-xs text-neutral-400">
                        {cat.type === 'gelir' ? 'Gelir' : cat.type === 'gider' ? 'Gider' : 'Her ikisi'}
                        {cat.isDefault && <span className="ml-1 text-neutral-300">· Varsayılan</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => openEdit(cat)}
                      className="p-1.5 hover:bg-neutral-100 rounded-lg text-neutral-400 hover:text-neutral-700 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    {!cat.isDefault && (
                      <button
                        onClick={() => handleDelete(cat.id)}
                        className="p-1.5 hover:bg-error-50 rounded-lg text-neutral-400 hover:text-error-600 transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>

                {cat.monthlyBudget && cat.type === 'gider' ? (
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-neutral-500">{fmt(cat.currentSpend)}</span>
                      <span className={`font-medium ${cat.budgetUsedPct >= 90 ? 'text-error-600' : cat.budgetUsedPct >= 70 ? 'text-warning-600' : 'text-neutral-600'}`}>
                        {fmt(cat.monthlyBudget)} limit
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${cat.budgetUsedPct}%` }}
                        transition={{ duration: 0.6, delay: idx * 0.05 }}
                        className={`h-full rounded-full ${
                          cat.budgetUsedPct >= 90 ? 'bg-error-500' :
                          cat.budgetUsedPct >= 70 ? 'bg-warning-500' : 'bg-success-500'
                        }`}
                      />
                    </div>
                    <div className="text-xs text-neutral-400 mt-1">
                      %{cat.budgetUsedPct.toFixed(0)} kullanıldı
                    </div>
                  </div>
                ) : cat.currentSpend > 0 ? (
                  <div className="text-xs text-neutral-500">
                    Bu ay: <span className="font-medium text-error-600">{fmt(cat.currentSpend)}</span>
                  </div>
                ) : (
                  <div className="text-xs text-neutral-400">Bu ay harcama yok</div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100">
                <h3 className="font-semibold text-neutral-900">
                  {editingId ? 'Kategori Düzenle' : 'Yeni Kategori'}
                </h3>
                <button onClick={() => setShowForm(false)} className="p-2 hover:bg-neutral-100 rounded-lg text-neutral-500">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="text-xs font-medium text-neutral-600 block mb-1">Kategori Adı</label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                      placeholder="ör. Restoran"
                      className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-neutral-600 block mb-1">Renk</label>
                    <input
                      type="color"
                      value={form.color}
                      onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
                      className="w-10 h-9 rounded-lg border border-neutral-200 cursor-pointer p-0.5"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-neutral-600 block mb-2">İkon</label>
                  <div className="flex flex-wrap gap-2">
                    {EMOJI_OPTIONS.map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => setForm((f) => ({ ...f, icon: emoji }))}
                        className={`w-8 h-8 text-base rounded-lg transition-colors ${
                          form.icon === emoji ? 'bg-primary-100 ring-2 ring-primary-400' : 'hover:bg-neutral-100'
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-neutral-600 block mb-1">Tür</label>
                    <select
                      value={form.type}
                      onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as typeof f.type }))}
                      className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                    >
                      <option value="gider">Gider</option>
                      <option value="gelir">Gelir</option>
                      <option value="ikisi_de">Her ikisi</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-neutral-600 block mb-1">Aylık Bütçe (isteğe bağlı)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-neutral-400">₺</span>
                      <input
                        type="number"
                        value={form.monthly_budget}
                        onChange={(e) => setForm((f) => ({ ...f, monthly_budget: e.target.value }))}
                        placeholder="0"
                        className="w-full border border-neutral-200 rounded-lg pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 px-6 py-4 border-t border-neutral-100">
                <button
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 text-sm text-neutral-600 hover:text-neutral-800"
                >
                  İptal
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!form.name.trim()}
                  className="px-5 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
                >
                  {editingId ? 'Kaydet' : 'Ekle'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
