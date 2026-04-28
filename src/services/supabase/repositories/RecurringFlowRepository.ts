import type { SupabaseClient } from '@supabase/supabase-js';
import type { IRecurringFlowRepository } from '../../types';
import type { RecurringFlow } from '@types';
import type { RecurringFlowRow } from '@/types/database';

export class SupabaseRecurringFlowRepository implements IRecurringFlowRepository {
  constructor(private client: SupabaseClient) {}

  async getByUserId(userId: string): Promise<RecurringFlow[]> {
    try {
      const { data, error } = await this.client
        .from('recurring_flows')
        .select('*')
        .eq('user_id', userId)
        .order('day_of_month', { ascending: true });

      if (error) {
        // Log but don't crash - allows app to boot while user applies SQL
        console.warn('Recurring flows fetch error (likely table missing):', error.message);
        return [];
      }
      return (data || []).map(row => this.mapToRecurringFlow(row));
    } catch (err) {
      console.error('Fatal recurring flows error:', err);
      return [];
    }
  }

  async getById(id: string): Promise<RecurringFlow | null> {
    const { data, error } = await this.client
      .from('recurring_flows')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) return null;
    return data ? this.mapToRecurringFlow(data) : null;
  }

  async create(flow: Omit<RecurringFlow, 'id' | 'createdAt' | 'updatedAt'>): Promise<RecurringFlow> {
    const { data, error } = await this.client
      .from('recurring_flows')
      .insert([
        {
          user_id: flow.userId,
          type: flow.type === 'gelir' ? 'income' : 'expense',
          amount: flow.amount,
          day_of_month: flow.dayOfMonth,
          category: flow.category,
          label: flow.description,
          is_fixed: flow.isFixed,
          is_active: flow.isActive,
        },
      ])
      .select()
      .single();

    if (error) throw error;
    return this.mapToRecurringFlow(data);
  }

  async update(id: string, flow: Partial<RecurringFlow>): Promise<RecurringFlow> {
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };
    if (flow.type) updateData.type = flow.type === 'gelir' ? 'income' : 'expense';
    if (flow.amount) updateData.amount = flow.amount;
    if (flow.dayOfMonth) updateData.day_of_month = flow.dayOfMonth;
    if (flow.category) updateData.category = flow.category;
    if (flow.description) updateData.label = flow.description;
    if (flow.isFixed !== undefined) updateData.is_fixed = flow.isFixed;
    if (flow.isActive !== undefined) updateData.is_active = flow.isActive;

    const { data, error } = await this.client
      .from('recurring_flows')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return this.mapToRecurringFlow(data);
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.client.from('recurring_flows').delete().eq('id', id);
    if (error) throw error;
  }

  private mapToRecurringFlow(row: any): RecurringFlow {
    return {
      id: row.id,
      userId: row.user_id,
      type: (row.type === 'income' || row.type === 'gelir') ? 'gelir' : 'gider',
      amount: row.amount,
      dayOfMonth: row.day_of_month,
      category: row.category,
      description: row.label || row.description || '',
      isFixed: row.is_fixed ?? true,
      isActive: row.is_active ?? true,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at || row.created_at),
    };
  }
}
