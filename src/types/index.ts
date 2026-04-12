export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  createdAt: Date;
}

export interface Account {
  id: string;
  userId: string;
  name: string;
  type: 'checking' | 'savings' | 'investment';
  balance: number;
  currency: 'TRY';
  createdAt: Date;
}

export interface Transaction {
  id: string;
  accountId: string;
  amount: number;
  description: string;
  category: string;
  date: Date;
  type: 'income' | 'expense';
  createdAt: Date;
}

export interface Debt {
  id: string;
  userId: string;
  creditorName: string;
  amount: number;
  remainingAmount: number;
  interestRate: number;
  dueDate: Date;
  status: 'active' | 'paid_off' | 'overdue';
  createdAt: Date;
}

export interface Installment {
  id: string;
  userId: string;
  lenderName: string;
  principal: number;
  monthlyPayment: number;
  remainingMonths: number;
  totalMonths: number;
  interestRate: number;
  nextPaymentDate: Date;
  status: 'active' | 'paid_off' | 'overdue';
  createdAt: Date;
}

export interface FinancialScore {
  overallScore: number;
  confidenceScore: number;
  debtToIncomeRatio: number;
  cashBufferMonths: number;
  savingsRate: number;
  installmentBurdenRatio: number;
  lastCalculatedAt: Date;
}
