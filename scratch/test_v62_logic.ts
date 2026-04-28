import { cashFlowEngine } from './src/services/cashFlowEngine';
import { Account, Transaction, Installment } from './src/types';

const mockAccounts: Account[] = [
  {
    id: 'cc1',
    userId: 'u1',
    name: 'Bonus',
    type: 'kredi_kartı',
    balance: 5000,
    currency: 'TRY',
    paymentDay: 25,
    isActive: true,
    createdAt: new Date(),
  },
  {
    id: 'bank1',
    userId: 'u1',
    name: 'Maaş Hesabı',
    type: 'banka',
    balance: 6000,
    currency: 'TRY',
    isActive: true,
    createdAt: new Date(),
  }
];

const mockTransactions: Transaction[] = []; // No recurring income to make it fail

const mockInstallments: Installment[] = [];

// Forecast should show a dip on day 25
const result = cashFlowEngine.forecast(
  mockAccounts,
  mockTransactions,
  [], // debts
  mockInstallments,
  {},
  30
);

console.log('--- TEST RESULTS ---');
console.log('Min Balance:', result.minBalance);
console.log('Severity:', result.tightnessSeverity);
console.log('Recommendations:', result.recommendations);

const isLogicValid = result.recommendations.some(r => r.includes('Maaş Öncesi Nakit Tıkanıklığı'));
console.log('Logic Valid:', isLogicValid);
