import type { Transaction } from '@/types';

// ─── Hedef Tipleri ──────────────────────────────────────────────────
export type GoalStatus = 'active' | 'completed' | 'paused' | 'failed';
export type GoalPriority = 'high' | 'medium' | 'low';
export type GoalCategory = 'tatil' | 'araç' | 'ev' | 'eğitim' | 'acil_fon' | 'emeklilik' | 'teknoloji' | 'diğer';

export const GOAL_CATEGORY_META: Record<GoalCategory, { icon: string; color: string; label: string }> = {
  tatil:      { icon: '✈️', color: '#0ea5e9', label: 'Tatil' },
  araç:       { icon: '🚗', color: '#8b5cf6', label: 'Araç' },
  ev:         { icon: '🏠', color: '#f59e0b', label: 'Ev / Emlak' },
  eğitim:     { icon: '📚', color: '#10b981', label: 'Eğitim' },
  acil_fon:   { icon: '🛡️', color: '#ef4444', label: 'Acil Fon' },
  emeklilik:  { icon: '🏖️', color: '#06b6d4', label: 'Emeklilik' },
  teknoloji:  { icon: '💻', color: '#6366f1', label: 'Teknoloji' },
  diğer:      { icon: '🎯', color: '#6b7280', label: 'Diğer' },
};

