import { useState, useEffect, useCallback, useMemo } from 'react';
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
import { cashFlowEngine } from '@/services/cashFlowEngine';
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
  const [capacityData, setCapacityData] = useState({ income: 0, mre: 0 });

  // Form state
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState<GoalCategory>('diğer');
  const [formTargetAmount, setFormTargetAmount] = useState(50000);
  const [formCurrentAmount, setFormCurrentAmount] = useState(0);
  const [formMonthlySaving, setFormMonthlySaving] = useState(2000);
  const [formTargetDate, setFormTargetDate] = useState('');
  const [formPriority, setFormPriority] = useState<GoalPriority>('medium');
  const [formNote, setFormNote] = useState('');

  const monthlyCapacity = useMemo(() => {
    return goalEngine.calculateCurrentMonthlySavings(capacityData.income, capacityData.mre);
  }, [capacityData]);

  const recommendedSaving = useMemo(() => {
    if (monthlyCapacity <= 0) return 0;
    const factor = formPriority === 'high' ? 0.4 : formPriority === 'medium' ? 0.2 : 0.1;
    return Math.round(monthlyCapacity * factor);
  }, [monthlyCapacity, formPriority]);

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

      // MRE ve Gelir hesapla (Smart UI için)
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const recentTx = allTx.filter((t) => new Date(t.date) >= thirtyDaysAgo);
      const mIncome = recentTx.filter(t => t.type === 'gelir').reduce((sum, t) => sum + t.amount, 0);
      
      const installments = await dataSourceAdapter.installment.getByUserId(userId);
      const debts = await dataSourceAdapter.debt.getByUserId(userId);
      const recurringFlows = await dataSourceAdapter.recurringFlow.getByUserId(userId);
      
      const { cashFlowEngine } = await import('@/services/cashFlowEngine');
      const mMRE = cashFlowEngine.calculateMonthlyRequiredExpenses(allTx, installments, debts, recurringFlows);
      
      setCapacityData({ income: mIncome, mre: mMRE });

      // Projeksiyon hesapla
      const monthlyRate = inflationData.monthlyRate;
      const monthlySavings = goalEngine.calculateCurrentMonthlySavings(mIncome, mMRE);
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
        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-4" />
        <p className="text-muted-foreground">Hedefler yükleniyor...</p>
      </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">🎯 Hedeflerim</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Birikim hedeflerini oluştur, takip et, hayallerine ulaş
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigate(ROUTES.DASHBOARD)}
            className="px-3 py-1.5 text-xs font-medium bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 transition-colors border border-border"
          >
            ← Kontrol Paneli
          </button>
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="px-4 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-all shadow-sm"
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
            className="bg-card border border-border rounded-xl p-6 shadow-lg"
          >
            <h2 className="text-sm font-semibold text-foreground mb-4">
              {editingGoal ? '✏️ Hedefi Düzenle' : '✨ Yeni Hedef Oluştur'}
            </h2>

            {/* Kapasite Banner */}
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className={`mb-5 p-3 rounded-lg border flex items-center gap-3 ${
                monthlyCapacity > 0 
                  ? 'bg-primary/10 border-primary/20 text-primary' 
                  : 'bg-destructive/10 border-destructive/20 text-destructive'
              }`}
            >
              <span className="text-xl">{monthlyCapacity > 0 ? '💡' : '⚠️'}</span>
              <div className="flex-1">
                <p className="text-xs font-bold">
                  {monthlyCapacity > 0 
                    ? `Mevcut Aylık Tasarruf Kapasiteniz: ${fmt(monthlyCapacity)}`
                    : 'Tasarruf Kapasiteniz Yetersiz'}
                </p>
                <p className="text-[10px] opacity-80">
                  {monthlyCapacity > 0 
                    ? 'Gelir ve zorunlu giderleriniz (MRE) baz alınarak hesaplanmıştır.'
                    : 'Lütfen önce giderlerinizi optimize edin veya gelirinizi artırın.'}
                </p>
              </div>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Hedef Adı</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ör: Tatil Fonu, Araba Peşinatı..."
                  className="w-full px-3 py-2 border border-border bg-background text-foreground rounded-lg text-sm focus:ring-2 focus:ring-primary/40"
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
                          ? 'bg-primary/10 text-primary border border-primary/20'
                          : 'bg-muted text-muted-foreground border border-border hover:bg-muted/80'
                      }`}
                    >
                      {GOAL_CATEGORY_META[cat].icon} {GOAL_CATEGORY_META[cat].label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Hedef Tutar (₺)</label>
                <input
                  type="number"
                  value={formTargetAmount}
                  onChange={(e) => setFormTargetAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-border bg-background text-foreground rounded-lg text-sm focus:ring-2 focus:ring-primary/40"
                  min={0}
                  step={5000}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Biriken Tutar (₺)</label>
                <input
                  type="number"
                  value={formCurrentAmount}
                  onChange={(e) => setFormCurrentAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-border bg-background text-foreground rounded-lg text-sm focus:ring-2 focus:ring-primary/40"
                  min={0}
                  step={1000}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Aylık Tasarruf Hedefi (₺)</label>
                <input
                  type="number"
                  value={formMonthlySaving}
                  onChange={(e) => setFormMonthlySaving(Number(e.target.value))}
                  className={`w-full px-3 py-2 border bg-background text-foreground rounded-lg text-sm focus:ring-2 focus:ring-primary/40 transition-colors ${
                    formMonthlySaving > monthlyCapacity && monthlyCapacity > 0 
                      ? 'border-destructive bg-destructive/5' 
                      : 'border-border'
                  }`}
                  min={0}
                  step={500}
                />
                {monthlyCapacity > 0 && (
                  <div className="mt-1.5 flex flex-col gap-1">
                    <button
                      onClick={() => setFormMonthlySaving(recommendedSaving)}
                      className="text-left text-[10px] text-primary hover:text-primary/80 font-medium transition-colors"
                    >
                      ✨ Sistem Önerisi: <span className="underline decoration-dotted">{fmt(recommendedSaving)}</span> 
                      <span className="text-muted-foreground font-normal ml-1">
                        (Kapasitenizin %{formPriority === 'high' ? '40' : formPriority === 'medium' ? '20' : '10'}'ı)
                      </span>
                    </button>
                    {formMonthlySaving > monthlyCapacity && (
                      <p className="text-[10px] text-destructive font-bold flex items-center gap-1">
                        ❌ Kapasitenizi aşıyorsunuz!
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Hedef Tarih (Opsiyonel)</label>
                <input
                  type="date"
                  value={formTargetDate}
                  onChange={(e) => setFormTargetDate(e.target.value)}
                  className="w-full px-3 py-2 border border-border bg-background text-foreground rounded-lg text-sm focus:ring-2 focus:ring-primary/40 [color-scheme:dark]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Öncelik</label>
                <div className="flex gap-2">
                  {(['high', 'medium', 'low'] as GoalPriority[]).map((p) => (
                    <button
                      key={p}
                      onClick={() => setFormPriority(p)}
                      className={`flex-1 px-3 py-1.5 text-xs rounded-md font-medium transition-all ${
                        formPriority === p
                          ? p === 'high'
                            ? 'bg-destructive/10 text-destructive border border-destructive/20'
                            : p === 'medium'
                              ? 'bg-warning/10 text-warning border border-warning/20'
                              : 'bg-success/10 text-success border border-success/20'
                          : 'bg-muted text-muted-foreground border border-border hover:bg-muted/80'
                      }`}
                    >
                      {p === 'high' ? '🔴 Yüksek' : p === 'medium' ? '🟡 Orta' : '🟢 Düşük'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Not (Opsiyonel)</label>
                <input
                  type="text"
                  value={formNote}
                  onChange={(e) => setFormNote(e.target.value)}
                  placeholder="Ek notlar..."
                  className="w-full px-3 py-2 border border-border bg-background text-foreground rounded-lg text-sm focus:ring-2 focus:ring-primary/40"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-5">
              <button
                onClick={handleSaveGoal}
                disabled={!formName || formTargetAmount <= 0 || monthlyCapacity <= 0}
                className="flex-1 py-2.5 bg-primary text-primary-foreground font-medium text-sm rounded-lg hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                {editingGoal ? 'Güncelle' : 'Hedef Oluştur'}
              </button>
              <button
                onClick={resetForm}
                className="px-4 py-2.5 bg-muted text-muted-foreground text-sm rounded-lg hover:bg-muted/80 transition-colors"
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
      className="bg-card border border-border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
    >
      {/* Header */}
      <div
        className="px-5 py-3 flex items-center gap-3"
        style={{ backgroundColor: `${meta.color}10`, borderBottom: `2px solid ${meta.color}30` }}
      >
        <span className="text-2xl">{meta.icon}</span>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-foreground truncate">{goal.name}</h3>
          <p className="text-xs text-muted-foreground">
            {meta.label} •{' '}
            {goal.priority === 'high' ? '🔴 Yüksek' : goal.priority === 'medium' ? '🟡 Orta' : '🟢 Düşük'}
            {goal.note && ` • ${goal.note}`}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={onEdit} className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors" title="Düzenle">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button onClick={onDelete} className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors" title="Sil">
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
            <span className="text-lg font-bold text-foreground">
              {fmt(goal.currentAmount)}
            </span>
            <span className="text-xs text-muted-foreground">
              / {fmt(goal.targetAmount)}
            </span>
          </div>
          <div className="relative h-3 bg-muted rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, projection.progressPercent)}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className="absolute inset-y-0 left-0 rounded-full"
              style={{ backgroundColor: meta.color }}
            />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-xs text-muted-foreground">
              %{projection.progressPercent.toFixed(1)} tamamlandı
            </span>
            <span className="text-xs text-muted-foreground">
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
          <div className="bg-warning/10 border border-warning/20 rounded-lg p-3">
            <p className="text-xs text-warning">
              📈 <strong>Enflasyon Etkisi:</strong> Hedefinin reel değeri {fmt(projection.realTargetAmount)}'ye çıkıyor.
              Satın alma gücün {fmt(projection.purchasingPowerLoss)} eriyor.
            </p>
          </div>
        )}

        {/* Öneriler */}
        {projection.recommendations.length > 0 && (
          <div className="space-y-1">
            {projection.recommendations.map((rec, i) => (
              <p key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                <span className="text-primary mt-0.5">●</span>
                {rec}
              </p>
            ))}
          </div>
        )}

        {/* Aksiyon Butonları */}
        <div className="flex items-center gap-2 pt-2 border-t border-border">
          <button
            onClick={onAddFunds}
            className="px-3 py-1.5 text-xs font-medium bg-success/10 text-success rounded-md hover:bg-success/20 border border-success/20 transition-colors"
          >
            💰 Para Ekle
          </button>
          <button
            onClick={onGetCoachAdvice}
            className="px-3 py-1.5 text-xs font-medium bg-primary/10 text-primary rounded-md hover:bg-primary/20 border border-primary/20 transition-colors"
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
                className="flex-1 px-3 py-1.5 border border-border bg-background text-foreground rounded-md text-xs focus:ring-2 focus:ring-success/40"
                min={0}
                step={500}
                autoFocus
              />
              <button
                onClick={onConfirmAddFunds}
                disabled={addFundsAmount <= 0}
                className="px-3 py-1.5 text-xs font-medium bg-success text-success-foreground rounded-md hover:opacity-90 disabled:opacity-50 transition-colors"
              >
                Ekle
              </button>
              <button
                onClick={onCancelAddFunds}
                className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
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
              className="bg-primary/5 border border-primary/20 rounded-lg p-4"
            >
              <p className="text-xs font-semibold text-primary mb-2">🤖 Koç Yorumu</p>
              <p className="text-sm text-foreground whitespace-pre-line leading-relaxed">{coachComment}</p>
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
    blue: 'bg-primary/10 border-primary/20 text-primary',
    green: 'bg-success/10 border-success/20 text-success',
    red: 'bg-destructive/10 border-destructive/20 text-destructive',
  };

  return (
    <div className={`p-2.5 rounded-lg border ${colorMap[color]}`}>
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      <p className="text-sm font-bold">{value}</p>
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="bg-card border-2 border-dashed border-border rounded-xl p-12 text-center">
      <div className="text-5xl mb-4">🎯</div>
      <h3 className="text-lg font-bold text-foreground mb-2">Hayallerine Ulaş</h3>
      <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
        İlk birikim hedefini oluştur. Tatil, araba, ev, acil fon... FinansKoçu seninle birlikte planlasın.
      </p>
      <button
        onClick={onAdd}
        className="px-6 py-2.5 bg-primary text-primary-foreground font-medium rounded-lg hover:opacity-90 transition-all shadow-md"
      >
        + İlk Hedefini Oluştur
      </button>
    </div>
  );
}
