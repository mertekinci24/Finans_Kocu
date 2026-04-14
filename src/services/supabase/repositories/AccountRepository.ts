import type { SupabaseClient } from '@supabase/supabase-js';
import type { IAccountRepository } from '../../types';
import type { Account } from '@types';
import type { AccountRow } from '@/types/database';

export class SupabaseAccountRepository implements IAccountRepository {
  constructor(private client: SupabaseClient) {}

  async getByUserId(userId: string): Promise<Account[]> {
    const { data, error } = await this.client
      .from('accounts')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(this.mapToAccount);
  }

  async getById(id: string): Promise<Account | null> {
    const { data, error } = await this.client
      .from('accounts')
      .select('*')
      .eq('id', id)
      .eq('is_active', true)
      .maybeSingle();

    if (error) throw error;
    return data ? this.mapToAccount(data) : null;
  }

  async create(account: Omit<Account, 'id' | 'createdAt'>): Promise<Account> {
    const { data, error } = await this.client
      .from('accounts')
      .insert([
        {
          user_id: account.userId,
          name: account.name,
          type: account.type,
          balance: account.balance,
          currency: account.currency,
          bank_name: account.bankName || null,
          card_limit: account.cardLimit || null,
          is_active: true,
        },
      ])
      .select()
      .single();

    if (error) throw error;
    return this.mapToAccount(data);
  }

  async update(id: string, account: Partial<Account>): Promise<Account> {
    const { data, error } = await this.client
      .from('accounts')
      .update({
        name: account.name,
        balance: account.balance,
        bank_name: account.bankName,
        card_limit: account.cardLimit,
        is_active: account.isActive,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return this.mapToAccount(data);
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.client
      .from('accounts')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
  }

  private mapToAccount(row: AccountRow): Account {
    return {
      id: row.id,
      userId: row.user_id,
      name: row.name,
      type: row.type,
      balance: row.balance,
      currency: row.currency,
      bankName: row.bank_name,
      cardLimit: row.card_limit,
      isActive: row.is_active,
      createdAt: new Date(row.created_at),
      updatedAt: row.updated_at ? new Date(row.updated_at) : undefined,
    };
  }
}
