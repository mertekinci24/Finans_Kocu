import type { Account, Transaction, Debt, Installment, FinancialScore } from '@/types';

export interface ScoringInput {
  accounts: Account[];
  transactions: Transaction[];
  debts: Debt[];
  installments: Installment[];
}

export interface DetailedScore {
  score: FinancialScore;
  explanation: string;
  warnings: string[];
  recommendations: string[];
}

const CRISIS_THRESHOLD = 24;

export class ScoringEngine {
  /**
   * Güven Skoru (C): Girilen veri tamlığını ölçer (0.0 - 1.0)
   * C = (Girilen Kalemler / Beklenen Temel Kalemler)
   */
  private calculateConfidenceScore(input: ScoringInput): number {
    const expectedItems = 4;
    let actualItems = 0;

    if (input.accounts.length > 0) actualItems++;
    if (input.transactions.length > 0) actualItems++;
    if (input.debts.length > 0) actualItems++;
    if (input.installments.length > 0) actualItems++;

    return Math.min(1.0, actualItems / expectedItems);
  }

  /**
   * Borç/Gelir Oranı (0-100)
   * Ay aylık borç ödemeleri / aylık gelir
   * Hedef: < %35 (Güvenli)
   */
  private calculateDebtToIncomeRatio(
    monthlyDebtPayments: number,
    monthlyIncome: number
  ): { value: number; score: number } {
    if (monthlyIncome <= 0) return { value: 0, score: 100 };

    const ratio = (monthlyDebtPayments / monthlyIncome) * 100;
    let score = 100;

    if (ratio > 50) score = 20;
    else if (ratio > 40) score = 30;
    else if (ratio > 35) score = 50;
    else if (ratio > 25) score = 75;
    else score = 100;

    return { value: ratio, score };
  }

  /**
   * Nakit Tamponu (ay cinsinden)
   * Acil fon / Aylık giderler
   * Hedef: 3 ay
   */
  private calculateCashBuffer(
    accounts: Account[],
    monthlyExpenses: number
  ): { months: number; score: number } {
    const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0);

    if (monthlyExpenses <= 0) {
      return { months: 0, score: 50 };
    }

    const bufferMonths = totalBalance / monthlyExpenses;
    let score = 0;

    if (bufferMonths >= 6) score = 100;
    else if (bufferMonths >= 3) score = 100;
    else if (bufferMonths >= 1.5) score = 75;
    else if (bufferMonths > 0) score = 50;
    else score = 0;

