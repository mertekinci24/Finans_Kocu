import { Account, Transaction, Debt, Installment, RecurringFlow } from '@/types';
import { calculateCCDates } from '@/utils/dateUtils';

export interface DailyBalance {
  date: Date;
  balance: number;
  netIncome: number;
  netExpense: number;
  description: string;
}

export interface CashFlowForecast {
  startDate: Date;
  startBalance: number;
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
   * Generate N-day cash flow forecast (default: 30, scenario: up to 180)
   */
  forecast(
    accounts: Account[],
    transactions: Transaction[],
    _debts: Debt[],
    installments: Installment[],
    recurringFlows: RecurringFlow[] = [],
    scenarios?: {
      debtPaymentId?: string;
      paymentAmount?: number;
      paymentDate?: Date;
    },
    forecastDays: number = 30
  ): CashFlowForecast {
    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0); // Force start of day to prevent temporal shifting
    const endDate = new Date(startDate.getTime() + forecastDays * 24 * 60 * 60 * 1000);

    // The starting balance (Day 0) MUST ONLY include purely liquid cash.
    // 'vadesiz', 'nakit', and 'banka' represent the true baseline.
    let currentBalance = accounts.filter(a => ['nakit', 'vadesiz', 'banka'].includes(a.type.toLowerCase())).reduce((sum, a) => sum + Number(a.balance), 0);
    const startBalance = currentBalance;

    const activeInstallments = installments.filter((i) => i.status === 'active');

    // Identify historical recurring items but DEDUPLICATE against known active explicit flows 
    const rawRecurringItems = this.identifyRecurringItems(transactions);
    const recurringItems = rawRecurringItems.filter(item => {
      const matchInst = activeInstallments.some(inst => 
        item.name.toLowerCase().includes(inst.lenderName.toLowerCase()) || 
        inst.lenderName.toLowerCase().includes(item.name.toLowerCase())
      );
      const matchMan = (recurringFlows ?? []).some(flow => 
        flow.isActive && (
          item.name.toLowerCase().includes(flow.description.toLowerCase()) || 
          flow.description.toLowerCase().includes(item.name.toLowerCase())
        )
      );
      return !matchInst && !matchMan; // Do not double count!
    });

    const dailyBalances: DailyBalance[] = [];
    let minBalance = currentBalance;
    let minBalanceDate = startDate;
    let tightnessSeverity: 'none' | 'warning' | 'critical' = 'none';
    let recommendations: string[] = [];

