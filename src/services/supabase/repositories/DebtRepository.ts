import type { SupabaseClient } from '@supabase/supabase-js';
import type { IDebtRepository } from '../../types';
import type { Debt } from '@types';

export class SupabaseDebtRepository implements IDebtRepository {
  constructor(private client: SupabaseClient) {}

  async getByUserId(userId: string): Promise<Debt[]> {
    const { data, error } = await this.client
      .from('debts')
      .select('*')
      .eq('userId', userId)
      .order('createdAt', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async getById(id: string): Promise<Debt | null> {
    const { data, error } = await this.client
      .from('debts')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  async create(debt: Omit<Debt, 'id' | 'createdAt'>): Promise<Debt> {
    const { data, error } = await this.client
      .from('debts')
      .insert([debt])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async update(id: string, debt: Partial<Debt>): Promise<Debt> {
    const { data, error } = await this.client
      .from('debts')
      .update(debt)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.client.from('debts').delete().eq('id', id);
    if (error) throw error;
  }
}
