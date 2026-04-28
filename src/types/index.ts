export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  createdAt: Date;
}

export interface Account {
  id: string;
  userId: string;
  name: string;
  type: 'nakit' | 'banka' | 'kredi_kartı';
  balance: number;
  currency: 'TRY';
  bankName?: string;
  cardLimit?: number;
  statementDate?: number;
  statementDay?: number;
  dueDate?: number;
  paymentDay?: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt?: Date;
}

export interface Transaction {
  id: string;
  accountId: string;
  amount: number;
  description: string;
  category: string;
  date: Date;
  type: 'gelir' | 'gider';
  note?: string;
  recurring?: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';
  createdAt: Date;
  updatedAt?: Date;
}

export interface Category {
  id: string;
  userId: string;
  name: string;
  color: string;
  icon?: string;
  monthlyBudget?: number;
  type: 'gelir' | 'gider' | 'ikisi_de';
  isDefault: boolean;
  createdAt: Date;
}


export interface Debt {
  id: string;
  userId: string;
  creditorName: string;
  amount: number;
  remainingAmount: number;
  monthlyPayment: number;
  interestRate: number;
  dueDate: Date;
  status: 'active' | 'paid_off' | 'overdue';
  createdAt: Date;
}

export type InstallmentType = 'kredi_kartı_taksiti' | 'banka_kredisi' | 'kişisel_borç' | 'senet_cek';


export interface Installment {
  id: string;
  userId: string;
  accountId?: string;
  lenderName: string;
  type: InstallmentType;
  principal: number;
  monthlyPayment: number;
  remainingMonths: number;
  totalMonths: number;
  interestRate: number;
  nextPaymentDate: Date;
  firstPaymentDate: Date;
  status: 'active' | 'paid_off' | 'overdue';
  paymentHistory?: Record<string, {
    status: 'paid' | 'unpaid';
    amount?: number;
    note?: string;
  }>;
  note?: string;
  createdAt: Date;
}

export interface FinancialScore {
  overallScore: number;
  confidenceScore: number;
  debtToIncomeRatio: number;
  cashBufferMonths: number;
  savingsRate: number;
  installmentBurdenRatio: number;
  lastCalculatedAt: Date;
}

export interface FindeksReport {
  id: string;
  userId: string;
  fileName: string;
  creditScore: number;
  limitUsageRatio: number;
  delayMonths: number;
  delayHistory: DelayRecord[];
  bankAccounts: number;
  creditCards: number;
  activeDebts: number;
  banksList: BankAccount[];
  aiAnalysis?: string;
  actionPlan?: ActionStep[];
  riskLevel: 'kritik' | 'gelişim_açık' | 'dengeli' | 'güvenli' | 'prestijli';
  scoreImprovementPotential: number;
  uploadedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface DelayRecord {
  date: string;
  monthsDelayed: number;
}

export interface BankAccount {
  name: string;
  type: 'banka' | 'kredi_kartı';
  status: 'aktif' | 'pasif';
  accountsCount?: number;
}

export interface ActionStep {
  priority: 1 | 2 | 3;
  title: string;
  description: string;
  expectedImpact: number;
  timeline: string;
}

export interface FindeksScoreHistory {
  id: string;
  userId: string;
  reportId: string;
  score: number;
  recordedAt: Date;
  previousScore?: number;
  scoreChange?: number;
}

export interface ChatSession {
  id: string;
  userId: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  userId: string;
  role: 'user' | 'assistant';
  content: string;
  suggestedTransaction?: SuggestedTransaction;
  tokensUsed: number;
  createdAt: Date;
}

export interface SuggestedTransaction {
  amount: number;
  category: string;
  description: string;
  date: Date;
  type: 'gelir' | 'gider';
  confidence: number;
}

export interface AssistantContextCache {
  userId: string;
  contextHash: string;
  accountsSummary: AccountSummary[];
  findeksData?: { creditScore: number; limitUsageRatio: number };
  transactionsTrend: TransactionTrend;
  alerts: string[];
  cachedAt: Date;
  expiresAt: Date;
}

export interface AccountSummary {
  name: string;
  type: 'nakit' | 'banka' | 'kredi_kartı';
  balance: number;
  cardLimit?: number;
}

export interface TransactionTrend {
  avgMonthlyExpense: number;
  avgMonthlyIncome: number;
  topCategories: Array<{ name: string; amount: number }>;
  savingsRate: number;
}

export type ObligationType = 'kdv' | 'muhtasar' | 'geçici_vergi' | 'sgk_bağkur' | 'gelir_vergisi' | 'stopaj';
export type PaymentStatus = 'pending' | 'paid' | 'overdue';
export type BaskurProfileType = 'free_professional' | 'self_employed' | 'artisan' | 'farmer' | 'employee_with_private';
export type BaskurTier = 'tier1' | 'tier2' | 'tier3' | 'tier4' | 'tier5' | 'tier6';

export interface TaxObligation {
  id: string;
  userId?: string;
  obligationType: ObligationType;
  dueDate: Date;
  description: string;
  estimatedAmount: number;
  paymentStatus: PaymentStatus;
  reminderSent: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface BaskurProfile {
  id: string;
  userId: string;
  profileType: BaskurProfileType;
  grossIncomeMonthly: number;
  baskurTier: BaskurTier;
  monthlyPremium: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TaxPaymentHistory {
  id: string;
  userId: string;
  obligationType: string;
  paidDate: Date;
  amountPaid: number;
  isOnTime: boolean;
  createdAt: Date;
}

export interface AIModelConfig {
  provider: 'claude' | 'gemini' | 'gpt4';
  apiKey?: string;
  isDefault: boolean;
}

export interface RecurringFlow {
  id: string;
  userId: string;
  type: 'gelir' | 'gider';
  amount: number;
  dayOfMonth: number;
  category: string;
  description: string;
  isFixed: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
