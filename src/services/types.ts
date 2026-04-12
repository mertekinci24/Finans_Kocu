import type {
  User,
  Account,
  Transaction,
  Debt,
  Installment,
  FinancialScore,
  FindeksReport,
  ActionStep,
} from '@types';

export interface IUserRepository {
  getById(id: string): Promise<User | null>;
  create(user: Omit<User, 'id' | 'createdAt'>): Promise<User>;
  update(id: string, user: Partial<User>): Promise<User>;
  delete(id: string): Promise<void>;
}

export interface IAccountRepository {
  getByUserId(userId: string): Promise<Account[]>;
  getById(id: string): Promise<Account | null>;
  create(account: Omit<Account, 'id' | 'createdAt'>): Promise<Account>;
  update(id: string, account: Partial<Account>): Promise<Account>;
  delete(id: string): Promise<void>;
}

export interface ITransactionRepository {
  getByAccountId(
    accountId: string,
    limit?: number,
    offset?: number
  ): Promise<Transaction[]>;
  getByDateRange(
    accountId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Transaction[]>;
  create(transaction: Omit<Transaction, 'id' | 'createdAt'>): Promise<Transaction>;
  createMany(transactions: Omit<Transaction, 'id' | 'createdAt'>[]): Promise<Transaction[]>;
  update(id: string, transaction: Partial<Transaction>): Promise<Transaction>;
  delete(id: string): Promise<void>;
}

export interface IDebtRepository {
  getByUserId(userId: string): Promise<Debt[]>;
  getById(id: string): Promise<Debt | null>;
  create(debt: Omit<Debt, 'id' | 'createdAt'>): Promise<Debt>;
  update(id: string, debt: Partial<Debt>): Promise<Debt>;
  delete(id: string): Promise<void>;
}

export interface IInstallmentRepository {
  getByUserId(userId: string): Promise<Installment[]>;
  getById(id: string): Promise<Installment | null>;
  create(installment: Omit<Installment, 'id' | 'createdAt'>): Promise<Installment>;
  update(id: string, installment: Partial<Installment>): Promise<Installment>;
  delete(id: string): Promise<void>;
}

export interface IFinancialScoreRepository {
  getByUserId(userId: string): Promise<FinancialScore | null>;
  create(
    userId: string,
    score: Omit<FinancialScore, 'lastCalculatedAt'>
  ): Promise<FinancialScore>;
  update(userId: string, score: Partial<FinancialScore>): Promise<FinancialScore>;
}

export interface IFindeksRepository {
  createReport(report: Omit<FindeksReport, 'id' | 'createdAt' | 'updatedAt'>): Promise<FindeksReport>;
  getLatestReport(userId: string): Promise<FindeksReport | null>;
  getReportHistory(userId: string, limit?: number): Promise<FindeksReport[]>;
  updateReportAnalysis(
    reportId: string,
    aiAnalysis: string,
    actionPlan: ActionStep[]
  ): Promise<FindeksReport>;
}

export interface IDataSourceAdapter {
  user: IUserRepository;
  account: IAccountRepository;
  transaction: ITransactionRepository;
  debt: IDebtRepository;
  installment: IInstallmentRepository;
  financialScore: IFinancialScoreRepository;
  findeks: IFindeksRepository;
}
