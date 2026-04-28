import type {
  Account,
  Transaction,
  Debt,
  Installment,
  FinancialScore,
  TaxPaymentHistory,
  RecurringFlow
} from '@/types';

import { cashFlowEngine } from './cashFlowEngine';

export interface CrisisInfo {
  level: 'critical' | 'severe' | 'delinquency';
  title: string;
  reason: string;
  action: string;
  overrideScore: number;
  affectedLenders?: string[];
}

export interface ScoringInput {
  accounts: Account[];
  transactions: Transaction[];
  debts: Debt[];
  installments: Installment[];
  taxPayments?: TaxPaymentHistory[];
  recurringFlows?: RecurringFlow[];
  isSimulation?: boolean;
  scenarioType?: string;
}

export interface DetailedScore {
  score: FinancialScore;
  explanation: string;
  label: string;
  color: string;
  crisis?: CrisisInfo;
  insights: string[];
  structuralDti: number;
}

export class ScoringEngine {
  // ---------------------------------------------------
  // CORE HELPERS
  // ---------------------------------------------------

  private sigmoid(x: number): number {
    return 1 / (1 + Math.exp(-x));
  }

  private calculateConfidenceScore(input: ScoringInput): number {
    // Hesaplar ve işlemler temel zorunluluktur. Taksit ve Borç opsiyoneldir.
    const hasBasics = input.accounts.length > 0 && input.transactions.length > 0;
    return hasBasics ? 1.0 : 0.5; // Temel veriler varsa güven %100'dür.
  }

  private getIncome(input: ScoringInput): number {
    // 1. STRICT PRIORITY: Recurring structural flows (Ground Truth for Baseline Income)
    const flowIncome = (input.recurringFlows ?? [])
      .filter(f => f.type === 'gelir' && f.isActive)
      .reduce((sum, f) => sum + f.amount, 0);

    if (flowIncome > 0) return flowIncome;

    // 2. FALLBACK: Monthly average of consistent 'gelir' transactions (Last 30 days only)
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);

    const recentIncome = input.transactions
      .filter(t => t.type === 'gelir' && new Date(t.date) >= thirtyDaysAgo)
      .reduce((sum, t) => sum + t.amount, 0);

