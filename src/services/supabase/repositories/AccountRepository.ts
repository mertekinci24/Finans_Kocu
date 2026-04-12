import type { SupabaseClient } from '@supabase/supabase-js';
import type { IAccountRepository } from '../../types';
import type { Account } from '@types';

export class SupabaseAccountRepository implements IAccountRepository {
  constructor(private client: SupabaseClient) {}

  async getByUserId(userId: string): Promise<Account[]> {
    const { data, error } = await this.client
      .from('accounts')
      .select('*')
      .eq('userId', userId)
      .order('createdAt', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async getById(id: string): Promise<Account | null> {
    const { data, error } = await this.client
      .from('accounts')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  async create(account: Omit<Account, 'id' | 'createdAt'>): Promise<Account> {
    const { data, error } = await this.client
      .from('accounts')
      .insert([account])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async update(id: string, account: Partial<Account>): Promise<Account> {
    const { data, error } = await this.client
      .from('accounts')
      .update(account)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.client.from('accounts').delete().eq('id', id);
    if (error) throw error;
  }
}