    return { months: bufferMonths, score };
  }

  /**
   * Tasarruf Oranı (%)
   * (Gelir - Gider) / Gelir (son 30 gün)
   * Hedef: > %20
   */
  private calculateSavingsRate(
    monthlyIncome: number,
    monthlyExpenses: number
  ): { rate: number; score: number } {
    if (monthlyIncome <= 0) {
      return { rate: 0, score: 0 };
    }

    const rate = ((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100;
    let score = 0;

    if (rate >= 30) score = 100;
    else if (rate >= 20) score = 100;
    else if (rate >= 10) score = 75;
    else if (rate > 0) score = 50;
    else if (rate >= -10) score = 25;
    else score = 0;

    return { rate: Math.max(0, rate), score };
  }

  /**
   * Taksit/Gelir Oranı (%)
   * Aylık taksit yükü / aylık gelir
   * Hedef: < %30
   */
  private calculateInstallmentBurdenRatio(
    monthlyInstallments: number,
    monthlyIncome: number
  ): { ratio: number; score: number } {
    if (monthlyIncome <= 0) return { ratio: 0, score: 100 };

    const ratio = (monthlyInstallments / monthlyIncome) * 100;
    let score = 0;

    if (ratio > 50) score = 0;
    else if (ratio > 40) score = 20;
    else if (ratio > 30) score = 50;
    else if (ratio > 20) score = 75;
    else score = 100;

    return { ratio, score };
  }

  /**
   * Temel Skor Hesaplaması
   * S_base = (0.25 × Borç/Gelir) + (0.20 × Nakit) + (0.20 × Tasarruf)
   *          + (0.15 × Taksit/Gelir) + (0.20 × Diğer)
   */
  private calculateBaseScore(
    debtToIncomeScore: number,
    cashBufferScore: number,
    savingsScore: number,
    installmentBurdenScore: number,
    billDisciplineScore: number
  ): number {
    return (
      0.25 * debtToIncomeScore +
      0.2 * cashBufferScore +
      0.2 * savingsScore +
      0.15 * installmentBurdenScore +
      0.2 * billDisciplineScore
    );
  }

  /**
   * Fatura Disiplini (%)
   * Gecikme geçmişi ve ödeme zamanında yapma oranı
   * Şu an basit: perfect = 100
   */
  private calculateBillDiscipline(): number {
    return 100;
  }

  /**
   * Kritik Risk Kontrolü (Red Flags)
   * Aşağıdakilerden birinin gerçekleşmesi durumunda skoru max 24'e sabitler
   */
  private checkCriticalRisks(
    monthlyExpenses: number,
    monthlyDebtPayments: number,
    monthlyInstallments: number,
    monthlyIncome: number,
    accounts: Account[],
    debts: Debt[]
  ): { isCritical: boolean; flags: string[] } {
    const flags: string[] = [];

    // Risk 1: Nakit Tıkanıklığı
    if (monthlyIncome < monthlyExpenses + monthlyDebtPayments + monthlyInstallments) {
      flags.push('Nakit Tıkanıklığı');
    }

    // Risk 2: Taksit Sarmali
    const installmentRatio = monthlyIncome > 0
      ? (monthlyInstallments / monthlyIncome) * 100
      : 0;
    if (installmentRatio > 40) {
      flags.push('Taksit Sarmali Risk');
    }

    // Risk 3: Gecikmiş Borç
    const hasOverdueDebt = debts.some((d) => d.status === 'overdue');
    if (hasOverdueDebt) {
      flags.push('Gecikmiş Borç Var');
    }

    // Risk 4: Negatif Bakiye
    const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0);
    if (totalBalance < 0) {
      flags.push('Negatif Bakiye');
    }

    return {
      isCritical: flags.length > 0,
      flags,
    };
  }

  /**
   * Ana Hesaplama Fonksiyonu
   */
  calculate(input: ScoringInput): DetailedScore {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Son 30 gün işlemleri filtrele
    const recentTransactions = input.transactions.filter(
      (t) => new Date(t.date) >= thirtyDaysAgo
    );

    // Aylık gelir ve gider hesapla
    const monthlyIncome = recentTransactions
      .filter((t) => t.type === 'gelir')
      .reduce((sum, t) => sum + t.amount, 0);

    const monthlyExpenses = recentTransactions
      .filter((t) => t.type === 'gider')
      .reduce((sum, t) => sum + t.amount, 0);

    // Aylık borç ve taksit ödemeleri
    const monthlyDebtPayments = input.debts
      .filter((d) => d.status === 'active')
      .reduce((sum, d) => sum + d.monthlyPayment, 0);

    const monthlyInstallments = input.installments
      .filter((i) => i.status === 'active')
      .reduce((sum, i) => sum + i.monthlyPayment, 0);

    // Alt skorları hesapla
    const confidenceScore = this.calculateConfidenceScore(input);
    const debtToIncome = this.calculateDebtToIncomeRatio(
      monthlyDebtPayments,
      monthlyIncome
    );
    const cashBuffer = this.calculateCashBuffer(input.accounts, monthlyExpenses);
    const savingsRate = this.calculateSavingsRate(monthlyIncome, monthlyExpenses);
    const installmentBurden = this.calculateInstallmentBurdenRatio(
      monthlyInstallments,
      monthlyIncome
    );
    const billDiscipline = this.calculateBillDiscipline();

    // Temel skor
    const baseScore = this.calculateBaseScore(
      debtToIncome.score,
      cashBuffer.score,
      savingsRate.score,
      installmentBurden.score,
      billDiscipline
    );

    // Kritik risk kontrolü
    const criticalRisks = this.checkCriticalRisks(
      monthlyExpenses,
      monthlyDebtPayments,
      monthlyInstallments,
      monthlyIncome,
      input.accounts,
      input.debts
    );

    // Final skor hesaplaması
    let finalScore = baseScore * confidenceScore;

    if (criticalRisks.isCritical) {
      finalScore = Math.min(CRISIS_THRESHOLD, finalScore);
    }

    finalScore = Math.max(0, Math.min(100, finalScore));

    // Açıklamalar ve öneriler
    const { explanation, warnings, recommendations } = this.generateInsights(
      finalScore,
      debtToIncome.value,
      cashBuffer.months,
      savingsRate.rate,
      installmentBurden.ratio,
      monthlyIncome,
      monthlyExpenses,
      criticalRisks
    );

    const score: FinancialScore = {
      overallScore: Math.round(finalScore),
      confidenceScore: Math.round(confidenceScore * 100),
      debtToIncomeRatio: Math.round(debtToIncome.value * 10) / 10,
      cashBufferMonths: Math.round(cashBuffer.months * 10) / 10,
      savingsRate: Math.round(savingsRate.rate * 10) / 10,
      installmentBurdenRatio: Math.round(installmentBurden.ratio * 10) / 10,
      lastCalculatedAt: now,
    };

    return {
      score,
      explanation,
      warnings,
      recommendations,
    };
  }

  /**
   * Koç Açıklamaları ve Önerileri
   */
  private generateInsights(
    finalScore: number,
    debtToIncome: number,
    cashBufferMonths: number,
    savingsRate: number,
    installmentBurden: number,
    monthlyIncome: number,
    _monthlyExpenses: number,
    criticalRisks: { isCritical: boolean; flags: string[] }
  ): { explanation: string; warnings: string[]; recommendations: string[] } {
    const warnings: string[] = [];
    const recommendations: string[] = [];
    let explanation = '';

    // Eksiklik tamlığına göre uyarı
    if (monthlyIncome === 0) {
      explanation = 'Gelirinizi ekleyin — finansal analiz yapmak için temel veri gerekli.';
      warnings.push('Eksik veri: Gelir bilgisi yok');
      return { explanation, warnings, recommendations };
    }

    // Kritik risk
    if (criticalRisks.isCritical) {
      explanation = `KRİZ MODU: ${criticalRisks.flags.join(', ')} — Acil eylem gerekli!`;
      warnings.push(`Kritik Riskler: ${criticalRisks.flags.join(', ')}`);
      recommendations.push('Hemen bir finansal danışmanla görüş');
      recommendations.push('Zorunlu giderleri gözden geçir');
      recommendations.push('Taksit alma planını durdur');
      return { explanation, warnings, recommendations };
    }

    // Borç/Gelir riski
    if (debtToIncome > 35) {
      warnings.push(`Borç/Gelir Riski: %${debtToIncome.toFixed(1)} (Eşik: %35)`);
      recommendations.push(
        'En yüksek faizli borcu öncelikle kapat'
      );
    }

    // Nakit tamponu
    if (cashBufferMonths < 1) {
      warnings.push(`Çok düşük nakit tamponu: ${cashBufferMonths.toFixed(1)} ay`);
      recommendations.push('Acil fon biriktirmeye odaklan — hedef 3 ay');
    } else if (cashBufferMonths < 3) {
      warnings.push(`Nakit tamponu yetersiz: ${cashBufferMonths.toFixed(1)} ay`);
      recommendations.push('Nakit tamponu hedefi 3 aya çıkar');
    }

    // Tasarruf oranı
    if (savingsRate < 0) {
      warnings.push(`Negatif tasarruf: %${savingsRate.toFixed(1)}`);
      recommendations.push('Giderlerin gelir üstüne çıkması durumu — bütçe gözden geçir');
    } else if (savingsRate < 10) {
      warnings.push(`Düşük tasarruf oranı: %${savingsRate.toFixed(1)}`);
      recommendations.push('Tasarruf hedefi %20+ (gelirin 1/5\'i)');
    }

    // Taksit yükü
    if (installmentBurden > 30) {
      warnings.push(`Yüksek taksit yükü: %${installmentBurden.toFixed(1)}`);
      recommendations.push('Yeni taksite girme — mevcut taksitleri önce kapat');
    }

    // Genel duruma göre açıklama
    if (finalScore >= 80) {
      explanation = 'Mükemmel! Finansal durumun çok iyi. Bu tempoyu koru.';
    } else if (finalScore >= 60) {
      explanation = 'İyi durumdaysın, ama ufak iyileştirmeler yapılabilir.';
    } else if (finalScore >= 40) {
      explanation = 'Orta düzeyde risk var. Önerileri uygula.';
    } else if (finalScore >= 20) {
      explanation = 'Dikkat! Finansal durumda ciddi sorunlar var.';
    } else {
      explanation = 'KRİZ! Acil müdahale gerekli.';
    }

    return { explanation, warnings, recommendations };
  }
}

export const scoringEngine = new ScoringEngine();
