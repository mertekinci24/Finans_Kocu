import {
  FinancialIntelligenceContext,
  FindeksFinancialSnapshot,
  AppFinancialSnapshot,
  RiskSignal,
  InterpretationPermission,
  MissingField,
  EvidenceItem,
  AIAllowedInsight,
  AIBlockedInsight,
  BlockedInsightTopic,
  AllowedInsightTopic,
  RiskSignalLevel,
  FinancialDataSource,
  RiskSignalCategory,
  MissingFieldReason
} from '../../types/intelligence';

/**
 * Phase 7.2B — Deterministic Risk Engine (Hardened)
 * Bu modül, ham finansal verileri alıp deterministik kurallar çerçevesinde 
 * risk sinyalleri ve AI izin modelleri üretir.
 */

const DEFAULT_BLOCKED_TOPICS: BlockedInsightTopic[] = [
  'credit_approval_guarantee',
  'investment_advice',
  'loan_product_recommendation'
];

/**
 * Ana giriş fonksiyonu: Ham snapshot'ları alır ve zenginleştirilmiş context döner.
 */
export function buildFinancialIntelligenceContext(params: {
  findeksSnapshot?: FindeksFinancialSnapshot;
  appSnapshot?: AppFinancialSnapshot;
}): FinancialIntelligenceContext {
  const generatedAt = new Date().toISOString();
  const signals: RiskSignal[] = [];
  const missingFields: MissingField[] = [];
  const warnings: string[] = [];
  const evidence: EvidenceItem[] = [];
  const blockedTopics = new Set<BlockedInsightTopic>(DEFAULT_BLOCKED_TOPICS);
  const allowedInsights: AIAllowedInsight[] = [];
  const blockedInsights: AIBlockedInsight[] = [];

  // 1. Snapshot Evidence & Missing Fields Aggregation
  if (params.findeksSnapshot) {
    if (params.findeksSnapshot.evidence) evidence.push(...params.findeksSnapshot.evidence);
    if (params.findeksSnapshot.confidence === 'low') warnings.push('Findeks rapor verisi güvenilirliği düşük (Confidence Low).');
    
    // Snapshot içinden gelen missing field'ları doğrudan ekle
    if (params.findeksSnapshot.missingFields) {
      missingFields.push(...params.findeksSnapshot.missingFields);
    }
  }

  if (params.appSnapshot) {
    if (params.appSnapshot.evidence) evidence.push(...params.appSnapshot.evidence);
    if (params.appSnapshot.confidence === 'low') warnings.push('Uygulama veri güvenilirliği düşük (Confidence Low).');
    
    if (params.appSnapshot.missingFields) {
      missingFields.push(...params.appSnapshot.missingFields);
    }
  }

  // 2. Findeks Signals
  processFindeksSignals(params.findeksSnapshot, signals, missingFields, blockedTopics, allowedInsights, blockedInsights);

  // 3. App Signals
  processAppSignals(params.appSnapshot, signals, missingFields, blockedTopics, allowedInsights, blockedInsights);

  // 4. Global Warnings & Comparison Logic
  if (!params.findeksSnapshot) {
    warnings.push('Findeks rapor verisi bulunamadı.');
    blockedTopics.add('unsupported_findeks_app_comparison');
  }
  if (!params.appSnapshot) {
    warnings.push('Uygulama içi finansal veriler bulunamadı.');
    blockedTopics.add('unsupported_findeks_app_comparison');
  }

  // 5. Permissions
  const hasCreditScore = hasValue(params.findeksSnapshot?.creditScore);
  const hasDebtLimit = hasValue(params.findeksSnapshot?.debtLimitRatio);
  
  const delayCount = params.findeksSnapshot?.delayCount;
  const delayStatus = params.findeksSnapshot?.delayStatus;
  const hasDelayCountValue = hasValue(delayCount);
  const hasDelayStatusValue = hasValue(delayStatus) && delayStatus !== '';
  
  const hasIncome = hasValue(params.appSnapshot?.monthlyIncome);
  const hasExpense = hasValue(params.appSnapshot?.monthlyExpense);
  const hasWallet = hasValue(params.appSnapshot?.walletBalance);

  const permissions: InterpretationPermission = {
    canAnalyzeCreditScore: hasCreditScore,
    canAnalyzeDebtLimitRatio: hasDebtLimit,
    canAnalyzePaymentHistory: hasDelayCountValue || hasDelayStatusValue,
    canAnalyzeCashflow: hasIncome && hasExpense,
    canAnalyzeLiquidity: hasWallet,
    canCompareFindeksAndAppData: !!(params.findeksSnapshot && params.appSnapshot),
    canGiveActionPlan: signals.length > 0,
    blockedTopics: Array.from(blockedTopics)
  };

  return {
    version: "7.2.0", // Schema version, e.g. "7.2.0"
    generatedAt,
    findeksSnapshot: params.findeksSnapshot,
    appSnapshot: params.appSnapshot,
    signals,
    permissions,
    missingFields: dedupeMissingFields(missingFields),
    evidence,
    allowedInsights,
    blockedInsights,
    warnings
  };
}

