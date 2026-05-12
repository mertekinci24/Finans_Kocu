import { ScoringEngine } from './src/services/scoringEngine';
const engine = new ScoringEngine();

// Mocks
const mockAccount = { id: '1', name: 'Ziraat', balance: 10000, type: 'vadesiz', accountType: 'vadesiz' };
const mockDebt = { id: '2', amount: 150000, remainingAmount: 150000, status: 'active', monthlyPayment: 5000 };
const mockIncome = { id: '3', type: 'gelir', amount: 30000, isActive: true };

// Fixture 1 - WNW Negative
console.log("--- Fixture 1: WNW Negative ---");
const res1 = engine.calculate({
  accounts: [mockAccount as any],
  transactions: [],
  debts: [mockDebt as any],
  installments: [],
  recurringFlows: [mockIncome as any],
});
console.log("Score:", res1.assessment.overallScore);
console.log("Severity:", res1.assessment.severity);
console.log("Badge:", res1.assessment.badgeLabel);
console.log("Status:", res1.assessment.statusLabel);
console.log("Explanation:", res1.assessment.explanation);

// Fixture 6A - Active debt but not overdue
console.log("\n--- Fixture 6A: Active debt but not overdue ---");
const res6a = engine.calculate({
  accounts: [{ id: '1', name: 'Garanti', balance: 200000, type: 'vadesiz', accountType: 'vadesiz' } as any],
  transactions: [],
  debts: [{ id: '2', amount: 5000, remainingAmount: 5000, status: 'active', monthlyPayment: 500 } as any],
  installments: [],
  recurringFlows: [{ id: '3', type: 'gelir', amount: 30000, isActive: true } as any],
});
console.log("Primary Risk:", res6a.assessment.primaryRisk);
console.log("Flags:", res6a.assessment.flags);

// Fixture 6B - Real overdue
console.log("\n--- Fixture 6B: Real overdue ---");
const res6b = engine.calculate({
  accounts: [{ id: '1', name: 'Garanti', balance: 200000, type: 'vadesiz', accountType: 'vadesiz' } as any],
  transactions: [],
  debts: [{ id: '2', amount: 5000, remainingAmount: 5000, status: 'overdue', monthlyPayment: 500 } as any],
  installments: [],
  recurringFlows: [{ id: '3', type: 'gelir', amount: 30000, isActive: true } as any],
});
console.log("Primary Risk:", res6b.assessment.primaryRisk);
console.log("Flags:", res6b.assessment.flags);

// Fixture 6C - Cash warning with high score
console.log("\n--- Fixture 6C: Cash warning with high score ---");
const res6c = engine.calculate({
  accounts: [{ id: '1', name: 'Garanti', balance: 30000, type: 'vadesiz', accountType: 'vadesiz' } as any],
  transactions: [],
  debts: [],
  installments: [{ id: '2', status: 'active', principal: 10000, monthlyPayment: 35000, firstPaymentDate: new Date() } as any],
  recurringFlows: [{ id: '3', type: 'gelir', amount: 40000, isActive: true } as any],
});
console.log("Score:", res6c.assessment.overallScore);
console.log("Severity:", res6c.assessment.severity);
console.log("Badge:", res6c.assessment.badgeLabel);
console.log("Status:", res6c.assessment.statusLabel);
console.log("Flags:", res6c.assessment.flags);
