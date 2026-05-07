// Enums / Union Types
export type FinancialDataSource = 'findeks' | 'app' | 'user_message' | 'system' | 'merged';
export type RiskSignalLevel = 'critical' | 'warning' | 'healthy' | 'info' | 'unknown';
export type RiskSignalCategory = 'credit_score' | 'debt' | 'liquidity' | 'cashflow' | 'payment_history' | 'data_quality';
export type ConfidenceLevel = 'high' | 'medium' | 'low' | 'unknown';
export type MissingFieldReason = 'not_in_document' | 'not_extracted' | 'unsupported_document_type' | 'not_entered_in_app' | 'parser_confidence_low' | 'unknown';

export type BlockedInsightTopic =
  | 'credit_approval_guarantee'
  | 'investment_advice'
  | 'loan_product_recommendation'
  | 'unsupported_income_commentary'
  | 'unsupported_cashflow_commentary'
  | 'unsupported_payment_history_commentary'
  | 'unsupported_credit_limit_commentary'
  | 'unsupported_credit_score_commentary'
  | 'unsupported_debt_commentary'
  | 'unsupported_liquidity_commentary'
  | 'unsupported_findeks_app_comparison';

export type AllowedInsightTopic =
  | 'credit_score_commentary'
  | 'debt_limit_ratio_commentary'
  | 'payment_history_commentary'
  | 'cashflow_commentary'
  | 'liquidity_commentary'
  | 'findeks_app_comparison'
  | 'general_action_plan';

export type EvidenceExtractionMethod =
  | 'deterministic_regex'
  | 'semantic_anchor'
  | 'ocr'
  | 'user_input'
  | 'system_calculated'
  | 'manual_entry'
  | 'unknown';

// Evidence structure to back up extracted or inferred values
export interface EvidenceItem {
  id: string;
  source: string;
  sourceType: FinancialDataSource;
  field: string;
  value: string | number | boolean | null;
  page?: number;
  anchor?: string;
  extractionMethod?: EvidenceExtractionMethod;
  confidence: ConfidenceLevel;
  rawTextPreview?: string;
}

// Missing data policy
export interface MissingField {
  field: string;
  source: FinancialDataSource;
  reason: MissingFieldReason;
  instructionToAI: string;
  blocksInsights: string[];
  severity: 'high' | 'medium' | 'low';
}

// Findeks isolated data
export interface FindeksFinancialSnapshot {
  documentType: string;
  parserVersion: string;
  reportDate: string | null;
  creditScore: number | null;
  creditScoreBand: string | null;
  totalLimit: number | null;
  totalDebt: number | null;
  debtLimitRatio: number | null;
  delayStatus: string | null;
  delayCount: number | null;
  
  source: 'findeks';
  confidence: ConfidenceLevel;
  missingFields: MissingField[];
  evidence: EvidenceItem[];
}

// App isolated data
export interface AppFinancialSnapshot {
  walletBalance: number | null;
  accountsTotal: number | null;
  creditCardsTotal: number | null;
  plannedPaymentsTotal: number | null;
  monthlyIncome: number | null;
  monthlyExpense: number | null;
  projectedMonthEndBalance: number | null;
  
  source: 'app';
  confidence: ConfidenceLevel;
  missingFields: MissingField[];
  evidence: EvidenceItem[];
}

// Deterministic risk signal
export interface RiskSignal {
  id: string;
  // Phase 7.2B will define deterministic signal codes.
  code: string;
  category: RiskSignalCategory;
  level: RiskSignalLevel;
  source: FinancialDataSource;
  title: string;
  summary: string;
  interpretation: string;
  coachGuidanceTopic: string;
  relatedFields: string[];
  evidenceRefs: string[]; // references EvidenceItem ids
  confidence: ConfidenceLevel;
  canBeExplainedByAI: boolean;
}

// AI's insight boundaries
export interface AIAllowedInsight {
  topic: AllowedInsightTopic;
  reason: string;
  source: FinancialDataSource;
  requiredSignals: string[]; // references RiskSignal codes
  allowedTone: string;
}

export interface AIBlockedInsight {
  topic: BlockedInsightTopic;
  reason: string;
  source: FinancialDataSource;
  userFacingFallback: string; // e.g. "Bu konuda güvenilir yorum yapabilmem için ilgili veri raporda bulunmuyor."
}

// AI's action boundaries
export interface InterpretationPermission {
  canAnalyzeCreditScore: boolean;
  canAnalyzeDebtLimitRatio: boolean;
  canAnalyzePaymentHistory: boolean;
  canAnalyzeCashflow: boolean;
  canAnalyzeLiquidity: boolean;
  canCompareFindeksAndAppData: boolean;
  canGiveActionPlan: boolean;
  blockedTopics: BlockedInsightTopic[];
}

// The final unified payload injected into the AI context
export interface FinancialIntelligenceContext {
  // Schema version, e.g. "7.2.0"
  version: string;
  generatedAt: string; // ISO format
  
  findeksSnapshot?: FindeksFinancialSnapshot;
  appSnapshot?: AppFinancialSnapshot;
  
  signals: RiskSignal[];
  permissions: InterpretationPermission;
  missingFields: MissingField[];
  evidence: EvidenceItem[];
  
  allowedInsights: AIAllowedInsight[];
  blockedInsights: AIBlockedInsight[];
  
  warnings: string[];
}
