import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { dataSourceAdapter, supabase } from '@/services/supabase/adapter';
import { CURRENCY_SYMBOL } from '@/constants';
import { Repeat, Info, Pencil } from 'lucide-react';
import type { RecurringFlow, Category } from '@/types';

interface RecurringFlowPanelProps {
  isObserver?: boolean;
}

export default function RecurringFlowPanel({ isObserver = false }: RecurringFlowPanelProps): JSX.Element {
  const { user } = useAuth();
  const [flows, setFlows] = useState<RecurringFlow[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [type, setType] = useState<'gelir' | 'gider'>('gider');
  const [amount, setAmount] = useState('');
  const [dayOfMonth, setDayOfMonth] = useState<number>(1);
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user?.id) {
      loadFlows(user.id);
      loadCategories(user.id);
    }
  }, [user?.id]);

  const loadCategories = async (userId: string) => {
    const { data } = await supabase
      .from('categories')
      .select('*')
      .eq('user_id', userId);
    
    if (data) {
      // Deduplicate by name
      const uniqueMap = new Map();
      data.forEach((c: any) => {
        if (!uniqueMap.has(c.name)) {
          uniqueMap.set(c.name, {
            id: c.id,
            name: c.name,
            icon: c.icon,
            type: c.type,
            color: c.color
          });
        }
      });
      setCategories(Array.from(uniqueMap.values()));
    }
  };

  const loadFlows = async (userId: string) => {
    try {
      setLoading(true);
      const data = await dataSourceAdapter.recurringFlow.getByUserId(userId);
      setFlows(data);
    } catch (err) {
      console.error('Recurring flows load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || !amount || !description) return;

    setSubmitting(true);
    try {
      if (editingId) {
        const payload = {
          type,
          amount: parseFloat(amount.toString().replace(',', '.')),
          dayOfMonth,
          category: category || (type === 'gelir' ? 'Maaş' : 'Fatura'),
          description,
        };
        const updated = await dataSourceAdapter.recurringFlow.update(editingId, payload);
        setFlows(prev => prev.map(f => f.id === editingId ? updated : f).sort((a,b) => a.dayOfMonth - b.dayOfMonth));
      } else {
        const payload = {
          userId: user.id,
          type,
          amount: parseFloat(amount.toString().replace(',', '.')),
          dayOfMonth,
          category: category || (type === 'gelir' ? 'Maaş' : 'Fatura'),
          description,
          isFixed: true,
          isActive: true,
        };
        const created = await dataSourceAdapter.recurringFlow.create(payload);
        setFlows(prev => [...prev, created].sort((a,b) => a.dayOfMonth - b.dayOfMonth));
      }
      
      closeForm();
    } catch (err) {
      console.error('Submit flow error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setAmount('');
    setDescription('');
    setCategory('');
    setDayOfMonth(1);
  };

  const handleEdit = (flow: RecurringFlow) => {
    setEditingId(flow.id);
    setType(flow.type);
    setAmount(flow.amount.toString());
    setDayOfMonth(flow.dayOfMonth);
    setCategory(flow.category);
    setDescription(flow.description);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bu tanımı silmek istediğine emin misin?')) return;
    try {
      await dataSourceAdapter.recurringFlow.delete(id);
      setFlows(prev => prev.filter(f => f.id !== id));
    } catch (err) {
      console.error('Delete flow error:', err);
    }
  };

  const applyPreset = (preset: { type: 'gelir' | 'gider', desc: string, cat: string, day: number }) => {
    setType(preset.type);
    setDescription(preset.desc);
    setCategory(preset.cat);
    setDayOfMonth(preset.day);
    setShowForm(true);
  };

  if (loading) return <div className="p-8 text-center text-neutral-500 animate-pulse">Yükleniyor...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-neutral-900 dark:text-white uppercase tracking-tighter">Sabit Akış Planlama</h2>
          <p className="text-xs text-neutral-500 dark:text-zinc-500 mt-1 uppercase font-bold tracking-widest">
            {isObserver ? "Sabit akışlarınızın projeksiyon özeti" : "Geleceğinizi buradan inşa edin"}
          </p>
        </div>
        
        {isObserver ? (
          <button
            onClick={() => window.location.href = '/installments'}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-800 text-white rounded-lg text-xs font-bold hover:bg-zinc-700 transition-colors border border-zinc-700"
          >
            Yönetmek için Taksit Merkezi'ne git →
          </button>
        ) : (
          !showForm && (
            <div className="relative group">
              <button
                onClick={() => {
                  setType('gider');
                  setAmount('');
                  setDescription('');
                  setCategory('');
                  setDayOfMonth(1);
                  setEditingId(null);
                  setShowForm(true);
                }}
                className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-black hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 active:scale-95"
                title="Maaş, Kira gibi her ay tekrarlanan kesin kalemleri buradan girin."
              >
                <Repeat className="w-4 h-4" />
                + Sabit Akış Tanımla
              </button>
              <div className="absolute top-full right-0 mt-2 opacity-0 group-hover:opacity-100 transition-opacity z-10 w-48 pointer-events-none">
                 <div className="bg-zinc-800 text-white text-[10px] p-2 rounded-lg shadow-2xl border border-white/10">
                   Maaş, Kira gibi her ay tekrarlanan kesin kalemleri buradan girin.
                 </div>
              </div>
            </div>
          )
        )}
      </div>

      {!isObserver && (
        <>
          {showForm ? (
            <div className="bg-neutral-50 dark:bg-zinc-900/40 border border-neutral-200 dark:border-zinc-800 rounded-xl p-5 mb-6">
              <h3 className="text-sm font-black text-neutral-800 dark:text-neutral-200 mb-4 tracking-tight">
                {editingId ? `"${description || 'Akış'}" Planını Güncelle` : "Yeni Aylık Akış Tanımla"}
              </h3>
              <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-3 p-1 bg-neutral-100 dark:bg-zinc-800 rounded-lg">
                <button
                  type="button"
                  onClick={() => setType('gelir')}
                  className={`py-1.5 text-sm font-bold rounded-md transition-all ${type === 'gelir' ? 'bg-emerald-500 text-white shadow-sm' : 'text-neutral-500'}`}
                >
                  GELİR
                </button>
                <button
                  type="button"
                  onClick={() => setType('gider')}
                  className={`py-1.5 text-sm font-bold rounded-md transition-all ${type === 'gider' ? 'bg-rose-500 text-white shadow-sm' : 'text-neutral-500'}`}
                >
                  GİDER
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-500 mb-1 uppercase tracking-wider">Açıklama</label>
                  <input
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="ör. Aylık Maaş, Ev Kirası"
                    className="w-full bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-500 mb-1 uppercase tracking-wider">Kategori</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                  >
                    <option value="">Kategori Seçin...</option>
                    {categories
                      .filter(c => c.type === type || c.type === 'ikisi_de')
                      .map((c) => (
                        <option key={c.id} value={c.name}>{c.icon} {c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-500 mb-1 uppercase tracking-wider">Tutar (₺)</label>
                  <input
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="25.000"
                    className="w-full bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-500 mb-1 uppercase tracking-wider">Ayın Günü</label>
                  <select
                    value={dayOfMonth}
                    onChange={(e) => setDayOfMonth(parseInt(e.target.value))}
                    className="w-full bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                  >
                    {[...Array(31)].map((_, i) => (
                      <option key={i+1} value={i+1}>{i+1}. Gün</option>
                    ))}
                  </select>
                  <div className="flex items-center gap-1.5 mt-2 text-[10px] sm:text-xs text-blue-600 dark:text-blue-400 font-medium">
                    <Info className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>Bu işlem her ay otomatik olarak Navigatör'e yansıtılacaktır.</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2 bg-primary-600 text-white rounded-lg text-sm font-bold hover:bg-primary-700 transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
                <button
                  type="button"
                  onClick={closeForm}
                  className="px-6 py-2 bg-neutral-200 dark:bg-zinc-800 text-neutral-700 dark:text-neutral-300 rounded-lg text-sm font-medium"
                >
                  Vazgeç
                </button>
              </div>
           </form>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button 
            onClick={() => applyPreset({ type: 'gelir', desc: 'Maaş Ödemesi', cat: 'Maaş', day: 1 })}
            className="p-4 border border-blue-200 dark:border-blue-900/30 bg-blue-50/30 dark:bg-blue-900/10 rounded-2xl text-left hover:scale-[1.02] transition-transform shadow-lg shadow-blue-500/5 group"
          >
            <div className="text-xl mb-1 group-hover:scale-125 transition-transform duration-300">💰</div>
            <div className="font-black text-blue-700 dark:text-blue-400 text-sm uppercase tracking-tighter">Maaş Ekle</div>
            <div className="text-[10px] text-blue-600/70 dark:text-blue-500/50 uppercase font-black mt-1 tracking-widest">Hızlı Tanım</div>
          </button>
          
          <button 
            onClick={() => applyPreset({ type: 'gider', desc: 'Ev Kirası', cat: 'Kira', day: 15 })}
            className="p-4 border border-zinc-200 dark:border-zinc-800 bg-zinc-50/30 dark:bg-zinc-900/50 rounded-2xl text-left hover:scale-[1.02] transition-transform group"
          >
            <div className="text-xl mb-1 group-hover:scale-125 transition-transform duration-300">🏠</div>
            <div className="font-black text-zinc-700 dark:text-zinc-300 text-sm uppercase tracking-tighter">Kira Ekle</div>
            <div className="text-[10px] text-zinc-600/70 dark:text-zinc-500/50 uppercase font-black mt-1 tracking-widest">Sabit Gider</div>
          </button>

          <button 
            onClick={() => applyPreset({ type: 'gider', desc: 'Elektrik/Su Faturası', cat: 'Fatura', day: 10 })}
            className="p-4 border border-zinc-200 dark:border-zinc-800 bg-zinc-50/30 dark:bg-zinc-900/50 rounded-2xl text-left hover:scale-[1.02] transition-transform group"
          >
            <div className="text-xl mb-1 group-hover:scale-125 transition-transform duration-300">⚡</div>
            <div className="font-black text-zinc-700 dark:text-zinc-300 text-sm uppercase tracking-tighter">Fatura Ekle</div>
            <div className="text-[10px] text-zinc-600/70 dark:text-zinc-500/50 uppercase font-black mt-1 tracking-widest">Aylık Ödeme</div>
          </button>
        </div>
      )}
        </>
      )}

      <div className="bg-white dark:bg-zinc-900/30 border border-neutral-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-50 dark:bg-zinc-800/50 border-b border-neutral-200 dark:border-zinc-800">
            <tr>
              <th className="px-4 py-3 font-bold text-[10px] uppercase tracking-widest text-neutral-400">GÜN</th>
              <th className="px-4 py-3 font-bold text-[10px] uppercase tracking-widest text-neutral-400">TANIM</th>
              <th className="px-4 py-3 font-bold text-[10px] uppercase tracking-widest text-neutral-400 text-right">TUTAR</th>
              {!isObserver && <th className="px-4 py-3"></th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-zinc-800">
            {flows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-neutral-500 text-xs">Henüz sabit akış tanımlanmamış.</td>
              </tr>
            ) : (
              flows.map(flow => (
                <tr key={flow.id} className="hover:bg-neutral-50 dark:hover:bg-zinc-800/30 transition-colors relative border-l-2 border-l-transparent dark:hover:border-l-blue-500 hover:border-l-blue-500">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                       <span className="inline-flex items-center justify-center w-7 h-7 bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 rounded-lg font-black text-[11px] shadow-inner">
                         {flow.dayOfMonth}
                       </span>
                       <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest hidden sm:inline-block">Her ayın {flow.dayOfMonth}. günü</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-bold text-neutral-900 dark:text-white uppercase tracking-tighter">{flow.description}</div>
                    <div className="text-[10px] text-neutral-500 uppercase">{flow.category}</div>
                  </td>
                  <td className="px-4 py-3 text-right font-black">
                    <div className="flex items-center justify-end gap-1.5 focus">
                      <span className={flow.type === 'gelir' ? 'text-emerald-500' : 'text-rose-500'}>
                        {flow.type === 'gelir' ? '+' : '-'}{flow.amount.toLocaleString('tr-TR')}{CURRENCY_SYMBOL}
                      </span>
                      <Repeat className="w-3.5 h-3.5 text-neutral-400 opacity-60" title="Sürekli Tekrarlanan İşlem" />
                    </div>
                  </td>
                  {!isObserver && (
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button 
                          onClick={() => handleEdit(flow)}
                          className="p-1.5 text-neutral-400 hover:text-blue-500 transition-colors rounded-lg hover:bg-blue-50 dark:hover:bg-blue-500/10"
                          title="Düzenle"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(flow.id)}
                          className="p-1.5 text-neutral-400 hover:text-rose-500 transition-colors rounded-lg hover:bg-rose-50 dark:hover:bg-rose-500/10"
                          title="Sil"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
