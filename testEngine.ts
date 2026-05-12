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

// Fixture 2 - Cash blockage
console.log("\n--- Fixture 2: Cash Blockage ---");
const res2 = engine.calculate({
  accounts: [{ id: '1', name: 'Ziraat', balance: 1000, type: 'vadesiz', accountType: 'vadesiz' } as any],
  transactions: [],
  debts: [],
  installments: [{ id: '2', status: 'active', principal: 10000, monthlyPayment: 15000, firstPaymentDate: new Date() } as any],
  recurringFlows: [{ id: '3', type: 'gelir', amount: 10000, isActive: true } as any],
});
console.log("Score:", res2.assessment.overallScore);
console.log("Severity:", res2.assessment.severity);
console.log("Badge:", res2.assessment.badgeLabel);
console.log("Status:", res2.assessment.statusLabel);
console.log("Flags:", res2.assessment.flags);

// Fixture 4 - Strong User
console.log("\n--- Fixture 4: Strong User ---");
const res4 = engine.calculate({
  accounts: [{ id: '1', name: 'Garanti', balance: 200000, type: 'vadesiz', accountType: 'vadesiz' } as any],
  transactions: [{ id: '2', amount: 1000, type: 'gider', date: new Date() } as any],
  debts: [],
  installments: [],
  recurringFlows: [{ id: '3', type: 'gelir', amount: 50000, isActive: true } as any],
});
console.log("Score:", res4.assessment.overallScore);
console.log("Severity:", res4.assessment.severity);
console.log("Badge:", res4.assessment.badgeLabel);
console.log("Status:", res4.assessment.statusLabel);
