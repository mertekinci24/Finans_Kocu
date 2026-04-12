import type { SupabaseClient } from '@supabase/supabase-js';
import type { IDebtRepository } from '../../types';
import type { Debt } from '@types';

export class SupabaseDebtRepository implements IDebtRepository {
  constructor(private client: SupabaseClient) {}

  async getByUserId(userId: string): Promise<Debt[]> {
    const { data, error } = await this.client
      .from('debts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(this.mapToDebt);
  }

  async getById(id: string): Promise<Debt | null> {
    const { data, error } = await this.client
      .from('debts')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data ? this.mapToDebt(data) : null;
  }

  async create(debt: Omit<Debt, 'id' | 'createdAt'>): Promise<Debt> {
    const { data, error } = await this.client
      .from('debts')
      .insert([
        {
          user_id: debt.userId,
          creditor_name: debt.creditorName,
          amount: debt.amount,
          remaining_amount: debt.remainingAmount,
          interest_rate: debt.interestRate,
          due_date: debt.dueDate.toISOString().split('T')[0],
          status: debt.status,
        },
      ])
      .select()
      .single();

    if (error) throw error;
    return this.mapToDebt(data);
  }

  async update(id: string, debt: Partial<Debt>): Promise<Debt> {
    const { data, error } = await this.client
      .from('debts')
      .update({
        creditor_name: debt.creditorName,
        amount: debt.amount,
        remaining_amount: debt.remainingAmount,
        interest_rate: debt.interestRate,
        due_date: debt.dueDate ? debt.dueDate.toISOString().split('T')[0] : undefined,
        status: debt.status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return this.mapToDebt(data);
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.client.from('debts').delete().eq('id', id);
    if (error) throw error;
  }

  private mapToDebt(row: any): Debt {
    return {
      id: row.id,
      userId: row.user_id,
      creditorName: row.creditor_name,
      amount: row.amount,
      remainingAmount: row.remaining_amount,
      interestRate: row.interest_rate,
      dueDate: new Date(row.due_date),
      status: row.status,
      createdAt: new Date(row.created_at),
    };
  }
}