/**
 * Findeks verilerini işler.
 */
function processFindeksSignals(
  snapshot: FindeksFinancialSnapshot | undefined,
  signals: RiskSignal[],
  missingFields: MissingField[],
  blockedTopics: Set<BlockedInsightTopic>,
  allowedInsights: AIAllowedInsight[],
  blockedInsights: AIBlockedInsight[]
) {
  if (!snapshot) return;

  const creditScore = snapshot.creditScore;
  const debtLimitRatio = snapshot.debtLimitRatio;
  const delayCount = snapshot.delayCount;
  const delayStatus = snapshot.delayStatus;

  // --- Credit Score ---
  if (!hasValue(creditScore)) {
    blockedTopics.add('unsupported_credit_score_commentary');
    addMissingField(missingFields, 'creditScore', 'findeks', 'not_in_document', 'high', 
      'Kredi notu bulunamadı, bu konuda yorum yapma.', ['credit_score_commentary']);
    blockedInsights.push({
      topic: 'unsupported_credit_score_commentary',
      reason: 'Missing credit score',
      source: 'findeks',
      userFacingFallback: 'Kredi notunuz raporunuzda bulunamadığı için bu konuda yorum yapamıyorum.'
    });
  } else {
    const level = determineScoreLevel(creditScore);
    const code = `FINDEKS_SCORE_${level.toUpperCase()}`;
    
    signals.push(createSignal(code, 'credit_score', level, 'findeks', 'Kredi Notu Durumu', 
      `Kredi notunuz ${creditScore} (${snapshot.creditScoreBand || 'bilinmiyor'}) seviyesinde.`,
      level === 'healthy' ? 'Notunuz güvenli bölgede.' : level === 'warning' ? 'Notunuz orta seviyede, dikkat edilmeli.' : 'Notunuz riskli seviyede.',
      'Kredi notu koruma ve iyileştirme', ['creditScore']));

    allowedInsights.push({
      topic: 'credit_score_commentary',
      reason: 'Score exists',
      source: 'findeks',
      requiredSignals: [code],
      allowedTone: 'professional'
    });
  }

  // --- Debt / Limit Ratio ---
  if (!hasValue(debtLimitRatio)) {
    blockedTopics.add('unsupported_debt_commentary');
    addMissingField(missingFields, 'debtLimitRatio', 'findeks', 'not_in_document', 'medium', 
      'Borç/limit oranı bulunamadı, borç yükü hakkında yorum yapma.', ['debt_limit_ratio_commentary']);
    blockedInsights.push({
      topic: 'unsupported_debt_commentary',
      reason: 'Missing debt limit ratio',
      source: 'findeks',
      userFacingFallback: 'Borç ve limit kullanım oranlarınız raporunuzda tam olarak belirlenemediği için bu analizi yapamıyorum.'
    });
  } else {
    let level: RiskSignalLevel = 'healthy';
    if (debtLimitRatio >= 80) level = 'critical';
    else if (debtLimitRatio >= 60) level = 'warning';

    const code = `FINDEKS_DEBT_LIMIT_${level.toUpperCase()}`;

    signals.push(createSignal(code, 'debt', level, 'findeks', 'Borç / Limit Oranı', 
      `Limit kullanım oranınız %${debtLimitRatio.toFixed(1)}.`,
      level === 'critical' ? 'Limitleriniz çok yoğun kullanılıyor, riskli.' : level === 'warning' ? 'Limit kullanımınız yüksek seviyeye ulaşmış.' : 'Limit kullanımınız sağlıklı seviyede.',
      'Borç yönetimi ve limit açma', ['debtLimitRatio']));

    allowedInsights.push({
      topic: 'debt_limit_ratio_commentary',
      reason: 'Ratio exists',
      source: 'findeks',
      requiredSignals: [code],
      allowedTone: 'direct'
    });
  }

  // --- Payment History ---
  const isDelayStatusActive = hasValue(delayStatus) && delayStatus !== '' && delayStatus !== 'Yok' && delayStatus !== '0';
  const hasDelayData = hasValue(delayCount) || isDelayStatusActive;
  
  if (!hasDelayData) {
    blockedTopics.add('unsupported_payment_history_commentary');
    addMissingField(missingFields, 'delayCount', 'findeks', 'not_in_document', 'medium', 
      'Gecikme bilgisi bulunamadı, ödeme tarihçesi hakkında yorum yapma.', ['payment_history_commentary']);
    blockedInsights.push({
      topic: 'unsupported_payment_history_commentary',
      reason: 'Missing delay data',
      source: 'findeks',
      userFacingFallback: 'Ödeme geçmişinize dair net bir bilgiye ulaşılamadı.'
    });
  } else {
    const dCount = delayCount || 0;
    let level: RiskSignalLevel = 'healthy';
    if (dCount > 0 || isDelayStatusActive) {
      level = dCount > 2 ? 'critical' : 'warning';
    }

    const code = `FINDEKS_PAYMENT_HISTORY_${level.toUpperCase()}`;

    signals.push(createSignal(code, 'payment_history', level, 'findeks', 'Ödeme Geçmişi', 
      dCount > 0 ? `${dCount} adet gecikmeli ödeme görünüyor.` : 'Gecikmeli ödeme kaydı bulunmuyor.',
      level === 'healthy' ? 'Ödemeleriniz düzenli görünüyor.' : 'Geçmişte veya mevcut durumda ödeme gecikmeleri var, bu notu ciddi etkiler.',
      'Ödeme disiplini', ['delayCount', 'delayStatus']));

    allowedInsights.push({
      topic: 'payment_history_commentary',
      reason: 'Delay data exists',
      source: 'findeks',
      requiredSignals: [code],
      allowedTone: 'encouraging'
    });
  }
}

