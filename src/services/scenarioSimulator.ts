import type { Account, Transaction, Debt, Installment, RecurringFlow } from '@/types';
import { cashFlowEngine, type CashFlowForecast, type DailyBalance } from './cashFlowEngine';
import { scoringEngine, type ScoringInput } from './scoringEngine';

// ─── Senaryo Tipleri ────────────────────────────────────────────────
export type ScenarioType = 'debt_payoff' | 'big_purchase' | 'extra_income' | 'debt_restructuring';

export interface DebtRestructuringParams {
  installmentId?: string;
  mode: 'postpone' | 'restructure';
  monthsToPostpone?: number;
  newMonthlyPayment?: number;
  newTotalMonths?: number;
  newInterestRate?: number;
}

export interface DebtPayoffParams {
  debtId?: string;
  paymentAmount: number;
  paymentDate: Date;
}

export interface BigPurchaseParams {
  purchaseAmount: number;
  installmentMonths: number;
  interestRate: number;
}

export interface ExtraIncomeParams {
  monthlyAmount: number;
  durationMonths: number;
  startDate: Date;
}

export interface Scenario {
  type: ScenarioType;
  label: string;
  params: DebtPayoffParams | BigPurchaseParams | ExtraIncomeParams | DebtRestructuringParams;
}

// ─── Simülasyon Sonucu ──────────────────────────────────────────────
export interface ScenarioResult {
  scenario: Scenario;
  baselineForecast: DailyBalance[];
  scenarioForecast: DailyBalance[];
  baselineScore: number;
  scenarioScore: number;
  scoreDelta: number;
  cashTightnessDate: Date | null;
  breakEvenMonth: number | null;
  recommendations: string[];
  riskLevel: 'safe' | 'moderate' | 'risky';
  summary: ScenarioSummary;
  fullScore?: any; // Simplified for robustness
}

export interface ScenarioSummary {
  baselineEndBalance: number;
  scenarioEndBalance: number;
  baselineMinBalance: number;
  scenarioMinBalance: number;
  monthlySavingsDelta: number;
}

// ─── Senaryo Açıklamaları (Türkçe) ─────────────────────────────────
export const SCENARIO_LABELS: Record<ScenarioType, { title: string; description: string; icon: string }> = {
  debt_payoff: {
    title: 'Borç Kapatma',
    description: 'Elimdeki nakit ile bir borcu kapatırsam ne olur?',
    icon: '💸',
  },
  big_purchase: {
    title: 'Büyük Alım',
    description: 'Taksitli bir ürün alırsam nakit akışım nasıl etkilenir?',
    icon: '🛒',
  },
  extra_income: {
    title: 'Ek Gelir',
    description: 'Ek bir gelir kaynağı eklersem finansal durumum nasıl değişir?',
    icon: '💰',
  },
  debt_restructuring: {
    title: 'Borç Yapılandırma',
    description: 'Büyük ödemeleri ileri tarihe ötelersem krizden çıkar mıyım?',
    icon: '⏳',
  },
};

