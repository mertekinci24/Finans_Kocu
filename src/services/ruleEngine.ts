import type { Transaction } from '@/types';

export interface Insight {
  type: 'warning' | 'opportunity' | 'info';
  priority: 'high' | 'medium' | 'low';
  title: string;
  message: string;
  actionableHint?: string;
}

/**
 * 8 Temel Kural Motoru — Deterministik Analiz
 * Logic Specs v2 / Master Plan bölüm 3.2'de tanımlanan kurallar
 * Sıfır API maliyeti — sadece deterministic logic
 */
export class RuleEngine {
  /**
   * Kural 1: Harcama Artışı
   * Kategori gecen aya gore >%20 artmışsa uyarı
   */
  private checkExpenseSpike(
    currentMonthByCategory: Record<string, number>,
    previousMonthByCategory: Record<string, number>,
    insights: Insight[]
  ): void {
    for (const category in currentMonthByCategory) {
      const current = currentMonthByCategory[category];
      const previous = previousMonthByCategory[category] || current;

      if (previous === 0) continue;

      const increase = ((current - previous) / previous) * 100;

      if (increase > 20) {
        insights.push({
          type: 'warning',
          priority: 'medium',
          title: `${category} harcaması sıçradı`,
          message: `${category} kategorisinde %${increase.toFixed(0)} artış — ayın başında ${previous.toLocaleString('tr-TR')}₺ idi.`,
          actionableHint: `Bu ay ${category} için bütçeni gözden geçir. Alışkanlık mı, yoksa geçici mi?`,
        });
      }
    }
  }

  /**
   * Kural 2: Negatif Bakiye Riski
   * 30 günlük tahmin eksi çıkıyorsa uyarı
   */
  private checkNegativeBalanceRisk(
    totalBalance: number,
    projectedExpenses: number,
    insights: Insight[]
  ): void {
    if (totalBalance < projectedExpenses && totalBalance < projectedExpenses * 0.1) {
      insights.push({
        type: 'warning',
        priority: 'high',
        title: 'Negatif bakiye riski',
        message: `Projeksiyona göre, 30 gün içinde bakiye eksi gidebilir. Mevcut: ${totalBalance.toLocaleString('tr-TR')}₺, Tahmin: ${projectedExpenses.toLocaleString('tr-TR')}₺`,
        actionableHint: 'Gelir bekliyorsan tarihini kontrol et. Değilse acil giderleri azalt.',
      });
    }
  }

  /**
   * Kural 3: Taksit Yükü Uyarısı
   * Taksitler gelirin >%40'i → uyarı
   */
  private checkInstallmentBurden(
    monthlyInstallments: number,
    monthlyIncome: number,
    insights: Insight[]
  ): void {
    if (monthlyIncome <= 0) return;

    const ratio = (monthlyInstallments / monthlyIncome) * 100;

    if (ratio > 40) {
      insights.push({
        type: 'warning',
        priority: 'high',
        title: 'Taksit sarmali riski',
        message: `Taksitlerin gelirin %${ratio.toFixed(0)}'ine ulaştı (Master Plan sınırı: %40).`,
        actionableHint: 'Yeni taksite gir_me. En kısa taksiti bitirerek alan aç.',
      });
    } else if (ratio > 30) {
      insights.push({
        type: 'warning',
        priority: 'medium',
        title: 'Taksit yükü yüksek',
        message: `Taksitlerin gelirin %${ratio.toFixed(0)}'i (hedef: <%30).`,
        actionableHint: 'Erken ödeme yaparak taksitlerini azalt.',
      });
    }
  }

  /**
   * Kural 4: Abonelik Tespiti
   * Tekrarlayan küçük ödemeler → "muhtemel abonelik" listele
   */
  private checkRecurringSubscriptions(
    transactions: Transaction[],
    insights: Insight[]
  ): void {
    const categoryAmounts: Record<string, { count: number; total: number; amount: number }> = {};

    transactions.forEach((t) => {
      if (t.type === 'gider' && t.amount < 500) {
        if (!categoryAmounts[t.description]) {
          categoryAmounts[t.description] = { count: 0, total: 0, amount: t.amount };
        }
        categoryAmounts[t.description].count++;
        categoryAmounts[t.description].total += t.amount;
      }
    });

    const subscriptions = Object.entries(categoryAmounts)
      .filter(([_, data]) => data.count >= 2)
      .map(([name, data]) => `${name} (${data.count}x, toplam ${data.total.toLocaleString('tr-TR')}₺)`);

    if (subscriptions.length > 0) {
      insights.push({
        type: 'info',
        priority: 'low',
        title: 'Muhtemel abonelikler tespit edildi',
        message: `${subscriptions.slice(0, 3).join(', ')}${subscriptions.length > 3 ? ` ve ${subscriptions.length - 3} tane daha` : ''}`,
        actionableHint: 'Gereksiz abonelikleri iptal etmeyi düşün. Aylık %5+ tasarruf yapabilirsin.',
      });
    }
  }

  /**
   * Kural 5: Bütçe Aşımı
   * Kategori limiti aşılmışsa anlik bildirim
   */
  private checkBudgetExceeded(
    categorySpending: Record<string, { spent: number; budget: number }>,
    insights: Insight[]
  ): void {
    Object.entries(categorySpending).forEach(([category, { spent, budget }]) => {
      if (budget > 0 && spent > budget) {
        const overage = spent - budget;
        const percent = ((spent - budget) / budget) * 100;

        insights.push({
          type: 'warning',
          priority: 'medium',
          title: `${category} bütçesi aşıldı`,
          message: `Harcama: ${spent.toLocaleString('tr-TR')}₺, Bütçe: ${budget.toLocaleString('tr-TR')}₺ (+${overage.toLocaleString('tr-TR')}₺, +%${percent.toFixed(0)})`,
        });
      }
    });
  }

