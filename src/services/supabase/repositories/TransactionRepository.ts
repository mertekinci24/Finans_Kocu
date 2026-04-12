import type { SupabaseClient } from '@supabase/supabase-js';
import type { ITransactionRepository } from '../../types';
import type { Transaction } from '@types';

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
      .eq('accountId', accountId)
      .order('date', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return data || [];
  }

  async getByDateRange(
    accountId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Transaction[]> {
    const { data, error } = await this.client
      .from('transactions')
      .select('*')
      .eq('accountId', accountId)
      .gte('date', startDate.toISOString())
      .lte('date', endDate.toISOString())
      .order('date', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async create(transaction: Omit<Transaction, 'id' | 'createdAt'>): Promise<Transaction> {
    const { data, error } = await this.client
      .from('transactions')
      .insert([transaction])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async update(id: string, transaction: Partial<Transaction>): Promise<Transaction> {
    const { data, error } = await this.client
      .from('transactions')
      .update(transaction)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.client.from('transactions').delete().eq('id', id);
    if (error) throw error;
  }
}
