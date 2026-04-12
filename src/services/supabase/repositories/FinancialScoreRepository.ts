import type { SupabaseClient } from '@supabase/supabase-js';
import type { IFinancialScoreRepository } from '../../types';
import type { FinancialScore } from '@types';

export class SupabaseFinancialScoreRepository implements IFinancialScoreRepository {
  constructor(private client: SupabaseClient) {}

  async getByUserId(userId: string): Promise<FinancialScore | null> {
    const { data, error } = await this.client
      .from('financial_scores')
      .select('*')
      .eq('userId', userId)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  async create(
    userId: string,
    score: Omit<FinancialScore, 'lastCalculatedAt'>
  ): Promise<FinancialScore> {
    const { data, error } = await this.client
      .from('financial_scores')
      .insert([{ userId, ...score }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async update(userId: string, score: Partial<FinancialScore>): Promise<FinancialScore> {
    const { data, error } = await this.client
      .from('financial_scores')
      .update(score)
      .eq('userId', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}