/**
 * Uygulama verilerini işler.
 */
function processAppSignals(
  snapshot: AppFinancialSnapshot | undefined,
  signals: RiskSignal[],
  missingFields: MissingField[],
  blockedTopics: Set<BlockedInsightTopic>,
  allowedInsights: AIAllowedInsight[],
  blockedInsights: AIBlockedInsight[]
) {
  if (!snapshot) return;

  const monthlyIncome = snapshot.monthlyIncome;
  const monthlyExpense = snapshot.monthlyExpense;
  const walletBalance = snapshot.walletBalance;
  const plannedPaymentsTotal = snapshot.plannedPaymentsTotal;

  // --- Cashflow ---
  if (!hasValue(monthlyIncome) || !hasValue(monthlyExpense)) {
    blockedTopics.add('unsupported_cashflow_commentary');
    addMissingField(missingFields, 'cashflow', 'app', 'not_entered_in_app', 'low', 
      'Gelir veya gider bilgisi eksik, nakit akışı analizi yapma.', ['cashflow_commentary']);
    blockedInsights.push({
      topic: 'unsupported_cashflow_commentary',
      reason: 'Missing income/expense',
      source: 'app',
      userFacingFallback: 'Gelir ve gider bilgilerinizi tam olarak girmediğiniz için nakit akışı yorumu yapamıyorum.'
    });
  } else {
    let level: RiskSignalLevel = 'healthy';
    if (monthlyIncome < monthlyExpense) level = 'critical';
    else if (monthlyIncome === monthlyExpense) level = 'warning';

    const code = `APP_CASHFLOW_${level.toUpperCase()}`;

    signals.push(createSignal(code, 'cashflow', level, 'app', 'Nakit Akışı', 
      `Aylık gelir ₺${monthlyIncome.toLocaleString('tr-TR')}, gider ₺${monthlyExpense.toLocaleString('tr-TR')}.`,
      level === 'healthy' ? 'Geliriniz giderinizden fazla, pozitif akış.' : level === 'warning' ? 'Gelir ve gideriniz başa baş, dikkat edilmeli.' : 'Giderleriniz gelirinizi aşıyor, açık var.',
      'Bütçe dengesi', ['monthlyIncome', 'monthlyExpense']));

    allowedInsights.push({
      topic: 'cashflow_commentary',
      reason: 'Income/Expense entered',
      source: 'app',
      requiredSignals: [code],
      allowedTone: 'coaching'
    });
  }

  // --- Liquidity ---
  if (!hasValue(walletBalance)) {
    blockedTopics.add('unsupported_liquidity_commentary');
    addMissingField(missingFields, 'walletBalance', 'app', 'not_entered_in_app', 'medium', 
      'Cüzdan bakiyesi bulunamadı, likidite yorumu yapma.', ['liquidity_commentary']);
    blockedInsights.push({
      topic: 'unsupported_liquidity_commentary',
      reason: 'Missing wallet balance',
      source: 'app',
      userFacingFallback: 'Mevcut varlık/bakiye bilginiz olmadığı için likidite durumunuzu değerlendiremiyorum.'
    });
  } else {
    let level: RiskSignalLevel = 'info';
    const planned = plannedPaymentsTotal || 0;

    if (walletBalance <= 0) {
      level = 'critical';
    } else if (!hasValue(plannedPaymentsTotal)) {
      level = 'info';
    } else if (walletBalance >= planned) {
      level = 'healthy';
    } else {
      level = 'warning';
    }

    const code = `APP_LIQUIDITY_${level.toUpperCase()}`;

    signals.push(createSignal(code, 'liquidity', level, 'app', 'Likidite Durumu', 
      `Mevcut bakiyeniz ₺${walletBalance.toLocaleString('tr-TR')}.`,
      level === 'critical' ? 'Nakit varlığınız tükenmiş.' : level === 'healthy' ? 'Ödemelerinizi karşılayacak nakitiniz var.' : level === 'warning' ? 'Bakiyeniz planlı ödemeleri tam karşılamıyor.' : 'Bakiye var ama planlı ödemeler belirsiz.',
      'Acil durum fonu ve nakit yönetimi', ['walletBalance', 'plannedPaymentsTotal']));

    allowedInsights.push({
      topic: 'liquidity_commentary',
      reason: 'Wallet balance exists',
      source: 'app',
      requiredSignals: [code],
      allowedTone: 'professional'
    });
  }
}

