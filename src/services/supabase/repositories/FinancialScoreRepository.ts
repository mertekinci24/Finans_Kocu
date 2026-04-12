import type { SupabaseClient } from '@supabase/supabase-js';
import type { IFinancialScoreRepository } from '../../types';
import type { FinancialScore } from '@types';

export class SupabaseFinancialScoreRepository implements IFinancialScoreRepository {
  constructor(private client: SupabaseClient) {}

  async getByUserId(userId: string): Promise<FinancialScore | null> {
    const { data, error } = await this.client
      .from('financial_scores')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    return data ? this.mapToFinancialScore(data) : null;
  }

  async create(
    userId: string,
    score: Omit<FinancialScore, 'lastCalculatedAt'>
  ): Promise<FinancialScore> {
    const { data, error } = await this.client
      .from('financial_scores')
      .insert([
        {
          user_id: userId,
          overall_score: score.overallScore,
          confidence_score: score.confidenceScore,
          debt_to_income_ratio: score.debtToIncomeRatio,
          cash_buffer_months: score.cashBufferMonths,
          savings_rate: score.savingsRate,
          installment_burden_ratio: score.installmentBurdenRatio,
        },
      ])
      .select()
      .single();

    if (error) throw error;
    return this.mapToFinancialScore(data);
  }

  async update(userId: string, score: Partial<FinancialScore>): Promise<FinancialScore> {
    const { data, error } = await this.client
      .from('financial_scores')
      .update({
        overall_score: score.overallScore,
        confidence_score: score.confidenceScore,
        debt_to_income_ratio: score.debtToIncomeRatio,
        cash_buffer_months: score.cashBufferMonths,
        savings_rate: score.savingsRate,
        installment_burden_ratio: score.installmentBurdenRatio,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return this.mapToFinancialScore(data);
  }

  private mapToFinancialScore(row: any): FinancialScore {
    return {
      overallScore: row.overall_score,
      confidenceScore: row.confidence_score,
      debtToIncomeRatio: row.debt_to_income_ratio,
      cashBufferMonths: row.cash_buffer_months,
      savingsRate: row.savings_rate,
      installmentBurdenRatio: row.installment_burden_ratio,
      lastCalculatedAt: new Date(row.last_calculated_at),
    };
  }
}