    for (let day = 0; day <= forecastDays; day++) {
      const currentDate = new Date(startDate.getTime() + day * 24 * 60 * 60 * 1000);
      const dayOfMonth = currentDate.getDate();
      const isMonthStart = dayOfMonth <= 3;

      let dailyIncome = 0;
      let dailyExpense = 0;
      let description = '';

      recurringItems.forEach((item) => {
        if (item.dayOfMonth === dayOfMonth) {
          const amt = Number(item.amount);
          if (item.type === 'income') {
            dailyIncome += amt;
            currentBalance += amt;
            description += `${item.name} `;
          } else {
            dailyExpense += amt;
            currentBalance -= amt;
            description += `${item.name} `;
          }
        }
      });

      // 3. Installment Payments (Precise Day & Year Logic + Smart CC Linkage)
      activeInstallments.forEach((inst) => {
        // Fix -1 day bug: Parse "YYYY-MM-DD" but ignore UTC offset up front
        const rawDate = new Date(inst.firstPaymentDate);
        const firstPayment = new Date(rawDate.getUTCFullYear(), rawDate.getUTCMonth(), rawDate.getUTCDate());
        
        // Smart Linkage: If linked to a CC, use the card's paymentDay
        let targetPaymentDay = firstPayment.getDate();
        const linkedAccount = accounts.find(a => a.id === inst.accountId);
        if (linkedAccount?.type === 'kredi_kartı' && linkedAccount.paymentDay) {
          targetPaymentDay = linkedAccount.paymentDay;
        }
        
        // Month difference calculation for installment range
        const monthsDiff = (currentDate.getFullYear() - firstPayment.getFullYear()) * 12 + 
                          (currentDate.getMonth() - firstPayment.getMonth());

        // Process installment only if current day matches the target (card due date or specific date)
        if (
          currentDate >= firstPayment && 
          dayOfMonth === targetPaymentDay && 
          monthsDiff >= 0 &&
          monthsDiff < Number(inst.totalMonths)
        ) {
          const amt = Number(inst.monthlyPayment);
          dailyExpense += amt;
          currentBalance -= amt;
          description += `${inst.lenderName} Taksiti `;
        }
      });

      // 4. MANUAL Recurring Flows (Higher precedence / Task 45.60 & 45.71)
      (recurringFlows ?? []).filter(f => f.isActive).forEach((flow) => {
        if (flow.dayOfMonth === dayOfMonth) {
          const amt = Number(flow.amount);
          if (flow.type === 'income' || flow.type === 'gelir') {
            dailyIncome += amt;
            currentBalance += amt;
            description += `${flow.label || flow.category || 'Maaş'} 🟢 `;
          } else {
            dailyExpense += amt;
            currentBalance -= amt;
            description += `${flow.label || flow.category || 'Gider'} 🔴 `;
          }
        }
      });

      // 5. Credit Card Statement Payments (Dynamic Business Day Engine)
      accounts.filter(a => a.type === 'kredi_kartı').forEach(cc => {
        const amt = Number(cc.balance);
        if (cc.statementDay && cc.paymentDay) {
          const { paymentDate } = calculateCCDates(cc.statementDay, cc.paymentDay);
          
          if (
            currentDate.getDate() === paymentDate.getDate() &&
            currentDate.getMonth() === paymentDate.getMonth() &&
            currentDate.getFullYear() === paymentDate.getFullYear()
          ) {
            dailyExpense += amt;
            currentBalance -= amt;
            description += `${cc.name} Ekstre Ödemesi `;
          }
        } else {
          // Fallback legacy logic
          const pDay = cc.paymentDay || cc.dueDate;
          if (pDay && dayOfMonth === pDay) {
            dailyExpense += amt;
            currentBalance -= amt;
            description += `${cc.name} Ekstre Ödemesi `;
          }
        }
      });

      if (scenarios?.paymentDate && scenarios.paymentDate.getDate() === dayOfMonth) {
        const amt = Number(scenarios.paymentAmount || 0);
        dailyExpense += amt;
        currentBalance -= amt;
        description += 'Scenario Payment ';
      }

      const netIncome = dailyIncome;
      const netExpense = dailyExpense;
      const prevBal = currentBalance - dailyIncome + dailyExpense;

      // Only print if there's actual activity that day, otherwise it overflows terminal
      if (dailyIncome > 0 || dailyExpense > 0) {
        const year = currentDate.getFullYear();
        const month = String(currentDate.getMonth() + 1).padStart(2, '0');
        const dayFormatted = String(currentDate.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${dayFormatted}`;
        
        console.log(`[FLOW_TRACE] ${dateStr} | Prev: ${prevBal} | In: ${dailyIncome} | Out: ${dailyExpense} (${description.trim() || 'Hidden'}) | New: ${currentBalance}`);
      }

      // --- Trigger A: Daily Resolution Integrity Check ---
      if (currentBalance < minBalance) {
        minBalance = currentBalance;
        minBalanceDate = currentDate;
      }

      dailyBalances.push({
        date: currentDate,
        balance: currentBalance,
        netIncome,
        netExpense,
        description: description.trim() || 'Normal spending',
      });
    }

    const projectedEndBalance = currentBalance;

    // --- REFINED TRIGGER A: v6.2 Precision Logic ---
    const day1Balance = dailyBalances[0]?.balance || startBalance;
    
    // Check if any credit card payment day causes a significant drop compared to day 1, leading to negative balance
    const CC_PAYMENT_DAYS = accounts
      .filter(a => a.type === 'kredi_kartı')
      .map(a => a.paymentDay || a.dueDate)
      .filter(Boolean);

    let hasPreSalaryBlockage = false;
    if (minBalance < 0) {
      for (const pDay of CC_PAYMENT_DAYS) {
        const balOnPDay = dailyBalances.find(db => db.date.getDate() === pDay)?.balance;
        if (balOnPDay !== undefined && balOnPDay < day1Balance) {
          hasPreSalaryBlockage = true;
          break;
        }
      }
    }

    if (minBalance < 0) {
      tightnessSeverity = 'critical';
      if (hasPreSalaryBlockage) {
        recommendations.push(
          'Kritik: Maaş Öncesi Nakit Tıkanıklığı. Kredi kartı ödeme günü bakiyeniz başlangıca göre ciddi düşüşte!'
        );
      } else {
        recommendations.push(
          'Likitide Krizi: Ay içinde bakiyeniz negatife düşüyor!'
        );
      }
      recommendations.push(`En düşük bakiye tahmini: ₺${Math.abs(minBalance).toFixed(0)}`);
    } else if (minBalance < startBalance * 0.1) {
      tightnessSeverity = 'warning';
      recommendations.push(
        'Nakit tamponu zayıf. Ay içinde likidite riskli seviyelere iniyor.'
      );
    }

    return {
      startDate,
      startBalance,
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
        score -= 60;
      } else if (forecast.tightnessSeverity === 'warning') {
        score -= 30;
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

  /**
   * Calculates monthly installment totals for the next 12 months
   */
  getMonthlyInstallmentProjection(installments: Installment[], threshold: number = 80000, startOffset: number = 0): { month: string; paidAmount: number; pendingAmount: number; totalAmount: number; isRisk: boolean }[] {
    const active = installments.filter((i) => i.status === 'active');
    const projection = [];
    const now = new Date();

    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i + startOffset, 1);
      const currYear = d.getFullYear();
      const currMonth = d.getMonth();
      const monthKey = `${currYear}-${String(currMonth + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('tr-TR', { month: 'short' });

      let paidAmount = 0;
      let pendingAmount = 0;

      active.forEach((inst) => {
        const first = new Date(inst.firstPaymentDate);
        const startYear = first.getFullYear();
        const startMonth = first.getMonth();

        const currentTotal = currYear * 12 + currMonth;
        const startTotal = startYear * 12 + startMonth;
        const diff = currentTotal - startTotal;

        if (diff >= 0 && diff < inst.totalMonths) {
          const history = inst.paymentHistory?.[monthKey];
          const amount = history?.amount ?? inst.monthlyPayment;

          if (history?.status === 'paid') {
            paidAmount += amount;
          } else {
            pendingAmount += amount;
          }
        }
      });

      const totalAmount = paidAmount + pendingAmount;
      projection.push({ 
        month: label, 
        paidAmount, 
        pendingAmount, 
        totalAmount,
        isRisk: totalAmount >= threshold
      });
    }
    return projection;
  },

  /**
   * TASK 45.38.1: Weighted Net Worth (WNW) Engine
   * Implements Σ(Asset_i * Weight_i) - TotalDebt
   */
  calculateWeightedNetWorth(
    accounts: Account[],
    installments: Installment[],
    debts: Debt[]
  ): number {
    const stockKeywords = ['stok', 'ticari', 'envanter', 'malzeme'];
    const assetKeywords = ['ev', 'araba', 'araç', 'daire', 'villa', 'arsa', 'gayrimenkul', 'konut', 'bina'];

    const weightedAssets = accounts.reduce((sum, account) => {
      // Skip credit cards as they are debts, not primary assets in this calculation
      if (account.type === 'kredi_kartı') return sum;

      const nameLower = account.name.toLowerCase();
      let weight = 1.0; // Default: Liquid

      if (stockKeywords.some(k => nameLower.includes(k))) {
        weight = 0.5;
      } else if (assetKeywords.some(k => nameLower.includes(k))) {
        weight = 0.2;
      }

      return sum + (account.balance * weight);
    }, 0);

    // Total Debt Calculation (Sync with Dashboard logic)
    const activeDebts = debts
      .filter((d) => d.status === 'active')
      .reduce((sum, d) => sum + (d.remainingAmount || 0), 0);
    
    const activeInstallments = installments
      .filter((i) => i.status === 'active')
      .reduce((sum, inst) => {
        let instSum = 0;
        const first = new Date(inst.firstPaymentDate);
        const startTotal = first.getFullYear() * 12 + first.getMonth();

        for (let m = 0; m < inst.totalMonths; m++) {
          const targetTotal = startTotal + m;
          const targetYear = Math.floor(targetTotal / 12);
          const targetMonth = (targetTotal % 12) + 1;
          const monthKey = `${targetYear}-${String(targetMonth).padStart(2, '0')}`;
          
          const history = inst.paymentHistory?.[monthKey];
          if (history?.status !== 'paid') {
            instSum += (history?.amount ?? inst.monthlyPayment);
          }
        }
        return sum + instSum;
      }, 0);

    // Subtract CC balances if they represent debt
    const ccDebt = accounts
      .filter(a => a.type === 'kredi_kartı')
      .reduce((sum, a) => sum + a.balance, 0);

    return weightedAssets - (activeDebts + activeInstallments + ccDebt);
  },

  /**
   * TASK 45.38.2: Hybrid MRE Engine (Refining v6.1)
   * Formula: FixedMandatory + VariableEssential (Rolling Avg) + DebtPayments
   * EXCLUDES: Health, Clothing, Entertainment
   */
  calculateMonthlyRequiredExpenses(
    transactions: Transaction[],
    installments: Installment[],
    debts: Debt[],
    recurringFlows: RecurringFlow[] = []
  ): number {
    if (!recurringFlows) return 0;
    const fixedKeywords = ['fatura', 'kira', 'aidat', 'abonelik', 'hizmet', 'internet', 'elektrik', 'su', 'doğalgaz'];
    const variableKeywords = ['market', 'gıda', 'yemek', 'yiyecek', 'ulaşım', 'benzin', 'mazot', 'akaryakıt'];
    
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const ninetyDaysAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);

    // Helper to check if a transaction matches keywords (by category OR description)
    const matchesKeywords = (t: Transaction, keywords: string[]) => {
      if (t.type !== 'gider') return false;
      const cat = (t.category || '').toLowerCase();
      const desc = (t.description || '').toLowerCase();
      return keywords.some(k => cat.includes(k) || desc.includes(k));
    };

    // 1. Fixed Mandatory (Hybrid: Current Month total vs. 3rd of last 90 days total)
    let fixedTotalMRE = 0;
    
    // We group by keyword "type" logic or just total them as one pool for simplicity as per user request
    const currentMonthFixed = transactions
      .filter(t => matchesKeywords(t, fixedKeywords) && new Date(t.date) >= currentMonthStart)
      .reduce((sum, t) => sum + t.amount, 0);

    const historicalFixedTotal = transactions
      .filter(t => matchesKeywords(t, fixedKeywords) && new Date(t.date) >= ninetyDaysAgo && new Date(t.date) < currentMonthStart)
      .reduce((sum, t) => sum + t.amount, 0);
    
    const historicalFixedAvg = historicalFixedTotal / 3;

    // RULE: If current month has records, use actual. Else use average fallback.
    fixedTotalMRE = currentMonthFixed > 0 ? currentMonthFixed : historicalFixedAvg;

    // 2. Variable Essential (Hybrid Max: Math.max(Current, Average))
    const currentMonthVariable = transactions
      .filter(t => matchesKeywords(t, variableKeywords) && new Date(t.date) >= currentMonthStart)
      .reduce((sum, t) => sum + t.amount, 0);

    const historicalVariableTotal = transactions
      .filter(t => matchesKeywords(t, variableKeywords) && new Date(t.date) >= ninetyDaysAgo && new Date(t.date) < currentMonthStart)
      .reduce((sum, t) => sum + t.amount, 0);
    
    const historicalVariableAvg = historicalVariableTotal / 3;

    // RULE: Use Math.max to prevent under-estimation during high-spend months
    const variableTotalMRE = Math.max(currentMonthVariable, historicalVariableAvg);

    // 3. Debt Payments (Current Month Burden)
    const currentMonthEnd = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);
    const installmentBurden = installments
      .filter((i) => i.status === 'active' && new Date(i.firstPaymentDate) <= currentMonthEnd)
      .reduce((sum, i) => sum + i.monthlyPayment, 0);

    const debtBurden = debts
      .filter((d) => d.status === 'active')
      .reduce((sum, d) => sum + (d.monthlyPayment || 0), 0);

    // 4. Recurring Manual Expenses
    // (We only include them if they aren't already captured by keywords to avoid double counting)
    // Actually, following the user's strict command, we include them as baseline "fixed" load.
    const manualRecurringExpenseTotal = (recurringFlows ?? [])
      .filter(f => f.isActive && f.type === 'gider')
      .reduce((sum, f) => sum + f.amount, 0);

    return fixedTotalMRE + variableTotalMRE + installmentBurden + debtBurden + manualRecurringExpenseTotal;
  },

  /**
   * TASK 47.2: Virtual Statement Logic
   * Groups transactions by statement cycle based on account.statementDay
   */
  calculateStatementBalance(
    account: Account,
    transactions: Transaction[],
    systemDate: Date
  ): { statementBalance: number; pendingBalance: number; statementDate: Date } {
    if (account.type !== 'kredi_kartı' || !account.statementDay) {
      return { statementBalance: account.balance, pendingBalance: 0, statementDate: systemDate };
    }

    // YENİ MANTIK: Takvimle aynı beyni kullan, zaman sapmalarını engelle
    const { statementDate } = calculateCCDates(account.statementDay, account.paymentDay || 15, systemDate);

    // Filter transactions belonging to this account
    const accountTx = transactions.filter(t => t.accountId === account.id && t.type === 'gider');

    // Sadece hesap kesiminden SONRA yapılan harcamalar (Gelecek döneme sarkanlar)
    const sDate = new Date(statementDate).setHours(0,0,0,0);
    const pendingBalance = accountTx
      .filter(t => {
        const tDate = new Date(t.date).setHours(0,0,0,0);
        return tDate > sDate;
      })
      .reduce((sum, t) => sum + t.amount, 0);

    // Gerçek Ekstre Borcu = Kartın Toplam Borcu - Henüz ekstreleşmemiş dönem içi harcamalar
    const statementBalance = Math.max(0, account.balance - pendingBalance);

    console.log(`[STATEMENT_CALC] Kart: ${account.name}, Toplam Borç: ${account.balance}, Dönem İçi (Pending): ${pendingBalance}, Ekstre Borcu: ${statementBalance}`);

    return { statementBalance, pendingBalance, statementDate };
  }
};