export interface SavingGoal {
  id: string;
  userId: string;
  name: string;
  category: GoalCategory;
  targetAmount: number;        // Nominal hedef tutar
  currentAmount: number;       // Şu ana kadar biriken
  monthlySaving: number;       // Aylık hedef tasarruf
  targetDate?: Date;           // Opsiyonel hedef tarih
  priority: GoalPriority;
  status: GoalStatus;
  note?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface GoalProjection {
  goal: SavingGoal;
  estimatedCompletionDate: Date;
  daysRemaining: number;
  monthsRemaining: number;
  isOnTrack: boolean;
  delayDays: number;                   // Hedefe göre kaç gün geç
  progressPercent: number;
  realTargetAmount: number;            // Enflasyon ayarlı reel tutar
  purchasingPowerLoss: number;         // Satın alma gücü kaybı (₺)
  requiredMonthlySaving: number;       // Hedefe ulaşmak için gereken aylık tutar
  currentMonthlySavingsRate: number;   // Mevcut aylık tasarruf
  recommendations: string[];
}

// ─── Hedef Motoru ───────────────────────────────────────────────────
export const goalEngine = {
  /**
   * Mevcut tasarruf oranından aylık tasarruf hesapla
   */
  calculateCurrentMonthlySavings(income: number, mre: number): number {
    // 🚨 ARCHITECTURAL BRIDGE (Task 46.8): Proactive Capacity
    // Use real-time income and mandatory expenses (MRE) instead of historical averages.
    // This allows restructuring results to immediately reflect in goal projections.
    return Math.max(0, income - mre);
  },

  /**
   * Hedefe ulaşma tarihini hesapla
   * monthlyRate: aylık enflasyon oranı (ör: 2.5 → %2.5)
   */
  projectGoal(
    goal: SavingGoal,
    allocatedSavings: number,
    monthlyInflationRate: number = 2.5
  ): GoalProjection {
    const remainingAmount = Math.max(0, goal.targetAmount - goal.currentAmount);
    const progressPercent = goal.targetAmount > 0
      ? Math.min(100, (goal.currentAmount / goal.targetAmount) * 100)
      : 0;

    // Hedefe ayıracak miktar (Waterfall'dan gelen tahsisat)
    const effectiveMonthlySaving = allocatedSavings;

    // Tahmini tamamlanma süresi (ay)
    let monthsToComplete: number;
    if (effectiveMonthlySaving <= 0) {
      monthsToComplete = Infinity;
    } else {
      monthsToComplete = Math.ceil(remainingAmount / effectiveMonthlySaving);
    }

    // Tahmini tamamlanma tarihi
    const now = new Date();
    const estimatedCompletionDate = new Date(now);
    if (isFinite(monthsToComplete)) {
      estimatedCompletionDate.setMonth(estimatedCompletionDate.getMonth() + monthsToComplete);
    } else {
      estimatedCompletionDate.setFullYear(estimatedCompletionDate.getFullYear() + 10);
    }

    // Hedefe göre gecikme hesaplaması
    let delayDays = 0;
    let isOnTrack = true;
    if (goal.targetDate) {
      const targetMs = new Date(goal.targetDate).getTime();
      const estimatedMs = estimatedCompletionDate.getTime();
      if (estimatedMs > targetMs) {
        delayDays = Math.ceil((estimatedMs - targetMs) / (24 * 60 * 60 * 1000));
        isOnTrack = false;
      }
    }

    // Enflasyon ayarlı reel değer hesaplama (logic_specs_v2 Katman 4.2)
    const monthlyRate = monthlyInflationRate / 100;
    const inflationFactor = Math.pow(1 + monthlyRate, monthsToComplete);
    const realTargetAmount = isFinite(inflationFactor)
      ? goal.targetAmount * inflationFactor
      : goal.targetAmount;
    const purchasingPowerLoss = realTargetAmount - goal.targetAmount;

    // Hedefe ulaşmak için gereken aylık tutar
    let requiredMonthlySaving = effectiveMonthlySaving;
    if (goal.targetDate) {
      const targetDate = new Date(goal.targetDate);
      const monthsUntilTarget = Math.max(
        1,
        (targetDate.getFullYear() - now.getFullYear()) * 12 +
          (targetDate.getMonth() - now.getMonth())
      );
      requiredMonthlySaving = Math.ceil(remainingAmount / monthsUntilTarget);
    }

    // Kalan gün ve ay
    const daysRemaining = isFinite(monthsToComplete)
      ? Math.max(0, Math.ceil((estimatedCompletionDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)))
      : Infinity;
    const monthsRemaining = isFinite(monthsToComplete) ? monthsToComplete : Infinity;

    // Kural bazlı öneriler
    const recommendations = this.generateGoalRecommendations(
      goal,
      isOnTrack,
      delayDays,
      effectiveMonthlySaving,
      requiredMonthlySaving,
      purchasingPowerLoss,
      progressPercent
    );

    return {
      goal,
      estimatedCompletionDate,
      daysRemaining,
      monthsRemaining,
      isOnTrack,
      delayDays,
      progressPercent,
      realTargetAmount,
      purchasingPowerLoss,
      requiredMonthlySaving,
      currentMonthlySavingsRate: effectiveMonthlySaving,
      recommendations,
    };
  },

  /**
   * Birden fazla hedefi öncelik sırasıyla project et
   */
  projectAllGoals(
    goals: SavingGoal[],
    currentMonthlySavings: number,
    monthlyInflationRate: number = 2.5
  ): GoalProjection[] {
    // Öncelik sıralaması: high → medium → low
    const priorityOrder: Record<GoalPriority, number> = { high: 0, medium: 1, low: 2 };
    const sorted = [...goals]
      .filter((g) => g.status === 'active')
      .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    let remainingSavings = currentMonthlySavings;
    return sorted.map((goal) => {
      // Hedeflenen aylık tasarruf (eğer belirtilmemişse kalan kapasitenin tamamını almaya çalışır)
      const desired = goal.monthlySaving > 0 ? goal.monthlySaving : remainingSavings;
      const allocated = Math.max(0, Math.min(desired, remainingSavings));
      remainingSavings -= allocated;
      return this.projectGoal(goal, allocated, monthlyInflationRate);
    });
  },

  /**
   * Koç Rehberliği — Kural bazlı öneriler (sıfır API maliyeti)
   */
  generateGoalRecommendations(
    goal: SavingGoal,
    isOnTrack: boolean,
    delayDays: number,
    currentMonthlySaving: number,
    requiredMonthlySaving: number,
    purchasingPowerLoss: number,
    progressPercent: number
  ): string[] {
    const recs: string[] = [];
    const fmt = (n: number) => `₺${Math.abs(n).toLocaleString('tr-TR', { maximumFractionDigits: 0 })}`;

    // İlerleme durumu
    if (progressPercent >= 90) {
      recs.push(`🎉 Hedefe neredeyse ulaştın! Son ${fmt(goal.targetAmount - goal.currentAmount)} için sprint yap.`);
    } else if (progressPercent >= 50) {
      recs.push(`👏 Yarıyı geçtin! Bu tempoyu koru.`);
    }

    // Gecikme uyarısı
    if (!isOnTrack && delayDays > 0) {
      const delayMonths = Math.ceil(delayDays / 30);
      recs.push(
        `⏰ Bu tempoyla hedefe ${delayMonths} ay geç ulaşırsın.`
      );

      // Fark tutarı
      const monthlySavingGap = requiredMonthlySaving - currentMonthlySaving;
      if (monthlySavingGap > 0) {
        recs.push(
          `Aylık tasarrufunu ${fmt(monthlySavingGap)} artırırsan tam vaktinde ulaşırsın.`
        );
      }
    }

    // Enflasyon uyarısı
    if (purchasingPowerLoss > 1000) {
      recs.push(
        `📈 Enflasyon etkisi: Hedefin reel değeri ${fmt(purchasingPowerLoss)} artıyor. Bunu planına dahil etmelisin.`
      );
    }

    // Tasarruf yetersiz
    if (currentMonthlySaving <= 0) {
      recs.push('⚠️ Aylık tasarrufun yok veya negatif. Önce giderlerini gözden geçir.');
    }

    // Tamamlandı
    if (goal.currentAmount >= goal.targetAmount) {
      recs.push('🏆 Tebrikler! Bu hedefe ulaştın.');
    }

    return recs;
  },

  /**
   * Claude koç yorumu için senaryo açıklaması oluştur
   */
  buildGoalCoachPrompt(projection: GoalProjection): string {
    const g = projection.goal;
    const fmt = (n: number) => `₺${Math.abs(n).toLocaleString('tr-TR', { maximumFractionDigits: 0 })}`;

    return `Kullanıcının "${g.name}" adlı bir birikim hedefi var.

📊 Hedef Detayları:
- Hedef Tutar: ${fmt(g.targetAmount)}
- Biriken: ${fmt(g.currentAmount)} (%${projection.progressPercent.toFixed(0)})
- Kalan: ${fmt(g.targetAmount - g.currentAmount)}
- Aylık Tasarruf: ${fmt(projection.currentMonthlySavingsRate)}
- Tahmini Tamamlanma: ${projection.estimatedCompletionDate.toLocaleDateString('tr-TR')}
${g.targetDate ? `- Hedef Tarih: ${new Date(g.targetDate).toLocaleDateString('tr-TR')}` : ''}
- Hedefe ${projection.isOnTrack ? 'ZAMANINDA ulaşacak' : `${Math.ceil(projection.delayDays / 30)} ay GEÇ ulaşacak`}
- Enflasyon Etkisi: Reel hedef ${fmt(projection.realTargetAmount)} (${fmt(projection.purchasingPowerLoss)} satın alma gücü kaybı)

Bu hedefi samimi koç tonunda analiz et. Kullanıcıya somut adımlar öner. "Haftalık dışarıda yemek harcamanı X azaltırsan" gibi spesifik tavsiyeler ver.`;
  },
};
