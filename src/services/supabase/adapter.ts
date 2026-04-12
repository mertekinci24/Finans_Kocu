import { createClient } from '@supabase/supabase-js';
import type { IDataSourceAdapter } from '../types';
import { SupabaseUserRepository } from './repositories/UserRepository';
import { SupabaseAccountRepository } from './repositories/AccountRepository';
import { SupabaseTransactionRepository } from './repositories/TransactionRepository';
import { SupabaseDebtRepository } from './repositories/DebtRepository';
import { SupabaseInstallmentRepository } from './repositories/InstallmentRepository';
import { SupabaseFinancialScoreRepository } from './repositories/FinancialScoreRepository';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseKey = import.meta.env.VITE_SUPABASE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseKey);

export const dataSourceAdapter: IDataSourceAdapter = {
  user: new SupabaseUserRepository(supabase),
  account: new SupabaseAccountRepository(supabase),
  transaction: new SupabaseTransactionRepository(supabase),
  debt: new SupabaseDebtRepository(supabase),
  installment: new SupabaseInstallmentRepository(supabase),
  financialScore: new SupabaseFinancialScoreRepository(supabase),
};
