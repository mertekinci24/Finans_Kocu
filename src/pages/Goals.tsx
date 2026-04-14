import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { CURRENCY_SYMBOL, ROUTES } from '@/constants';
import { useInflationAdjustment } from '@/hooks/useInflationAdjustment';
import { dataSourceAdapter } from '@/services/supabase/adapter';
import {
  goalEngine,
  type SavingGoal,
  type GoalProjection,
  type GoalCategory,
  type GoalPriority,
  GOAL_CATEGORY_META,
} from '@/services/goalService';
import { analyzeScenario, type ScenarioAnalysisInput } from '@/services/assistant/assistantService';
import type { Transaction } from '@/types';

export default function GoalsPage(): JSX.Element {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { inflationData } = useInflationAdjustment();

  const [goals, setGoals] = useState<SavingGoal[]>([]);
  const [projections, setProjections] = useState<GoalProjection[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState<SavingGoal | null>(null);
  const [coachComment, setCoachComment] = useState<string>('');
  const [activeCoachGoalId, setActiveCoachGoalId] = useState<string | null>(null);
  const [addFundsId, setAddFundsId] = useState<string | null>(null);
  const [addFundsAmount, setAddFundsAmount] = useState<number>(0);

  // Form state
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState<GoalCategory>('diğer');
  const [formTargetAmount, setFormTargetAmount] = useState(50000);
  const [formCurrentAmount, setFormCurrentAmount] = useState(0);
  const [formMonthlySaving, setFormMonthlySaving] = useState(2000);
  const [formTargetDate, setFormTargetDate] = useState('');
  const [formPriority, setFormPriority] = useState<GoalPriority>('medium');
  const [formNote, setFormNote] = useState('');

  useEffect(() => {
    if (user?.id) loadData(user.id);
  }, [user?.id]);

  const loadData = async (userId: string) => {
    try {
      setLoading(true);
      const { SupabaseGoalRepository } = await import('@/services/supabase/repositories/GoalRepository');
      const goalRepo = new SupabaseGoalRepository();
      const goalsData = await goalRepo.getActiveByUserId(userId);
      setGoals(goalsData);

      // İşlemleri yükle (tasarruf oranı hesabı için)
      const accounts = await dataSourceAdapter.account.getByUserId(userId);
      const allTx: Transaction[] = [];
      for (const acc of accounts) {
        const start = new Date();
        start.setMonth(start.getMonth() - 3);
        const txs = await dataSourceAdapter.transaction.getByDateRange(acc.id, start, new Date());
        allTx.push(...txs);
      }
      setTransactions(allTx);

      // Projeksiyon hesapla
      const monthlyRate = inflationData.monthlyRate;
      const monthlySavings = goalEngine.calculateCurrentMonthlySavings(allTx);
      const projData = goalEngine.projectAllGoals(goalsData, monthlySavings, monthlyRate);
      setProjections(projData);
    } catch (err) {
      console.error('Goals load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveGoal = useCallback(async () => {
    if (!user?.id || !formName || formTargetAmount <= 0) return;

    const { SupabaseGoalRepository } = await import('@/services/supabase/repositories/GoalRepository');
    const goalRepo = new SupabaseGoalRepository();

    try {
      if (editingGoal) {
        await goalRepo.update(editingGoal.id, {
          name: formName,
          category: formCategory,
          targetAmount: formTargetAmount,
          currentAmount: formCurrentAmount,
          monthlySaving: formMonthlySaving,
          targetDate: formTargetDate ? new Date(formTargetDate) : undefined,
          priority: formPriority,
          note: formNote || undefined,
        });
      } else {
        await goalRepo.create({
          userId: user.id,
          name: formName,
          category: formCategory,
          targetAmount: formTargetAmount,
          currentAmount: formCurrentAmount,
          monthlySaving: formMonthlySaving,
          targetDate: formTargetDate ? new Date(formTargetDate) : undefined,
          priority: formPriority,
          status: 'active',
          note: formNote || undefined,
        });
      }

      resetForm();
      await loadData(user.id);
    } catch (err) {
      console.error('Save goal error:', err);
    }
  }, [user?.id, formName, formCategory, formTargetAmount, formCurrentAmount, formMonthlySaving, formTargetDate, formPriority, formNote, editingGoal]);

  const handleDeleteGoal = useCallback(async (goalId: string) => {
    if (!user?.id) return;
    const { SupabaseGoalRepository } = await import('@/services/supabase/repositories/GoalRepository');
    const goalRepo = new SupabaseGoalRepository();
    await goalRepo.delete(goalId);
    await loadData(user.id);
  }, [user?.id]);

  const handleAddFunds = useCallback(async () => {
    if (!user?.id || !addFundsId || addFundsAmount <= 0) return;
    const { SupabaseGoalRepository } = await import('@/services/supabase/repositories/GoalRepository');
    const goalRepo = new SupabaseGoalRepository();
    await goalRepo.addFunds(addFundsId, addFundsAmount);
    setAddFundsId(null);
    setAddFundsAmount(0);
    await loadData(user.id);
  }, [user?.id, addFundsId, addFundsAmount]);

  const handleGetCoachAdvice = useCallback(async (projection: GoalProjection) => {
    setActiveCoachGoalId(projection.goal.id);
    setCoachComment('');
    const apiKey = localStorage.getItem('fk_claude_api_key');

    const input: ScenarioAnalysisInput = {
      scenarioDescription: goalEngine.buildGoalCoachPrompt(projection),
      baselineScore: 0,
      scenarioScore: 0,
      scoreDelta: 0,
      cashTightnessDate: null,
      breakEvenMonth: null,
      riskLevel: projection.isOnTrack ? 'safe' : projection.delayDays > 90 ? 'risky' : 'moderate',
      recommendations: projection.recommendations,
      baselineEndBalance: projection.goal.targetAmount,
      scenarioEndBalance: projection.goal.currentAmount,
    };

    const comment = await analyzeScenario(input, apiKey);
    setCoachComment(comment);
  }, []);

  const resetForm = () => {
    setShowForm(false);
    setEditingGoal(null);
    setFormName('');
    setFormCategory('diğer');
    setFormTargetAmount(50000);
    setFormCurrentAmount(0);
    setFormMonthlySaving(2000);
    setFormTargetDate('');
    setFormPriority('medium');
    setFormNote('');
  };

  const openEditForm = (goal: SavingGoal) => {
    setEditingGoal(goal);
    setFormName(goal.name);
    setFormCategory(goal.category);
    setFormTargetAmount(goal.targetAmount);
    setFormCurrentAmount(goal.currentAmount);
    setFormMonthlySaving(goal.monthlySaving);
    setFormTargetDate(goal.targetDate ? new Date(goal.targetDate).toISOString().split('T')[0] : '');
    setFormPriority(goal.priority);
    setFormNote(goal.note || '');
    setShowForm(true);
  };

  const fmt = (n: number) =>
    `${CURRENCY_SYMBOL}${Math.abs(n).toLocaleString('tr-TR', { maximumFractionDigits: 0 })}`;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-neutral-600">Hedefler yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900">🎯 Hedeflerim</h1>
          <p className="text-neutral-600 mt-1 text-sm">
            Birikim hedeflerini oluştur, takip et, hayallerine ulaş
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigate(ROUTES.DASHBOARD)}
            className="px-3 py-1.5 text-xs font-medium bg-neutral-100 text-neutral-600 rounded-lg hover:bg-neutral-200 transition-colors border border-neutral-200"
          >
            ← Kontrol Paneli
          </button>
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="px-4 py-1.5 text-xs font-medium bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-sm"
          >
            + Yeni Hedef
          </button>
        </div>
      </div>

      {/* Hedef Form Modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white border border-neutral-200 rounded-xl p-6 shadow-lg"
          >
            <h2 className="text-sm font-semibold text-neutral-900 mb-4">
              {editingGoal ? '✏️ Hedefi Düzenle' : '✨ Yeni Hedef Oluştur'}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">Hedef Adı</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ör: Tatil Fonu, Araba Peşinatı..."
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">Kategori</label>
                <div className="flex flex-wrap gap-1.5">
                  {(Object.keys(GOAL_CATEGORY_META) as GoalCategory[]).map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setFormCategory(cat)}
                      className={`px-2 py-1 text-xs rounded-md transition-all ${
                        formCategory === cat
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'bg-neutral-50 text-neutral-500 border border-neutral-200 hover:bg-neutral-100'
                      }`}
                    >
                      {GOAL_CATEGORY_META[cat].icon} {GOAL_CATEGORY_META[cat].label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">Hedef Tutar (₺)</label>
                <input
                  type="number"
                  value={formTargetAmount}
                  onChange={(e) => setFormTargetAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  min={0}
                  step={5000}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">Biriken Tutar (₺)</label>
                <input
                  type="number"
                  value={formCurrentAmount}
                  onChange={(e) => setFormCurrentAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  min={0}
                  step={1000}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">Aylık Tasarruf Hedefi (₺)</label>
                <input
                  type="number"
                  value={formMonthlySaving}
                  onChange={(e) => setFormMonthlySaving(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  min={0}
                  step={500}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">Hedef Tarih (Opsiyonel)</label>
                <input
                  type="date"
                  value={formTargetDate}
                  onChange={(e) => setFormTargetDate(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">Öncelik</label>
                <div className="flex gap-2">
                  {(['high', 'medium', 'low'] as GoalPriority[]).map((p) => (
                    <button
                      key={p}
                      onClick={() => setFormPriority(p)}
                      className={`flex-1 px-3 py-1.5 text-xs rounded-md font-medium transition-all ${
                        formPriority === p
                          ? p === 'high'
                            ? 'bg-red-50 text-red-700 border border-red-200'
                            : p === 'medium'
                              ? 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                              : 'bg-green-50 text-green-700 border border-green-200'
                          : 'bg-neutral-50 text-neutral-500 border border-neutral-200 hover:bg-neutral-100'
                      }`}
                    >
                      {p === 'high' ? '🔴 Yüksek' : p === 'medium' ? '🟡 Orta' : '🟢 Düşük'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">Not (Opsiyonel)</label>
                <input
                  type="text"
                  value={formNote}
                  onChange={(e) => setFormNote(e.target.value)}
                  placeholder="Ek notlar..."
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-5">
              <button
                onClick={handleSaveGoal}
                disabled={!formName || formTargetAmount <= 0}
                className="flex-1 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium text-sm rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                {editingGoal ? 'Güncelle' : 'Hedef Oluştur'}
              </button>
              <button
                onClick={resetForm}
                className="px-4 py-2.5 bg-neutral-100 text-neutral-600 text-sm rounded-lg hover:bg-neutral-200 transition-colors"
              >
                İptal
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hedef Kartları */}
      {projections.length === 0 && !showForm ? (
        <EmptyState onAdd={() => setShowForm(true)} />
      ) : (
        <div className="space-y-4">
          {projections.map((proj) => (
            <GoalCard
              key={proj.goal.id}
              projection={proj}
              fmt={fmt}
              onEdit={() => openEditForm(proj.goal)}
              onDelete={() => handleDeleteGoal(proj.goal.id)}
              onAddFunds={() => { setAddFundsId(proj.goal.id); setAddFundsAmount(0); }}
              onGetCoachAdvice={() => handleGetCoachAdvice(proj)}
              isAddingFunds={addFundsId === proj.goal.id}
              addFundsAmount={addFundsAmount}
              setAddFundsAmount={setAddFundsAmount}
              onConfirmAddFunds={handleAddFunds}
              onCancelAddFunds={() => setAddFundsId(null)}
              coachComment={activeCoachGoalId === proj.goal.id ? coachComment : ''}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Hedef Kartı ────────────────────────────────────────────────────
function GoalCard({
  projection,
  fmt,
  onEdit,
  onDelete,
  onAddFunds,
  onGetCoachAdvice,
  isAddingFunds,
  addFundsAmount,
  setAddFundsAmount,
  onConfirmAddFunds,
  onCancelAddFunds,
  coachComment,
}: {
  projection: GoalProjection;
  fmt: (n: number) => string;
  onEdit: () => void;
  onDelete: () => void;
  onAddFunds: () => void;
  onGetCoachAdvice: () => void;
  isAddingFunds: boolean;
  addFundsAmount: number;
  setAddFundsAmount: (v: number) => void;
  onConfirmAddFunds: () => void;
  onCancelAddFunds: () => void;
  coachComment: string;
}) {
  const { goal } = projection;
  const meta = GOAL_CATEGORY_META[goal.category];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
    >
      {/* Header */}
      <div
        className="px-5 py-3 flex items-center gap-3"
        style={{ backgroundColor: `${meta.color}10`, borderBottom: `2px solid ${meta.color}30` }}
      >
        <span className="text-2xl">{meta.icon}</span>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-neutral-900 truncate">{goal.name}</h3>
          <p className="text-xs text-neutral-500">
            {meta.label} •{' '}
            {goal.priority === 'high' ? '🔴 Yüksek' : goal.priority === 'medium' ? '🟡 Orta' : '🟢 Düşük'}
            {goal.note && ` • ${goal.note}`}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={onEdit} className="p-1.5 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded transition-colors" title="Düzenle">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button onClick={onDelete} className="p-1.5 text-neutral-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors" title="Sil">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="px-5 py-4 space-y-4">
        {/* Progress Bar */}
        <div>
          <div className="flex items-end justify-between mb-1.5">
            <span className="text-lg font-bold text-neutral-900">
              {fmt(goal.currentAmount)}
            </span>
            <span className="text-xs text-neutral-500">
              / {fmt(goal.targetAmount)}
            </span>
          </div>
          <div className="relative h-3 bg-neutral-200 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, projection.progressPercent)}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className="absolute inset-y-0 left-0 rounded-full"
              style={{ backgroundColor: meta.color }}
            />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-xs text-neutral-500">
              %{projection.progressPercent.toFixed(1)} tamamlandı
            </span>
            <span className="text-xs text-neutral-500">
              Kalan: {fmt(goal.targetAmount - goal.currentAmount)}
            </span>
          </div>
        </div>

        {/* Metrik Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricCard
            label="Tahmini Tarih"
            value={isFinite(projection.monthsRemaining)
              ? projection.estimatedCompletionDate.toLocaleDateString('tr-TR', { month: 'short', year: 'numeric' })
              : '—'}
            color="blue"
          />
          <MetricCard
            label="Durum"
            value={projection.isOnTrack ? '✅ Hedeftesin' : `⏰ ${Math.ceil(projection.delayDays / 30)} ay geç`}
            color={projection.isOnTrack ? 'green' : 'red'}
          />
          <MetricCard
            label="Aylık Tasarruf"
            value={fmt(projection.currentMonthlySavingsRate)}
            color="blue"
          />
          <MetricCard
            label="Gereken Aylık"
            value={fmt(projection.requiredMonthlySaving)}
            color={projection.requiredMonthlySaving > projection.currentMonthlySavingsRate ? 'red' : 'green'}
          />
        </div>

        {/* Enflasyon Uyarısı */}
        {projection.purchasingPowerLoss > 1000 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-xs text-amber-800">
              📈 <strong>Enflasyon Etkisi:</strong> Hedefinin reel değeri {fmt(projection.realTargetAmount)}'ye çıkıyor.
              Satın alma gücün {fmt(projection.purchasingPowerLoss)} eriyor.
            </p>
          </div>
        )}

        {/* Öneriler */}
        {projection.recommendations.length > 0 && (
          <div className="space-y-1">
            {projection.recommendations.map((rec, i) => (
              <p key={i} className="text-xs text-neutral-600 flex items-start gap-1.5">
                <span className="text-blue-500 mt-0.5">●</span>
                {rec}
              </p>
            ))}
          </div>
        )}

        {/* Aksiyon Butonları */}
        <div className="flex items-center gap-2 pt-2 border-t border-neutral-100">
          <button
            onClick={onAddFunds}
            className="px-3 py-1.5 text-xs font-medium bg-green-50 text-green-700 rounded-md hover:bg-green-100 border border-green-200 transition-colors"
          >
            💰 Para Ekle
          </button>
          <button
            onClick={onGetCoachAdvice}
            className="px-3 py-1.5 text-xs font-medium bg-indigo-50 text-indigo-700 rounded-md hover:bg-indigo-100 border border-indigo-200 transition-colors"
          >
            🤖 Koç Yorumu
          </button>
        </div>

        {/* Para Ekleme Formu */}
        <AnimatePresence>
          {isAddingFunds && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center gap-2 pt-2"
            >
              <input
                type="number"
                value={addFundsAmount}
                onChange={(e) => setAddFundsAmount(Number(e.target.value))}
                placeholder="Tutar (₺)"
                className="flex-1 px-3 py-1.5 border border-neutral-300 rounded-md text-xs focus:ring-2 focus:ring-green-500 focus:border-green-500"
                min={0}
                step={500}
                autoFocus
              />
              <button
                onClick={onConfirmAddFunds}
                disabled={addFundsAmount <= 0}
                className="px-3 py-1.5 text-xs font-medium bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                Ekle
              </button>
              <button
                onClick={onCancelAddFunds}
                className="px-3 py-1.5 text-xs text-neutral-500 hover:text-neutral-700 transition-colors"
              >
                İptal
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Koç Yorumu */}
        <AnimatePresence>
          {coachComment && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="bg-gradient-to-br from-indigo-50 via-blue-50 to-purple-50 border border-indigo-200 rounded-lg p-4"
            >
              <p className="text-xs font-semibold text-indigo-900 mb-2">🤖 Koç Yorumu</p>
              <p className="text-sm text-neutral-800 whitespace-pre-line leading-relaxed">{coachComment}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ─── Yardımcı Bileşenler ────────────────────────────────────────────
function MetricCard({ label, value, color }: { label: string; value: string; color: string }) {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 border-blue-200 text-blue-900',
    green: 'bg-green-50 border-green-200 text-green-900',
    red: 'bg-red-50 border-red-200 text-red-900',
  };

  return (
    <div className={`p-2.5 rounded-lg border ${colorMap[color]}`}>
      <p className="text-xs text-neutral-600 mb-0.5">{label}</p>
      <p className="text-sm font-bold">{value}</p>
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="bg-white border-2 border-dashed border-neutral-300 rounded-xl p-12 text-center">
      <div className="text-5xl mb-4">🎯</div>
      <h3 className="text-lg font-bold text-neutral-900 mb-2">Hayallerine Ulaş</h3>
      <p className="text-sm text-neutral-500 mb-6 max-w-md mx-auto">
        İlk birikim hedefini oluştur. Tatil, araba, ev, acil fon... FinansKoçu seninle birlikte planlasın.
      </p>
      <button
        onClick={onAdd}
        className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md"
      >
        + İlk Hedefini Oluştur
      </button>
    </div>
  );
}
