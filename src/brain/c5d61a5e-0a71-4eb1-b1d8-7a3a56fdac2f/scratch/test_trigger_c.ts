
import { ScoringEngine } from '../../../../src/services/scoringEngine';
import { Account, Transaction, Debt, Installment } from '../../../../src/types';

// Mock Data from image_726f86.png
const mockAccounts: Account[] = [
  { id: '1', userId: 'user1', name: 'Maaş Hesabı', type: 'banka', balance: 150000, currency: 'TRY', isActive: true, createdAt: new Date() }
];

const mockTransactions: Transaction[] = [
  { id: '1', accountId: '1', amount: 30000, description: 'Maaş', category: 'Gelir', date: new Date(), type: 'gelir', createdAt: new Date() }
];

const mockInstallments: Installment[] = [
  {
    id: 'inst1',
    userId: 'user1',
    lenderName: 'gecikmekredisi', // Case from image_728d47
    type: 'banka_kredisi',
    principal: 100000,
    monthlyPayment: 5000,
    remainingMonths: 10,
    totalMonths: 24,
    interestRate: 2.5,
    firstPaymentDate: new Date('2025-12-17'),
    nextPaymentDate: new Date('2026-04-15'),
    status: 'active',
    paymentHistory: {
      // '2026-03' entry removed to test implicit detection logic
    },
    createdAt: new Date()
  }
];

const engine = new ScoringEngine();
const result = engine.calculate({
  accounts: mockAccounts,
  transactions: mockTransactions,
  debts: [],
  installments: mockInstallments
});

console.log('--- TEST RESULTS ---');
console.log('Score:', result.score.overallScore);
console.log('Crisis Title:', result.crisis?.title);
console.log('Reason:', result.crisis?.reason);

if (result.score.overallScore <= 24 && result.crisis?.level === 'delinquency') {
  console.log('✅ TEST PASSED: Score capped at 24 due to Trigger C.');
} else {
  console.log('❌ TEST FAILED: Score logic not capturing Trigger C correctly.');
}
