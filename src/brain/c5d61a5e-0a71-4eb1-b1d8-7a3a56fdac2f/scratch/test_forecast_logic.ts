
import { cashFlowEngine } from '../src/services/cashFlowEngine';
import { Account, Transaction, Installment, Debt } from '../src/types';

// Mock Data
const accounts: Account[] = [
    {
        id: 'acc1',
        userId: 'u1',
        name: 'Ana Hesap',
        type: 'banka',
        balance: 10000,
        currency: 'TRY',
        isActive: true,
        createdAt: new Date()
    },
    {
        id: 'acc2',
        userId: 'u1',
        name: 'Bonus Kart',
        type: 'kredi_kartı',
        balance: 15000, // 15k Borç
        currency: 'TRY',
        paymentDay: 25,
        isActive: true,
        createdAt: new Date()
    }
];

const transactions: Transaction[] = [
    {
        id: 'tx1',
        accountId: 'acc1',
        amount: 25000,
        description: 'Maaş',
        category: 'Gelir',
        date: new Date(new Date().getFullYear(), new Date().getMonth(), 30), // Ayın 30'u
        type: 'gelir',
        createdAt: new Date()
    }
];

const forecast = cashFlowEngine.forecast(accounts, transactions, [], []);

console.log("--- FORECAST VERIFICATION ---");
console.log("Start Balance (Net):", accounts.reduce((sum, a) => sum + (a.type === 'kredi_kartı' ? -a.balance : a.balance), 0));

const day24 = forecast.dailyBalances[23];
const day25 = forecast.dailyBalances[24];
const day30 = forecast.dailyBalances[29];

console.log(`Day 24 Balance: ${day24.balance}`);
console.log(`Day 25 Balance (CC Payment): ${day25.balance}`);
console.log(`Day 30 Balance (Salary): ${day30.balance}`);

console.log("Has Cash Tightness:", forecast.hasCashTightness);
console.log("Severity:", forecast.tightnessSeverity);
console.log("Recommendations:", forecast.recommendations);

if (forecast.tightnessSeverity === 'critical' && day25.balance < day24.balance) {
    console.log("SUCCESS: Dip on Day 25 detected and Critical warning issued.");
} else {
    console.log("FAILURE: Logic validation failed.");
}
