import { Account, Transaction, Debt, Installment } from '@/types';

export interface DailyBalance {
  date: Date;
  balance: number;
  netIncome: number;
  netExpense: number;
  description: string;
}

export interface CashFlowForecast {
  startDate: Date;
  endDate: Date;
  dailyBalances: DailyBalance[];
  projectedEndBalance: number;
  minBalance: number;
  minBalanceDate: Date;
  hasCashTightness: boolean;
  tightnessSeverity: 'none' | 'warning' | 'critical';
  recommendations: string[];
}

interface RecurringItem {
  name: string;
  amount: number;
  dayOfMonth: number;
  type: 'income' | 'expense';
}

export const cashFlowEngine = {
  /**
   * Analyzes historical transactions to identify recurring items
   */
  identifyRecurringItems(transactions: Transaction[]): RecurringItem[] {
    const itemMap = new Map<string, { amounts: number[]; dayOfMonths: number[] }>();

    transactions.forEach((tx) => {
      const key = `${tx.description}_${tx.type}`;
      const date = new Date(tx.date);
      const dayOfMonth = date.getDate();

      if (!itemMap.has(key)) {
        itemMap.set(key, { amounts: [], dayOfMonths: [] });
      }

      const item = itemMap.get(key)!;
      item.amounts.push(tx.amount);
      item.dayOfMonths.push(dayOfMonth);
    });

    const recurring: RecurringItem[] = [];

    itemMap.forEach((value, key) => {
      const [description, type] = key.split('_');

      const avgAmount = value.amounts.reduce((a, b) => a + b, 0) / value.amounts.length;
      const medianDay = value.dayOfMonths.sort((a, b) => a - b)[
        Math.floor(value.dayOfMonths.length / 2)
      ];

      if (value.amounts.length >= 2) {
        recurring.push({
          name: description,
          amount: Math.round(avgAmount),
          dayOfMonth: medianDay,
          type: type as 'income' | 'expense',
        });
      }
    });

    return recurring;
  },

  /**
   * Generate 30-day cash flow forecast
   */
  forecast(
    accounts: Account[],
    transactions: Transaction[],
    _debts: Debt[],
    installments: Installment[],
    scenarios?: {
      debtPaymentId?: string;
      paymentAmount?: number;
      paymentDate?: Date;
    }
  ): CashFlowForecast {
    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000);

    let currentBalance = accounts.reduce((sum, a) => sum + a.balance, 0);
    const startBalance = currentBalance;

    const recurringItems = this.identifyRecurringItems(transactions);

    const activeInstallments = installments.filter((i) => i.status === 'active');

    const dailyBalances: DailyBalance[] = [];
    let minBalance = currentBalance;
    let minBalanceDate = startDate;

    for (let day = 0; day <= 30; day++) {
      const currentDate = new Date(startDate.getTime() + day * 24 * 60 * 60 * 1000);
      const dayOfMonth = currentDate.getDate();
      const isMonthStart = dayOfMonth <= 3;

      let dailyIncome = 0;
      let dailyExpense = 0;
      let description = '';

      recurringItems.forEach((item) => {
        if (item.dayOfMonth === dayOfMonth) {
          if (item.type === 'income') {
            dailyIncome += item.amount;
            description += `${item.name} `;
          } else {
            dailyExpense += item.amount;
            description += `${item.name} `;
          }
        }
      });

      if (isMonthStart) {
        activeInstallments.forEach((inst) => {
          dailyExpense += inst.monthlyPayment;
          description += `${inst.lenderName} Taksit `;
        });
      }

      if (scenarios?.paymentDate && scenarios.paymentDate.getDate() === dayOfMonth) {
        dailyExpense += scenarios.paymentAmount || 0;
        description += 'Scenario Payment ';
      }

      const netIncome = dailyIncome;
      const netExpense = dailyExpense;
      currentBalance = currentBalance + dailyIncome - dailyExpense;

      if (currentBalance < minBalance) {
        minBalance = currentBalance;
        minBalanceDate = currentDate;
      }

      dailyBalances.push({
        date: currentDate,
        balance: Math.max(0, currentBalance),
        netIncome,
        netExpense,
        description: description.trim() || 'Normal spending',
      });
    }

    const projectedEndBalance = currentBalance;

    let tightnessSeverity: 'none' | 'warning' | 'critical' = 'none';
    if (minBalance < 0) {
      tightnessSeverity = 'critical';
    } else if (minBalance < startBalance * 0.1) {
      tightnessSeverity = 'warning';
    }

    const recommendations: string[] = [];

    if (tightnessSeverity === 'critical') {
      recommendations.push(
        'Nakit akışınızda ciddi risiko var. Giderlerinizi acilen gözden geçirmeniz gerekiyor.'
      );
      recommendations.push(`En düşük bakiye: ₺${Math.abs(minBalance).toFixed(0)}`);
    } else if (tightnessSeverity === 'warning') {
      recommendations.push(
        'Nakit tamponu zayıf. Beklenmedik harcamalara hazırlıklı olun.'
      );
    }

    if (projectedEndBalance < startBalance * 0.5) {
      recommendations.push('Tasarruf oranınız düşük. Gelecek aylar için bütçe yapmanız önerilir.');
    }

    if (
      activeInstallments.reduce((sum, i) => sum + i.monthlyPayment, 0) >
      startBalance * 0.4
    ) {
      recommendations.push('Taksit yükünüz gelire göre yüksek. Erken ödeme düşünün.');
    }

    return {
      startDate,
      endDate,
      dailyBalances,
      projectedEndBalance: Math.max(0, projectedEndBalance),
      minBalance,
      minBalanceDate,
      hasCashTightness: tightnessSeverity !== 'none',
      tightnessSeverity,
      recommendations,
    };
  },

  /**
   * Calculate cash buffer subscore (0-100) for financial health
   */
  calculateCashBufferScore(forecast: CashFlowForecast, currentBalance: number): number {
    let score = 100;

    if (forecast.hasCashTightness) {
      if (forecast.tightnessSeverity === 'critical') {
        score = Math.max(0, 100 - 50);
      } else if (forecast.tightnessSeverity === 'warning') {
        score = Math.max(0, 100 - 25);
      }
    }

    const bufferRatio = forecast.minBalance / currentBalance;
    if (bufferRatio < 0.1) {
      score -= 15;
    } else if (bufferRatio < 0.25) {
      score -= 10;
    } else if (bufferRatio > 0.5) {
      score += 10;
    }

    return Math.max(0, Math.min(100, score));
  },
};
