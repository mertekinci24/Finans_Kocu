import { supabase } from '../adapter';
import { FindeksReport, FindeksScoreHistory, ActionStep } from '@/types';
import type { FindeksReportRow, FindeksScoreHistoryRow } from '@/types/database';

export interface IFindeksRepository {
  createReport(report: Omit<FindeksReport, 'id' | 'createdAt' | 'updatedAt'>): Promise<FindeksReport>;
  getLatestReport(userId: string): Promise<FindeksReport | null>;
  getReportHistory(userId: string, limit?: number): Promise<FindeksReport[]>;
  getScoreHistory(userId: string, limit?: number): Promise<FindeksScoreHistory[]>;
  updateReportAnalysis(
    reportId: string,
    aiAnalysis: string,
    actionPlan: ActionStep[]
  ): Promise<FindeksReport>;
}

export class SupabaseFindeksRepository implements IFindeksRepository {
  async createReport(report: Omit<FindeksReport, 'id' | 'createdAt' | 'updatedAt'>): Promise<FindeksReport> {
    const row = {
      user_id: report.userId,
      file_name: report.fileName,
      credit_score: report.creditScore,
      limit_usage_ratio: report.limitUsageRatio,
      delay_months: report.delayMonths,
      delay_history: JSON.stringify(report.delayHistory),
      bank_accounts: report.bankAccounts,
      credit_cards: report.creditCards,
      active_debts: report.activeDebts,
      banks_list: JSON.stringify(report.banksList),
      risk_level: report.riskLevel,
      score_improvement_potential: report.scoreImprovementPotential,
      uploaded_at: report.uploadedAt,
      ai_analysis: report.aiAnalysis || null,
      action_plan: report.actionPlan ? JSON.stringify(report.actionPlan) : null,
    };

    const { data, error } = await supabase.from('findeks_reports').insert([row]).select().maybeSingle();

    if (error) throw error;
    if (!data) throw new Error('Failed to create Findeks report');

    return this.mapToReport(data);
  }

  async getLatestReport(userId: string): Promise<FindeksReport | null> {
    const { data, error } = await supabase
      .from('findeks_reports')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data ? this.mapToReport(data) : null;
  }

  async getReportHistory(userId: string, limit = 12): Promise<FindeksReport[]> {
    const { data, error } = await supabase
      .from('findeks_reports')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data || []).map((row) => this.mapToReport(row));
  }

  async getScoreHistory(userId: string, limit = 24): Promise<FindeksScoreHistory[]> {
    const { data, error } = await supabase
      .from('findeks_score_history')
      .select('*')
      .eq('user_id', userId)
      .order('recorded_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data || []).map((row) => this.mapToScoreHistory(row));
  }

  async updateReportAnalysis(
    reportId: string,
    aiAnalysis: string,
    actionPlan: ActionStep[]
  ): Promise<FindeksReport> {
    const { data, error } = await supabase
      .from('findeks_reports')
      .update({
        ai_analysis: aiAnalysis,
        action_plan: JSON.stringify(actionPlan),
        updated_at: new Date().toISOString(),
      })
      .eq('id', reportId)
      .select()
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error('Failed to update Findeks report');

    return this.mapToReport(data);
  }

  private mapToReport(row: FindeksReportRow): FindeksReport {
    return {
      id: row.id,
      userId: row.user_id,
      fileName: row.file_name,
      creditScore: row.credit_score,
      limitUsageRatio: row.limit_usage_ratio,
      delayMonths: row.delay_months,
      delayHistory: row.delay_history ? JSON.parse(row.delay_history) : [],
      bankAccounts: row.bank_accounts,
      creditCards: row.credit_cards,
      activeDebts: row.active_debts,
      banksList: row.banks_list ? JSON.parse(row.banks_list) : [],
      aiAnalysis: row.ai_analysis,
      actionPlan: row.action_plan ? JSON.parse(row.action_plan) : undefined,
      riskLevel: row.risk_level,
      scoreImprovementPotential: row.score_improvement_potential,
      uploadedAt: new Date(row.uploaded_at),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  private mapToScoreHistory(row: FindeksScoreHistoryRow): FindeksScoreHistory {
    return {
      id: row.id,
      userId: row.user_id,
      reportId: row.report_id,
      score: row.score,
      recordedAt: new Date(row.recorded_at),
      previousScore: row.previous_score || undefined,
      scoreChange: row.score_change || undefined,
    };
  }
}
