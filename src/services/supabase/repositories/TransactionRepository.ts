import type { SupabaseClient } from '@supabase/supabase-js';
import type { ITransactionRepository } from '../../types';
import type { Transaction } from '@types';
import type { TransactionRow } from '@/types/database';

export class SupabaseTransactionRepository implements ITransactionRepository {
  constructor(private client: SupabaseClient) {}

  async getByAccountId(
    accountId: string,
    limit = 50,
    offset = 0
  ): Promise<Transaction[]> {
    const { data, error } = await this.client
      .from('transactions')
      .select('*')
      .eq('account_id', accountId)
      .order('date', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return (data || []).map(this.mapToTransaction);
  }

  async getByDateRange(
    accountId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Transaction[]> {
    const startStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];

    const { data, error } = await this.client
      .from('transactions')
      .select('*')
      .eq('account_id', accountId)
      .gte('date', startStr)
      .lte('date', endStr)
      .order('date', { ascending: false });

    if (error) throw error;
    return (data || []).map(this.mapToTransaction);
  }

  async create(transaction: Omit<Transaction, 'id' | 'createdAt'>): Promise<Transaction> {
    const { data, error } = await this.client
      .from('transactions')
      .insert([
        {
          account_id: transaction.accountId,
          amount: transaction.amount,
          description: transaction.description,
          category: transaction.category,
          date: transaction.date.toISOString().split('T')[0],
          type: transaction.type,
          note: transaction.note || null,
          recurring: transaction.recurring || 'none',
        },
      ])
      .select()
      .single();

    if (error) throw error;
    return this.mapToTransaction(data);
  }

  async createMany(transactions: Omit<Transaction, 'id' | 'createdAt'>[]): Promise<Transaction[]> {
    if (transactions.length === 0) return [];

    const rows = transactions.map((t) => ({
      account_id: t.accountId,
      amount: t.amount,
      description: t.description,
      category: t.category,
      date: t.date.toISOString().split('T')[0],
      type: t.type,
      note: t.note || null,
    }));

    const { data, error } = await this.client
      .from('transactions')
      .insert(rows)
      .select();

    if (error) throw error;
    return (data || []).map(this.mapToTransaction);
  }

  async update(id: string, transaction: Partial<Transaction>): Promise<Transaction> {
    const { data, error } = await this.client
      .from('transactions')
      .update({
        amount: transaction.amount,
        description: transaction.description,
        category: transaction.category,
        date: transaction.date ? transaction.date.toISOString().split('T')[0] : undefined,
        type: transaction.type,
        note: transaction.note,
        recurring: transaction.recurring,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return this.mapToTransaction(data);
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.client.from('transactions').delete().eq('id', id);
    if (error) throw error;
  }

  private mapToTransaction(row: TransactionRow): Transaction {
    return {
      id: row.id,
      accountId: row.account_id,
      amount: row.amount,
      description: row.description,
      category: row.category,
      date: new Date(row.date),
      type: row.type,
      note: row.note,
      recurring: row.recurring ?? 'none',
      createdAt: new Date(row.created_at),
      updatedAt: row.updated_at ? new Date(row.updated_at) : undefined,
    };
  }
}
