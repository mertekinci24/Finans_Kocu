import type { SupabaseClient } from '@supabase/supabase-js';
import type { IInstallmentRepository } from '../../types';
import type { Installment } from '@types';

export class SupabaseInstallmentRepository implements IInstallmentRepository {
  constructor(private client: SupabaseClient) {}

  async getByUserId(userId: string): Promise<Installment[]> {
    const { data, error } = await this.client
      .from('installments')
      .select('*')
      .eq('userId', userId)
      .order('createdAt', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async getById(id: string): Promise<Installment | null> {
    const { data, error } = await this.client
      .from('installments')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  async create(installment: Omit<Installment, 'id' | 'createdAt'>): Promise<Installment> {
    const { data, error } = await this.client
      .from('installments')
      .insert([installment])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async update(id: string, installment: Partial<Installment>): Promise<Installment> {
    const { data, error } = await this.client
      .from('installments')
      .update(installment)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.client.from('installments').delete().eq('id', id);
    if (error) throw error;
  }
}