    return recentIncome || 1;
  }

  private getStructuralDebtBurden(input: ScoringInput): number {
    const currentMonthEnd = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);
    const installmentLoad = input.installments
      .filter(i => i.status === 'active' && new Date(i.firstPaymentDate) <= currentMonthEnd)
      .reduce((sum, i) => sum + i.monthlyPayment, 0);

    const debtLoad = input.debts
      .filter(d => d.status === 'active')
      .reduce((sum, d) => sum + (d.monthlyPayment || 0), 0);

    return installmentLoad + debtLoad;
  }

  private getStructuralDTI(input: ScoringInput): number {
    return this.getStructuralDebtBurden(input) / this.getIncome(input);
  }

  // ---------------------------------------------------
  // BASE ENGINE
  // ---------------------------------------------------

  private calculateBaseScore(
    wnw: number,
    mre: number,
    nt: number,
    liquidityStress: number,
    income: number,
    transactions: Transaction[]
  ): number {
    const ratio = Math.max(1, wnw / (mre || 1));
    const incomeRatio = Math.max(1, income / (mre || 1));

    const vc = Math.min(
      1,
      (Math.log10(ratio) / 3 + Math.log10(incomeRatio) / 1.5) / 2
    );

    const vcAdj = vc * (1 - Math.exp(-nt / 12));

    const smoothPenalty = (30 * Math.exp(-nt)) * (1 - vcAdj);

    const liquidityPenalty =
      liquidityStress >= 0.3
        ? 0
        : 15 * (1 - liquidityStress / 0.3);

    let deathPit = 0;

    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const monthsFCF = [0, 0, 0];

    transactions
      .filter(t => new Date(t.date) >= ninetyDaysAgo)
      .forEach(t => {
        const diff = Math.floor(
          (Date.now() - new Date(t.date).getTime()) / 86400000
        );
        const idx = Math.floor(diff / 30);

        if (idx >= 0 && idx < 3) {
          monthsFCF[idx] += t.type === 'gelir' ? t.amount : -t.amount;
        }
      });

    if (monthsFCF.every(v => v < 0)) deathPit += 5;
    if (nt < 0.5) deathPit += 10;
    if (mre > income * 0.8) deathPit += 5;

    const loadPenalty = Math.min(60, 45 * (mre / income));

    return Math.max(
      0,
      100 -
        smoothPenalty -
        liquidityPenalty -
        deathPit -
        loadPenalty
    );
  }

  private applyAnchor(
    baseScore: number,
    wnw: number,
    mre: number,
    totalDebt: number
  ): number {
    let boost = 0;

    if (totalDebt === 0) {
      boost =
        10 *
        this.sigmoid(
          Math.log10(Math.max(1, wnw / (mre || 1))) - 2
        );
    } else {
      boost =
        10 *
        this.sigmoid((wnw / totalDebt) - 2);
    }

    return baseScore + boost;
  }

  // ---------------------------------------------------
  // OVERRIDE ENGINE
  // ---------------------------------------------------

  private checkOverrides(
    input: ScoringInput,
    wnw: number,
    nt: number,
    disposableCash: number,
    minBalance: number
  ): CrisisInfo | null {
    const structuralDti = this.getStructuralDTI(input);

    // THE TRUE HONEST MATH (Logarithmic Curve)
    const dynamicCrisisScore = Math.max(12, Math.min(85, Math.round(65 / (structuralDti || 0.1))));

    const isUnlocked = structuralDti < 0.45;
    const isRecovering = structuralDti < 2.0;

    // --- LAYER 0 ---
    if (wnw < 0) {
      if (isUnlocked) return null;
      return {
        level: 'severe',
        title: isRecovering ? 'TEKNİK İFLAS (İyileşme Rotalı)' : 'TEKNİK İFLAS',
        reason: isRecovering ? 'Likidite ağırlıklı özsermaye negatif, ancak borç yükü rasyonel düşüş trendinde.' : 'Likidite ağırlıklı özsermaye negatif.',
        action: 'Yapılandırma planına sadık kalın ve acil nakit tamponu oluşturun.',
        overrideScore: dynamicCrisisScore // NO TERNARY, NO SIMULATION CHECK
      };
    }

    // --- LAYER 1A ---
    if ((disposableCash < 0 || minBalance < 0) && nt < 1) {
      if (isUnlocked) return null;
      return {
        level: 'critical',
        title: 'LİKİDİTE KRİZİ',
        reason: '30 günlük nakit akışı zorlanıyor.',
        action: 'Ödeme günü ve nakit tampon planı yapın.',
        overrideScore: Math.max(22, dynamicCrisisScore)
      };
    }

    // --- TRIGGER C (DELINQUENCY) ---
    const hasOverdue = input.debts.some(d => d.status === 'overdue' || d.remainingAmount > 0);
    if (hasOverdue) {
      return {
        level: 'delinquency',
        title: 'TEMERRÜT',
        reason: 'Gecikmiş borç geçmişi tespit edildi.',
        action: 'Gecikmiş borçları kapatın.',
        overrideScore: Math.max(24, dynamicCrisisScore)
      };
    }

    return null;
  }

  // ---------------------------------------------------
  // MAIN
  // ---------------------------------------------------

  calculate(input: ScoringInput): DetailedScore {
    const now = new Date();

    const income = this.getIncome(input);

    const wnw =
      cashFlowEngine.calculateWeightedNetWorth(
        input.accounts,
        input.installments,
        input.debts
      );

    const mre =
      cashFlowEngine.calculateMonthlyRequiredExpenses(
        input.transactions,
        input.installments,
        input.debts,
        input.recurringFlows || []
      );

    const liquidAssets = input.accounts
      .filter(a => a.type !== 'kredi_kartı')
      .reduce((sum, a) => sum + a.balance, 0);

    const totalAssets = liquidAssets;

    const nt = input.isSimulation
      ? (liquidAssets + totalAssets * 0.9) / mre
      : liquidAssets / mre;

    const liquidityStress =
      totalAssets > 0 ? liquidAssets / totalAssets : 0;

    const forecast = cashFlowEngine.forecast(
      input.accounts,
      input.transactions,
      input.debts,
      input.installments,
      input.recurringFlows || []
    );

    const projectedDisposableCash =
      forecast.projectedEndBalance - mre;

    const totalDebt =
      input.installments
        .filter(i => i.status === 'active')
        .reduce((s, i) => s + i.principal, 0) +
      input.debts
        .filter(d => d.status === 'active')
        .reduce((s, d) => s + d.amount, 0);

    const crisis = this.checkOverrides(
      input,
      wnw,
      nt,
      projectedDisposableCash,
      forecast.minBalance
    );

    let rawScore = 0;

    if (crisis) {
      rawScore = crisis.overrideScore;
    } else {
      const base = this.calculateBaseScore(
        wnw,
        mre,
        nt,
        liquidityStress,
        income,
        input.transactions
      );

      rawScore = this.applyAnchor(
        base,
        wnw,
        mre,
        totalDebt
      );
    }

    const confidence = this.calculateConfidenceScore(input);

    let finalScore = rawScore * confidence;

    finalScore = Math.max(0, Math.min(100, finalScore));

    const score: FinancialScore = {
      overallScore: Math.round(finalScore),
      confidenceScore: Math.round(confidence * 100),
      debtToIncomeRatio: Math.round((totalDebt / income) * 10) / 10,
      cashBufferMonths: Math.round(nt * 10) / 10,
      savingsRate: Math.round(((income - mre) / income) * 100),
      installmentBurdenRatio: Math.round((mre / income) * 100),
      lastCalculatedAt: now
    };

    const structuralDti = this.getStructuralDTI(input);
    const insights = this.generateInsights(
      finalScore,
      nt,
      crisis,
      wnw,
      structuralDti,
      income,
      totalDebt,
      mre
    );

    const scoreLabel = crisis ? crisis.title : (finalScore >= 85 ? 'Finansal Prestij' : finalScore >= 55 ? 'Güvenli Bölge' : finalScore >= 35 ? 'Baskı Altında' : 'Kritik Risk');
    const scoreColor = crisis ? (crisis.level === 'severe' ? 'text-red-600' : 'text-orange-500') : (finalScore >= 85 ? 'text-emerald-400' : finalScore >= 55 ? 'text-green-500' : finalScore >= 35 ? 'text-orange-500' : 'text-red-600');

    return {
      score,
      explanation: insights.explanation,
      label: scoreLabel,
      color: scoreColor,
      crisis: crisis || undefined,
      insights: insights.recommendations,
      structuralDti: this.getStructuralDTI(input)
    };
  }

  // ---------------------------------------------------
  // INSIGHTS
  // ---------------------------------------------------

  private generateInsights(
    score: number,
    nt: number,
    crisis: CrisisInfo | null,
    wnw: number,
    structuralDti: number,
    income: number,
    totalDebt: number,
    mre: number
  ) {
    const warnings: string[] = [];
    const recommendations: string[] = [];
    let explanation = '';

    // 1. DURUM (Sermaye ve Nakit)
    let statusPart = '';
    if (wnw < 0) {
      statusPart = 'Sermaye likiditeniz ekside seyrediyor';
    } else if (wnw < income * 2) {
      statusPart = 'Sermaye yapınız henüz kırılgan bir dengede';
    } else {
      statusPart = 'Sermaye yapınız ve özkaynak dengeniz güçlü';
    }

    // 2. SEBEP (Borç ve Gider Dengesi)
    let reasonPart = '';
    if (structuralDti > 1.5) {
      reasonPart = `, ancak mevcut borç yükünüz (DTI: ${structuralDti.toFixed(2)}) gelirinizin çok üzerinde bir baskı yaratıyor`;
    } else if (structuralDti > 0.7) {
      reasonPart = ', borç servis yükünüz yönetilebilir olsa da nakit akışınızı daraltıyor';
    } else if (totalDebt === 0) {
      reasonPart = ' ve borçsuz olmanın avantajıyla nakit akışınız tamamen kontrolünüzde';
    } else {
      reasonPart = ' ve taksit yükünüzü rasyonel seviyelere çekerek finansal hareket alanı kazandınız';
    }

    // 3. AKSİYON (Radar Tavsiyesi)
    let actionPart = '';
    if (nt < 1) {
      actionPart = '. Acilen nakit tamponu oluşturmaya ve gereksiz harcamaları kısıtlayarak likidite güvenliği sağlamaya odaklanmalısınız';
    } else if (structuralDti > 0.4 && totalDebt > 0) {
      actionPart = '. Şimdi oluşan bu mali gücü, en yüksek faizli kalan borçlarınızı eritmeye yönlendirerek "Borç Radarından" çıkış yapmalısınız';
    } else {
      actionPart = '. Bu stabil tabloyu koruyarak, birikimlerinizi uzun vadeli hedeflere veya pasif gelir kaynaklarına yönlendirebilirsiniz';
    }

    // 4. HİBRİT YÖNLENDİRME (CTA)
    const ctaPart = '. Daha detaylı bir çıkış planı ve senaryo simülasyonu için AI Asistan\'a danışabilirsiniz.';

    explanation = `${statusPart}${reasonPart}${actionPart}${ctaPart}`;

    if (crisis) {
      warnings.push(crisis.reason);
      recommendations.push(crisis.action);
    }

    if (nt < 1) {
      warnings.push('Nakit tamponu 1 ayın altında.');
      recommendations.push('Acil durum fonu oluşturun.');
    }

    return { explanation, warnings, recommendations };
  }
}

export const scoringEngine = new ScoringEngine();
