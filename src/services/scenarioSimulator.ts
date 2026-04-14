import type { Account, Transaction, Debt, Installment } from '@/types';
import { cashFlowEngine, type CashFlowForecast, type DailyBalance } from './cashFlowEngine';
import { scoringEngine, type ScoringInput } from './scoringEngine';

// ─── Senaryo Tipleri ────────────────────────────────────────────────
export type ScenarioType = 'debt_payoff' | 'big_purchase' | 'extra_income';

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
  params: DebtPayoffParams | BigPurchaseParams | ExtraIncomeParams;
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
    forecastDays: number = 180
  ): ScenarioResult {
    // 1) Baseline forecast (mevcut durum)
    const baselineForecast = cashFlowEngine.forecast(
      accounts,
      transactions,
      debts,
      installments,
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
    const baselineScore = this.calculateScore(accounts, transactions, debts, installments);
    const scenarioScoreValue = this.calculateScore(
      simulatedAccounts,
      simulatedTransactions,
      simulatedDebts,
      simulatedInstallments
    );

    // 5) Nakit tıkanıklığı tarihi
    const cashTightnessDate = this.findCashTightnessDate(scenarioForecastResult);

    // 6) Kâra geçiş ayı (break-even)
    const breakEvenMonth = this.findBreakEvenMonth(
      baselineForecast.dailyBalances,
      scenarioForecastResult.dailyBalances
    );

    // 7) Risk değerlendirmesi
    const riskLevel = this.assessRisk(scenarioForecastResult, scenarioScoreValue, baselineScore);

    // 8) Öneriler
    const recommendations = this.generateRecommendations(
      scenario,
      baselineForecast,
      scenarioForecastResult,
      baselineScore,
      scenarioScoreValue,
      riskLevel
    );

    // 9) Özet
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
    };
  },

  /**
   * Senaryo tipine göre sanal veri seti oluşturur
   */
  buildSimulatedData(
    scenario: Scenario,
    accounts: Account[],
    transactions: Transaction[],
    debts: Debt[],
    installments: Installment[]
  ): {
    simulatedAccounts: Account[];
    simulatedDebts: Debt[];
    simulatedInstallments: Installment[];
    simulatedTransactions: Transaction[];
    scenarioParams?: { paymentDate: Date; paymentAmount: number };
  } {
    // Deep clone ile orijinal veriyi koruyoruz
    const simulatedAccounts: Account[] = JSON.parse(JSON.stringify(accounts));
    const simulatedDebts: Debt[] = JSON.parse(JSON.stringify(debts));
    const simulatedInstallments: Installment[] = JSON.parse(JSON.stringify(installments));
    const simulatedTransactions: Transaction[] = JSON.parse(JSON.stringify(transactions));

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
    }
  },

  /**
   * Senaryo A: Borç Kapatma
   * Bakiyeden paymentAmount düşer, ilgili borcun aylık ödemesi sıfırlanır
   */
  applyDebtPayoff(
    params: DebtPayoffParams,
    accounts: Account[],
    debts: Debt[],
    installments: Installment[],
    transactions: Transaction[]
  ) {
    // Bakiyeden ödeme tutarını düş
    if (accounts.length > 0) {
      const primaryAccount = accounts.reduce((max, acc) =>
        acc.balance > max.balance ? acc : max, accounts[0]);
      primaryAccount.balance -= params.paymentAmount;
    }

    // Borcu kapat veya kısmen öde
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
      // En yüksek faizli borcu otomatik seç
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

  /**
   * Senaryo B: Büyük Alım
   * Yeni sanal taksit eklenir
   */
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

  /**
   * Senaryo C: Ek Gelir
   * Sanal gelir işlemleri eklenir
   */
  applyExtraIncome(
    params: ExtraIncomeParams,
    accounts: Account[],
    debts: Debt[],
    installments: Installment[],
    transactions: Transaction[]
  ) {
    // Geçmiş veriye ek gelir ekle (recurring pattern olarak algılanması için)
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

  /**
   * Finansal skor hesapla (scoringEngine wrapper)
   */
  calculateScore(
    accounts: Account[],
    transactions: Transaction[],
    debts: Debt[],
    installments: Installment[]
  ): number {
    const input: ScoringInput = { accounts, transactions, debts, installments };
    const result = scoringEngine.calculate(input);
    return result.score.overallScore;
  },

  /**
   * Nakit tıkanıklığı başlangıç tarihini bul
   */
  findCashTightnessDate(forecast: CashFlowForecast): Date | null {
    const tightnessDay = forecast.dailyBalances.find((db) => db.balance <= 0);
    return tightnessDay ? tightnessDay.date : null;
  },

  /**
   * Senaryo'nun baseline'ı geçtiği ayı bul (break-even)
   */
  findBreakEvenMonth(
    baseline: DailyBalance[],
    scenario: DailyBalance[]
  ): number | null {
    // Senaryo başlangıçta baseline'ın altındaysa, ne zaman üstüne çıkıyor?
    const scenarioStartsBelow = scenario.length > 0 && baseline.length > 0 &&
      scenario[0].balance < baseline[0].balance;

    if (!scenarioStartsBelow) return null;

    for (let i = 1; i < Math.min(baseline.length, scenario.length); i++) {
      if (scenario[i].balance >= baseline[i].balance) {
        return Math.ceil(i / 30); // Gün → Ay dönüşümü
      }
    }

    return null;
  },

  /**
   * Risk değerlendirmesi
   */
  assessRisk(
    forecast: CashFlowForecast,
    scenarioScore: number,
    baselineScore: number
  ): 'safe' | 'moderate' | 'risky' {
    if (forecast.tightnessSeverity === 'critical' || scenarioScore < 25) {
      return 'risky';
    }
    if (
      forecast.tightnessSeverity === 'warning' ||
      scenarioScore < baselineScore - 15 ||
      forecast.minBalance < 0
    ) {
      return 'moderate';
    }
    return 'safe';
  },

  /**
   * Kural bazlı öneriler (AI olmadan, sıfır maliyet)
   */
  generateRecommendations(
    scenario: Scenario,
    baseline: CashFlowForecast,
    scenarioResult: CashFlowForecast,
    baselineScore: number,
    scenarioScore: number,
    riskLevel: 'safe' | 'moderate' | 'risky'
  ): string[] {
    const recs: string[] = [];
    const scoreDelta = scenarioScore - baselineScore;

    if (scenario.type === 'debt_payoff') {
      const params = scenario.params as DebtPayoffParams;
      if (scoreDelta > 0) {
        recs.push(
          `Bu borç ödemesi finansal sağlık skorunu +${scoreDelta} puan artırır.`
        );
      }
      if (scenarioResult.minBalance < baseline.minBalance) {
        recs.push(
          `Dikkat: ₺${params.paymentAmount.toLocaleString('tr-TR')} ödeme sonrası nakit tamponun daralır.`
        );
      }
      if (riskLevel === 'safe') {
        recs.push('Bu hamle güvenli görünüyor. Faiz yükünden kurtularak uzun vadede tasarruf sağlarsın.');
      }
    }

    if (scenario.type === 'big_purchase') {
      const params = scenario.params as BigPurchaseParams;
      const monthlyPayment = params.purchaseAmount / params.installmentMonths;
      recs.push(
        `Aylık ₺${Math.round(monthlyPayment).toLocaleString('tr-TR')} ek taksit yükü oluşur.`
      );
      if (scenarioResult.hasCashTightness) {
        const tightnessDay = scenarioResult.dailyBalances.find((db) => db.balance <= 0);
        if (tightnessDay) {
          const dayNum = Math.ceil(
            (tightnessDay.date.getTime() - Date.now()) / (24 * 60 * 60 * 1000)
          );
          recs.push(`⚠ ${dayNum}. günde nakit tıkanıklığı riski başlıyor.`);
        }
      }
      if (riskLevel === 'risky') {
        recs.push('Bu alım mevcut taksit kapasitenizi aşıyor. Ertelemeyi düşünün.');
      }
    }

    if (scenario.type === 'extra_income') {
      const params = scenario.params as ExtraIncomeParams;
      if (scoreDelta > 0) {
        recs.push(
          `Aylık ₺${params.monthlyAmount.toLocaleString('tr-TR')} ek gelir skorunu +${scoreDelta} puan artırır.`
        );
      }
      recs.push(
        `${params.durationMonths} ay boyunca toplam ₺${(params.monthlyAmount * params.durationMonths).toLocaleString('tr-TR')} ek gelir elde edersin.`
      );
    }

    // Genel öneriler
    if (riskLevel === 'risky') {
      recs.push('Acil fon oluşturmadan bu hamleyi yapmamanı öneriyoruz.');
    }
    if (riskLevel === 'moderate') {
      recs.push('Küçük adımlarla ilerlemen daha güvenli olabilir.');
    }

    return recs;
  },

  /**
   * Aylık tasarruf farkını hesapla
   */
  calculateMonthlySavingsDelta(scenario: Scenario, debts: Debt[]): number {
    switch (scenario.type) {
      case 'debt_payoff': {
        const params = scenario.params as DebtPayoffParams;
        if (params.debtId) {
          const debt = debts.find((d) => d.id === params.debtId);
          return debt?.monthlyPayment || 0;
        }
        // Otomatik borç seçimi: toplam kapanan borç ödemeleri
        const activeDebts = debts.filter((d) => d.status === 'active')
          .sort((a, b) => b.interestRate - a.interestRate);
        let remaining = params.paymentAmount;
        let savedMonthly = 0;
        for (const debt of activeDebts) {
          if (remaining <= 0) break;
          if (remaining >= debt.remainingAmount) {
            savedMonthly += debt.monthlyPayment;
            remaining -= debt.remainingAmount;
          }
        }
        return savedMonthly;
      }
      case 'big_purchase': {
        const params = scenario.params as BigPurchaseParams;
        return -(params.purchaseAmount / params.installmentMonths);
      }
      case 'extra_income': {
        const params = scenario.params as ExtraIncomeParams;
        return params.monthlyAmount;
      }
    }
  },

  /**
   * Senaryo özet metni oluştur (Claude prompt'u için)
   */
  buildScenarioDescription(scenario: Scenario): string {
    switch (scenario.type) {
      case 'debt_payoff': {
        const p = scenario.params as DebtPayoffParams;
        return `Kullanıcı ₺${p.paymentAmount.toLocaleString('tr-TR')} tutarında borç ödeyerek bir ya da birden fazla borcunu kapatmayı planlıyor.`;
      }
      case 'big_purchase': {
        const p = scenario.params as BigPurchaseParams;
        return `Kullanıcı ₺${p.purchaseAmount.toLocaleString('tr-TR')} tutarında bir ürünü ${p.installmentMonths} taksitle almayı planlıyor (yıllık faiz: %${p.interestRate}).`;
      }
      case 'extra_income': {
        const p = scenario.params as ExtraIncomeParams;
        return `Kullanıcı ${p.durationMonths} ay boyunca aylık ₺${p.monthlyAmount.toLocaleString('tr-TR')} ek gelir elde edecek.`;
      }
    }
  },
};