// ─── Simülatör Motoru ───────────────────────────────────────────────
export const scenarioSimulator = {
  /**
   * Ana simülasyon fonksiyonu
   * Gerçek DB'ye dokunmaz — sanal veri üzerinde çalışır
   */
  simulate(
    scenario: Scenario,
    accounts: Account[],
    transactions: Transaction[],
    debts: Debt[],
    installments: Installment[],
    recurringFlows: RecurringFlow[] = [],
    forecastDays: number = 180
  ): ScenarioResult {
    // 1) Baseline forecast (mevcut durum)
    const baselineForecast = cashFlowEngine.forecast(
      accounts,
      transactions,
      debts,
      installments,
      recurringFlows,
      undefined,
      forecastDays
    );

    // 2) Senaryo tipine göre sanal veri oluştur
    const {
      simulatedAccounts,
      simulatedDebts,
      simulatedInstallments,
      simulatedTransactions,
      scenarioParams,
    } = this.buildSimulatedData(scenario, accounts, transactions, debts, installments);

    // 3) Senaryo forecast
    const scenarioForecastResult = cashFlowEngine.forecast(
      simulatedAccounts,
      simulatedTransactions,
      simulatedDebts,
      simulatedInstallments,
      scenarioParams,
      forecastDays
    );

    // 4) Skor hesaplaması (baseline vs senaryo)
    const baselineDetailedScore = this.calculateDetailedScore(accounts, transactions, debts, installments, recurringFlows, false);
    const scenarioDetailedScore = this.calculateDetailedScore(
      simulatedAccounts,
      simulatedTransactions,
      simulatedDebts,
      simulatedInstallments,
      recurringFlows,
      true,
      scenario.type
    );

    const income = (scoringEngine as any).getIncome({ transactions, recurringFlows });
    
    const baselineMRE = cashFlowEngine.calculateMonthlyRequiredExpenses(transactions, installments, debts, recurringFlows);
    const scenarioMRE = cashFlowEngine.calculateMonthlyRequiredExpenses(simulatedTransactions, simulatedDebts, simulatedInstallments, recurringFlows);

    const baselineScore = baselineDetailedScore.score.overallScore;
    const scenarioScoreValue = scenarioDetailedScore.score.overallScore;

    const cashTightnessDate = this.findCashTightnessDate(scenarioForecastResult);

    const breakEvenMonth = this.findBreakEvenMonth(
      baselineForecast.dailyBalances,
      scenarioForecastResult.dailyBalances
    );

    const riskLevel = this.assessRisk(scenarioForecastResult, scenarioScoreValue, baselineScore);

    const recommendations = this.generateRecommendations(
      scenario,
      baselineForecast,
      scenarioForecastResult,
      baselineScore,
      scenarioScoreValue,
      riskLevel,
      income,
      baselineMRE,
      scenarioMRE,
      baselineDetailedScore.structuralDti,
      scenarioDetailedScore.structuralDti
    );

    const summary: ScenarioSummary = {
      baselineEndBalance: baselineForecast.projectedEndBalance,
      scenarioEndBalance: scenarioForecastResult.projectedEndBalance,
      baselineMinBalance: baselineForecast.minBalance,
      scenarioMinBalance: scenarioForecastResult.minBalance,
      monthlySavingsDelta: this.calculateMonthlySavingsDelta(scenario, debts),
    };



    return {
      scenario,
      baselineForecast: baselineForecast.dailyBalances,
      scenarioForecast: scenarioForecastResult.dailyBalances,
      baselineScore,
      scenarioScore: scenarioScoreValue,
      scoreDelta: scenarioScoreValue - baselineScore,
      cashTightnessDate,
      breakEvenMonth,
      recommendations,
      riskLevel,
      summary,
      fullScore: scenarioDetailedScore,
    };
  },

  buildSimulatedData(
    scenario: Scenario,
    accounts: Account[],
    transactions: Transaction[],
    debts: Debt[],
    installments: Installment[]
  ) {
    const simulatedAccounts: Account[] = JSON.parse(JSON.stringify(accounts || []));
    const simulatedTransactions: Transaction[] = JSON.parse(JSON.stringify(transactions || []));
    const simulatedDebts: Debt[] = JSON.parse(JSON.stringify(debts || []));
    const simulatedInstallments: Installment[] = JSON.parse(JSON.stringify(installments || []));

    let scenarioParams = undefined;

    switch (scenario.type) {
      case 'debt_payoff':
        return this.applyDebtPayoff(
          scenario.params as DebtPayoffParams,
          simulatedAccounts,
          simulatedDebts,
          simulatedInstallments,
          simulatedTransactions
        );
      case 'big_purchase':
        return this.applyBigPurchase(
          scenario.params as BigPurchaseParams,
          simulatedAccounts,
          simulatedDebts,
          simulatedInstallments,
          simulatedTransactions
        );
      case 'extra_income':
        return this.applyExtraIncome(
          scenario.params as ExtraIncomeParams,
          simulatedAccounts,
          simulatedDebts,
          simulatedInstallments,
          simulatedTransactions
        );
      case 'debt_restructuring':
        return this.applyDebtRestructuring(
          scenario.params as DebtRestructuringParams,
          simulatedAccounts,
          simulatedDebts,
          simulatedInstallments,
          simulatedTransactions
        );
      default:
        return {
          simulatedAccounts,
          simulatedDebts,
          simulatedInstallments,
          simulatedTransactions,
          scenarioParams
        };
    }
  },

  applyDebtPayoff(
    params: DebtPayoffParams,
    accounts: Account[],
    debts: Debt[],
    installments: Installment[],
    transactions: Transaction[]
  ) {
    if (accounts.length > 0) {
      const primaryAccount = accounts.reduce((max, acc) =>
        acc.balance > max.balance ? acc : max, accounts[0]);
      primaryAccount.balance -= params.paymentAmount;
    }

    if (params.debtId) {
      const targetDebt = debts.find((d) => d.id === params.debtId);
      if (targetDebt) {
        targetDebt.remainingAmount = Math.max(0, targetDebt.remainingAmount - params.paymentAmount);
        if (targetDebt.remainingAmount <= 0) {
          targetDebt.status = 'paid_off';
          targetDebt.monthlyPayment = 0;
        }
      }
    } else {
      const activeDebts = debts
        .filter((d) => d.status === 'active')
        .sort((a, b) => b.interestRate - a.interestRate);

      let remaining = params.paymentAmount;
      for (const debt of activeDebts) {
        if (remaining <= 0) break;
        const payment = Math.min(remaining, debt.remainingAmount);
        debt.remainingAmount -= payment;
        remaining -= payment;
        if (debt.remainingAmount <= 0) {
          debt.status = 'paid_off';
          debt.monthlyPayment = 0;
        }
      }
    }

    return {
      simulatedAccounts: accounts,
      simulatedDebts: debts,
      simulatedInstallments: installments,
      simulatedTransactions: transactions,
      scenarioParams: {
        paymentDate: params.paymentDate,
        paymentAmount: params.paymentAmount,
      },
    };
  },

  applyBigPurchase(
    params: BigPurchaseParams,
    accounts: Account[],
    debts: Debt[],
    installments: Installment[],
    transactions: Transaction[]
  ) {
    const monthlyRate = params.interestRate / 100 / 12;
    const monthlyPayment = monthlyRate > 0
      ? (params.purchaseAmount * monthlyRate * Math.pow(1 + monthlyRate, params.installmentMonths)) /
        (Math.pow(1 + monthlyRate, params.installmentMonths) - 1)
      : params.purchaseAmount / params.installmentMonths;

    const virtualInstallment: Installment = {
      id: 'scenario-virtual-installment',
      userId: accounts[0]?.userId || '',
      lenderName: 'Senaryo: Yeni Alım',
      principal: params.purchaseAmount,
      monthlyPayment: Math.round(monthlyPayment),
      remainingMonths: params.installmentMonths,
      totalMonths: params.installmentMonths,
      interestRate: params.interestRate,
      nextPaymentDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      status: 'active',
      createdAt: new Date(),
    };

    installments.push(virtualInstallment);

    return {
      simulatedAccounts: accounts,
      simulatedDebts: debts,
      simulatedInstallments: installments,
      simulatedTransactions: transactions,
    };
  },

  applyExtraIncome(
    params: ExtraIncomeParams,
    accounts: Account[],
    debts: Debt[],
    installments: Installment[],
    transactions: Transaction[]
  ) {
    for (let i = 0; i < Math.min(params.durationMonths, 3); i++) {
      const txDate = new Date(params.startDate);
      txDate.setMonth(txDate.getMonth() - i);

      const virtualTransaction: Transaction = {
        id: `scenario-extra-income-${i}`,
        accountId: accounts[0]?.id || '',
        amount: params.monthlyAmount,
        description: 'Senaryo: Ek Gelir',
        category: 'Gelir',
        date: txDate,
        type: 'gelir',
        createdAt: new Date(),
      };

      transactions.push(virtualTransaction);
    }

    return {
      simulatedAccounts: accounts,
      simulatedDebts: debts,
      simulatedInstallments: installments,
      simulatedTransactions: transactions,
    };
  },

  applyDebtRestructuring(
    params: DebtRestructuringParams,
    accounts: Account[],
    debts: Debt[],
    installments: Installment[],
    transactions: Transaction[]
  ) {
    let target = installments.find(i => i.id === params.installmentId);
    
    if (!target) {
      target = installments.find(i => 
        i.lenderName.toLowerCase().includes('gecikme') || 
        Math.abs(i.monthlyPayment - 100000) < 5000
      );
    }

    if (!target) {
      target = [...installments].sort((a,b) => b.monthlyPayment - a.monthlyPayment)[0];
    }

    if (target) {
      if (params.mode === 'postpone') {
        const monthsToAdd = params.monthsToPostpone || 3;
        const targetDate = new Date(target.firstPaymentDate || Date.now());
        targetDate.setMonth(targetDate.getMonth() + monthsToAdd);
        target.firstPaymentDate = targetDate;
        target.lenderName += ' (ÖTELENDİ)';
      } else {
        if (params.newMonthlyPayment !== undefined) {
          target.monthlyPayment = params.newMonthlyPayment;
        }
        if (params.newTotalMonths !== undefined) {
          target.totalMonths = params.newTotalMonths;
          target.remainingMonths = params.newTotalMonths;
        }
        if (params.newInterestRate !== undefined) {
          target.interestRate = params.newInterestRate;
          const interestMultiplier = 1 + (params.newInterestRate / 100);
          target.principal = Math.round(target.principal * interestMultiplier);
        }
        target.lenderName += ' (YAPILANDIRILDI)';
      }
    }

    return {
      simulatedAccounts: accounts,
      simulatedDebts: debts,
      simulatedInstallments: installments,
      simulatedTransactions: transactions,
    };
  },

  calculateDetailedScore(
    accounts: Account[],
    transactions: Transaction[],
    debts: Debt[],
    installments: Installment[],
    recurringFlows: RecurringFlow[] = [],
    isSimulation: boolean = true,
    scenarioType?: string
  ) {
    const input: ScoringInput = { 
      accounts, 
      transactions, 
      debts, 
      installments, 
      recurringFlows,
      isSimulation, 
      scenarioType 
    };
    return scoringEngine.calculate(input);
  },

  findCashTightnessDate(forecast: CashFlowForecast): Date | null {
    const tightnessDay = forecast.dailyBalances.find((db) => db.balance <= 0);
    return tightnessDay ? tightnessDay.date : null;
  },

  findBreakEvenMonth(
    baseline: DailyBalance[],
    scenario: DailyBalance[]
  ): number | null {
    const scenarioStartsBelow = scenario.length > 0 && baseline.length > 0 &&
      scenario[0].balance < baseline[0].balance;

    if (!scenarioStartsBelow) return null;

    for (let i = 1; i < Math.min(baseline.length, scenario.length); i++) {
      if (scenario[i].balance >= baseline[i].balance) {
        return Math.ceil(i / 30);
      }
    }
    return null;
  },

  assessRisk(
    forecast: CashFlowForecast,
    scenarioScore: number,
    baselineScore: number
  ): 'safe' | 'moderate' | 'risky' {
    if (scenarioScore < 25 || (forecast.minBalance < 0 && forecast.tightnessSeverity === 'critical')) {
      return 'risky';
    }
    if (forecast.minBalance < 0 || scenarioScore < 45) {
      return 'moderate';
    }
    return 'safe';
  },

  generateRecommendations(
    scenario: Scenario,
    baselineForecast: CashFlowForecast,
    scenarioForecast: CashFlowForecast,
    baselineScore: number,
    scenarioScore: number,
    riskLevel: string,
    income: number,
    oldMRE: number,
    newMRE: number,
    baselineDti: number,
    scenarioDti: number
  ): string[] {
    const fmt = (n: number) => `₺${Math.abs(n).toLocaleString('tr-TR', { maximumFractionDigits: 0 })}`;
    const minBal = scenarioForecast.minBalance;
    const tightnessDate = scenarioForecast.dailyBalances.find(db => db.balance <= 0)?.date;
    const dateStr = tightnessDate ? new Date(tightnessDate).toLocaleDateString('tr-TR', { day: '2-digit', month: 'long' }) : "";

    let coachMessage = "";

    if (scenario.type === 'debt_restructuring') {
      const dtiRatio = (scenarioDti * 100).toFixed(0);
      const isDtiMuchBetter = baselineDti > scenarioDti + 0.3; // Threshold for significant improvement

      if (minBal < 0) {
        coachMessage = `NAKİT AKIŞI UYARISI: ${dateStr ? dateStr + ' civarında' : 'Önümüzdeki günlerde'} bakiyeniz geçici olarak eksiye (${fmt(minBal)}) düşecek. `;
        
        if (isDtiMuchBetter) {
          coachMessage += `ANCAK, yapısal borç yükünüz (DTI) %${dtiRatio} seviyesine gerileyerek stratejik bir iyileşme göstermiştir. Bu kısa vadeli nakit açığını yönetmek, iflas riskini kalıcı olarak azaltacaktır.`;
        } else {
          coachMessage += `Yapısal borç yükünüz (%${dtiRatio}) hala yüksek. Bu yapılandırma nakit krizini çözmeye yetmeyebilir.`;
        }
      } else {
        coachMessage = `STRATEJİK ZAFER: Bu yapılandırma ile borç yükünüzü %${(baselineDti * 100).toFixed(0)}'den %${dtiRatio}'ye düşürdünüz. Skorunuzun ${scenarioScore} puanına çıkması, finansal özgürlük rotasına girdiğinizi teyit ediyor.`;
      }
    } else if (scenario.type === 'debt_payoff') {
      coachMessage = `Borç kapatma hamlesi aylık zorunlu giderlerinizi ${fmt(oldMRE)} seviyesinden ${fmt(newMRE)} seviyesine çekerek kalıcı bir nakit koridoru yaratıyor.`;
    } else if (scenario.type === 'big_purchase') {
      if (minBal < 0) {
        coachMessage = `RİSK UYARISI: Bu alım sonrası ${dateStr} tarihinde nakit akışınız kilitleniyor. Taksit yükü gelirinizin %${(newMRE/income*100).toFixed(0)} seviyesine çıkarak bütçenizi zorlayabilir.`;
      } else {
        coachMessage = `Bu yatırım, aylık ${fmt(newMRE)} taksit yüküne rağmen nakit akışınız tarafından karşılanabilir görünüyor.`;
      }
    } else {
       coachMessage = `Bu plan finansal dengenizde skor bazlı bir iyileşme sağlıyor. Aylık yükünüz artık ${fmt(newMRE)}.`;
    }

    return [coachMessage, ...scenarioForecast.recommendations.slice(0, 1)];
  },

  calculateMonthlySavingsDelta(scenario: Scenario, debts: Debt[]): number {
    switch (scenario.type) {
      case 'debt_payoff': {
        const params = scenario.params as DebtPayoffParams;
        if (params.debtId) {
          const debt = debts.find((d) => d.id === params.debtId);
          return debt?.monthlyPayment || 0;
        }
        return 0;
      }
      case 'big_purchase': {
        const params = scenario.params as BigPurchaseParams;
        return -(params.purchaseAmount / params.installmentMonths);
      }
      case 'extra_income': {
        const params = scenario.params as ExtraIncomeParams;
        return params.monthlyAmount;
      }
      default:
        return 0;
    }
  },

  buildScenarioDescription(scenario: Scenario): string {
    return 'Senaryo analizi.';
  },
};