// --- HELPERS ---

/**
 * Type guard for checking if a value is not null or undefined.
 */
function hasValue<T>(val: T | null | undefined): val is T {
  return val !== null && val !== undefined;
}

function createSignal(
  code: string, 
  category: RiskSignalCategory, 
  level: RiskSignalLevel, 
  source: FinancialDataSource, 
  title: string, 
  summary: string, 
  interpretation: string, 
  coachGuidanceTopic: string,
  relatedFields: string[]
): RiskSignal {
  return {
    id: `signal:${code}:${source}`,
    code,
    category,
    level,
    source,
    title,
    summary, // Numeric values here are deterministic inputs, not AI-computed values.
    interpretation,
    coachGuidanceTopic,
    relatedFields,
    evidenceRefs: [],
    confidence: 'high',
    canBeExplainedByAI: true
  };
}

function addMissingField(
  list: MissingField[], 
  field: string, 
  source: FinancialDataSource, 
  reason: MissingFieldReason, 
  severity: 'high' | 'medium' | 'low',
  instruction?: string,
  blocksInsights?: AllowedInsightTopic[]
) {
  list.push({
    field,
    source,
    reason,
    instructionToAI: instruction || `${field} verisi eksik, yorum yapma.`,
    blocksInsights: (blocksInsights || []) as string[],
    severity
  });
}

function dedupeMissingFields(fields: MissingField[]): MissingField[] {
  const seen = new Set<string>();
  return fields.filter(f => {
    const key = `${f.field}:${f.source}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function determineScoreLevel(score: number): RiskSignalLevel {
  if (score >= 1470) return 'healthy';
  if (score >= 1150) return 'warning';
  return 'critical';
}
