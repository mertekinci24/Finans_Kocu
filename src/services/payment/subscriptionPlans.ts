// ═══════════════════════════════════════════════════════════════════════════════
// FinansKoçu — Subscription Plans & Paywall Configuration
// Faz 4: Monetizasyon Katmanı
// ═══════════════════════════════════════════════════════════════════════════════

export type PlanType = 'free' | 'pro';

export interface SubscriptionPlan {
  id: PlanType;
  name: string;
  price: number;           // ₺/ay
  priceAnnual: number;     // ₺/yıl (2 ay indirimli)
  currency: 'TRY';
  features: PlanFeature[];
  limits: PlanLimits;
  badge: string;
  color: string;
  popular: boolean;
}

export interface PlanFeature {
  key: string;
  label: string;
  included: boolean;
  tooltip?: string;
}

export interface PlanLimits {
  maxAccounts: number;
  maxTransactionsPerMonth: number;
  maxGoals: number;
  aiAssistantMessages: number;     // Aylık AI mesaj limiti
  findeksAnalysis: boolean;
  scenarioSimulations: number;     // Aylık simülasyon limiti
  pdfExport: boolean;
  advancedCoaching: boolean;       // Claude koç yorumu
  prioritySupport: boolean;
}

export interface UserSubscription {
  id: string;
  userId: string;
  planType: PlanType;
  status: 'active' | 'cancelled' | 'past_due' | 'trialing';
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  iyzicoSubscriptionReferenceCode?: string;
  iyzicoCustomerReferenceCode?: string;
  cancelledAt?: Date;
  trialEndsAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Plan Tanımları ─────────────────────────────────────────────────
export const PLANS: Record<PlanType, SubscriptionPlan> = {
  free: {
    id: 'free',
    name: 'Ücretsiz',
    price: 0,
    priceAnnual: 0,
    currency: 'TRY',
    badge: '🆓',
    color: '#6b7280',
    popular: false,
    features: [
      { key: 'accounts', label: '3 hesap', included: true },
      { key: 'transactions', label: 'Aylık 100 işlem', included: true },
      { key: 'score', label: 'Finansal Sağlık Skoru', included: true },
      { key: 'rules', label: 'Temel koç önerileri', included: true },
      { key: 'goals_basic', label: '1 birikim hedefi', included: true },
      { key: 'theme', label: 'Tema desteği', included: true },
      { key: 'ai_assistant', label: 'AI Asistan (sınırlı)', included: false, tooltip: 'Günde 5 mesaj' },
      { key: 'findeks', label: 'Findeks Analizi', included: false },
      { key: 'scenario', label: 'Senaryo Simülatörü', included: false },
      { key: 'pdf_export', label: 'PDF Rapor', included: false },
      { key: 'coaching', label: 'Gelişmiş koçluk', included: false },
    ],
    limits: {
      maxAccounts: 3,
      maxTransactionsPerMonth: 100,
      maxGoals: 1,
      aiAssistantMessages: 5,
      findeksAnalysis: false,
      scenarioSimulations: 0,
      pdfExport: false,
      advancedCoaching: false,
      prioritySupport: false,
    },
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 149,
    priceAnnual: 1490,  // 10 ay fiyatına 12 ay (2 ay hediye)
    currency: 'TRY',
    badge: '⭐',
    color: '#6366f1',
    popular: true,
    features: [
      { key: 'accounts', label: 'Sınırsız hesap', included: true },
      { key: 'transactions', label: 'Sınırsız işlem', included: true },
      { key: 'score', label: 'Finansal Sağlık Skoru', included: true },
      { key: 'rules', label: 'Gelişmiş koç önerileri', included: true },
      { key: 'goals', label: 'Sınırsız birikim hedefi', included: true },
      { key: 'theme', label: 'Tema desteği', included: true },
      { key: 'ai_assistant', label: 'AI Asistan (sınırsız)', included: true },
      { key: 'findeks', label: 'Findeks Analizi + AI', included: true },
      { key: 'scenario', label: 'Senaryo Simülatörü', included: true },
      { key: 'pdf_export', label: 'PDF Rapor Export', included: true },
      { key: 'coaching', label: 'Claude koçluk (premium)', included: true },
      { key: 'priority', label: 'Öncelikli destek', included: true },
    ],
    limits: {
      maxAccounts: Infinity,
      maxTransactionsPerMonth: Infinity,
      maxGoals: Infinity,
      aiAssistantMessages: Infinity,
      findeksAnalysis: true,
      scenarioSimulations: Infinity,
      pdfExport: true,
      advancedCoaching: true,
      prioritySupport: true,
    },
  },
};

// ─── Premium Özellik Tanımlama ──────────────────────────────────────
export type PremiumFeature =
  | 'ai_assistant'
  | 'findeks_analysis'
  | 'scenario_simulator'
  | 'pdf_export'
  | 'advanced_coaching'
  | 'unlimited_accounts'
  | 'unlimited_goals';

export const PREMIUM_FEATURE_LABELS: Record<PremiumFeature, string> = {
  ai_assistant: 'AI Asistan',
  findeks_analysis: 'Findeks Analizi',
  scenario_simulator: 'Senaryo Simülatörü',
  pdf_export: 'PDF Rapor',
  advanced_coaching: 'Gelişmiş Koçluk',
  unlimited_accounts: 'Sınırsız Hesap',
  unlimited_goals: 'Sınırsız Hedef',
};

// ─── Paywall Kontrol Fonksiyonları ──────────────────────────────────
export const subscriptionGuard = {
  /**
   * Kullanıcının bir premium özelliğe erişimi var mı?
   */
  canAccess(subscription: UserSubscription | null, feature: PremiumFeature): boolean {
    // Abonelik yoksa → Free plan
    if (!subscription || subscription.status !== 'active') {
      return this.freeCanAccess(feature);
    }

    // Pro plan — her şeye erişim
    if (subscription.planType === 'pro') {
      return true;
    }

    return this.freeCanAccess(feature);
  },

  /**
   * Free planın erişebildiği özellikler
   */
  freeCanAccess(feature: PremiumFeature): boolean {
    switch (feature) {
      case 'ai_assistant':
        return true; // Günlük 5 mesaj limiti ile
      case 'findeks_analysis':
      case 'scenario_simulator':
      case 'pdf_export':
      case 'advanced_coaching':
      case 'unlimited_accounts':
      case 'unlimited_goals':
        return false;
      default:
        return false;
    }
  },

  /**
   * Free plan limit kontrolü (AI mesaj, hesap sayısı vb.)
   */
  checkLimit(
    subscription: UserSubscription | null,
    limitType: keyof PlanLimits,
    currentUsage: number
  ): { allowed: boolean; limit: number; remaining: number } {
    const planType: PlanType = subscription?.planType ?? 'free';
    const limit = PLANS[planType].limits[limitType];

    if (typeof limit === 'boolean') {
      return { allowed: limit, limit: limit ? Infinity : 0, remaining: limit ? Infinity : 0 };
    }

    const numLimit = limit as number;
    return {
      allowed: currentUsage < numLimit,
      limit: numLimit,
      remaining: Math.max(0, numLimit - currentUsage),
    };
  },

  /**
   * Plan karşılaştırması için özellik listesi
   */
  getUpgradeReasons(feature: PremiumFeature): string {
    const reasons: Record<PremiumFeature, string> = {
      ai_assistant: 'Sınırsız AI Asistan mesajı ile finansal sorularına anında cevap al.',
      findeks_analysis: 'Findeks raporunu yükle, AI analizini gör, kredi skorunu iyileştir.',
      scenario_simulator: '"Ya bu borcu kapatsam?" senaryolarını simüle et, geleceğini planla.',
      pdf_export: 'Aylık finansal raporunu PDF olarak indir ve arşivle.',
      advanced_coaching: 'Claude Sonnet 4.6 ile kişiselleştirilmiş koçluk tavsiyeleri al.',
      unlimited_accounts: 'Sınırsız banka hesabı ve kredi kartı ekle.',
      unlimited_goals: 'İstediğin kadar birikim hedefi oluştur ve takip et.',
    };
    return reasons[feature];
  },
};