  /**
   * Kural 6: Gelir Sapması
   * Beklenen gelir gelmemişse uyarı
   */
  private checkIncomeVariance(
    currentMonthIncome: number,
    previousMonthIncome: number,
    insights: Insight[]
  ): void {
    if (previousMonthIncome === 0) return;

    const variance = ((currentMonthIncome - previousMonthIncome) / previousMonthIncome) * 100;

    if (variance < -15) {
      insights.push({
        type: 'warning',
        priority: 'high',
        title: 'Gelir sapması',
        message: `Gelirin geçen aya göre %${Math.abs(variance).toFixed(0)} düştü.`,
        actionableHint: 'Ek gelir kaynağı bul veya giderleri kıs.',
      });
    }
  }

  /**
   * Kural 7: Fatura Gecikme Riski
   * Ödenmemiş fatura varsa hatırlatma
   */
  private checkBillReminders(_insights: Insight[]): void {
    // Bu kural, transactions tablosunda "status" gibi ayrı bir field gerektirir
    // Şu an basit: bills tracker altyapısı yok
    // TODO: Bills tablosu oluşturulduktan sonra etkinleştir
  }

  /**
   * Kural 8: Tasarruf Fırsatı
   * Gecen ay ortalamanın altında harcandıysa bildir
   */
  private checkSavingsOpportunity(
    currentMonthExpenses: number,
    averageMonthlyExpenses: number,
    currentMonthIncome: number,
    insights: Insight[]
  ): void {
    if (currentMonthExpenses < averageMonthlyExpenses * 0.9) {
      const potentialSavings = currentMonthIncome - currentMonthExpenses;

      if (potentialSavings > 0) {
        insights.push({
          type: 'opportunity',
          priority: 'medium',
          title: 'Tasarruf fırsatı!',
          message: `Bu ay normalden %${((1 - currentMonthExpenses / averageMonthlyExpenses) * 100).toFixed(0)} az harcadın. Potansiyel tasarruf: ${potentialSavings.toLocaleString('tr-TR')}₺`,
          actionableHint: 'Bu kazancı birikit veya borç öde.',
        });
      }
    }
  }

  /**
   * Ana execute fonksiyonu
   */
  execute(
    transactions: Transaction[],
    monthlyIncome: number,
    monthlyExpenses: number,
    totalBalance: number,
    monthlyInstallments: number,
    categorySpending?: Record<string, { spent: number; budget: number }>
  ): Insight[] {
    const insights: Insight[] = [];

    // Son 30 gün filtreleme
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    const currentMonthTransactions = transactions.filter((t) => new Date(t.date) >= thirtyDaysAgo);
    const previousMonthTransactions = transactions.filter(
      (t) => new Date(t.date) >= sixtyDaysAgo && new Date(t.date) < thirtyDaysAgo
    );

    // Kategori bazlı analiz
    const currentByCategory: Record<string, number> = {};
    const previousByCategory: Record<string, number> = {};

    currentMonthTransactions.forEach((t) => {
      if (t.type === 'gider') {
        currentByCategory[t.category] = (currentByCategory[t.category] || 0) + t.amount;
      }
    });

    previousMonthTransactions.forEach((t) => {
      if (t.type === 'gider') {
        previousByCategory[t.category] = (previousByCategory[t.category] || 0) + t.amount;
      }
    });

    // Kural 1: Harcama Artışı
    this.checkExpenseSpike(currentByCategory, previousByCategory, insights);

    // Kural 2: Negatif Bakiye Riski
    this.checkNegativeBalanceRisk(totalBalance, monthlyExpenses, insights);

    // Kural 3: Taksit Yükü
    this.checkInstallmentBurden(monthlyInstallments, monthlyIncome, insights);

    // Kural 4: Abonelik Tespiti
    this.checkRecurringSubscriptions(currentMonthTransactions, insights);

    // Kural 5: Bütçe Aşımı
    if (categorySpending) {
      this.checkBudgetExceeded(categorySpending, insights);
    }

    // Kural 6: Gelir Sapması
    const previousMonthIncome = previousMonthTransactions
      .filter((t) => t.type === 'gelir')
      .reduce((sum, t) => sum + t.amount, 0);
    this.checkIncomeVariance(monthlyIncome, previousMonthIncome, insights);

    // Kural 7: Fatura Gecikme Riski (TODO)
    this.checkBillReminders(insights);

    // Kural 8: Tasarruf Fırsatı
    const allTransactions = transactions.filter((t) => new Date(t.date) >= sixtyDaysAgo);
    const previousExpenses = allTransactions
      .filter(
        (t) => t.type === 'gider' &&
          new Date(t.date) >= new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000) &&
          new Date(t.date) < thirtyDaysAgo
      )
      .reduce((sum, t) => sum + t.amount, 0);
    const twoMonthsAvgExpense = (monthlyExpenses + previousExpenses) / 2;
    this.checkSavingsOpportunity(monthlyExpenses, twoMonthsAvgExpense, monthlyIncome, insights);

    // Önceliğe göre sırala
    return insights.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      const typeOrder = { warning: 0, opportunity: 1, info: 2 };
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return typeOrder[a.type] - typeOrder[b.type];
    });
  }
}

export const ruleEngine = new RuleEngine();
