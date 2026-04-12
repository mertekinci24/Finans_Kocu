import { supabase } from '../adapter';
import { TaxObligation, TaxPaymentHistory, BaskurProfile } from '@/types';

export interface ITaxRepository {
  getTaxObligations(userId?: string): Promise<TaxObligation[]>;
  markPaymentStatus(obligationId: string, status: 'paid' | 'overdue'): Promise<void>;
  recordPayment(userId: string, obligationType: string, amountPaid: number, dueDate: Date): Promise<TaxPaymentHistory>;
  getBaskurProfile(userId: string): Promise<BaskurProfile | null>;
  upsertBaskurProfile(userId: string, profile: Omit<BaskurProfile, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<BaskurProfile>;
}

export class SupabaseTaxRepository implements ITaxRepository {
  async getTaxObligations(userId?: string): Promise<TaxObligation[]> {
    let query = supabase.from('tax_obligations').select('*');

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return (data || []).map((row) => this.mapToObligation(row));
  }

  async markPaymentStatus(obligationId: string, status: 'paid' | 'overdue'): Promise<void> {
    const { error } = await supabase
      .from('tax_obligations')
      .update({ payment_status: status, updated_at: new Date().toISOString() })
      .eq('id', obligationId);

    if (error) throw error;
  }

  async recordPayment(
    userId: string,
    obligationType: string,
    amountPaid: number,
    dueDate: Date
  ): Promise<TaxPaymentHistory> {
    const today = new Date();
    const isOnTime = today.getTime() <= dueDate.getTime();

    const { data, error } = await supabase
      .from('tax_payment_history')
      .insert([
        {
          user_id: userId,
          obligation_type: obligationType,
          paid_date: today.toISOString().split('T')[0],
          amount_paid: amountPaid,
          is_on_time: isOnTime,
        },
      ])
      .select()
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error('Failed to record payment');

    return {
      id: data.id,
      userId: data.user_id,
      obligationType: data.obligation_type,
      paidDate: new Date(data.paid_date),
      amountPaid: data.amount_paid,
      isOnTime: data.is_on_time,
      createdAt: new Date(data.created_at),
    };
  }

  async getBaskurProfile(userId: string): Promise<BaskurProfile | null> {
    const { data, error } = await supabase
      .from('baskur_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    return data ? this.mapToBaskurProfile(data) : null;
  }

  async upsertBaskurProfile(
    userId: string,
    profile: Omit<BaskurProfile, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
  ): Promise<BaskurProfile> {
    const { data, error } = await supabase
      .from('baskur_profiles')
      .upsert(
        {
          user_id: userId,
          profile_type: profile.profileType,
          gross_income_monthly: profile.grossIncomeMonthly,
          baskur_tier: profile.baskurTier,
          monthly_premium: profile.monthlyPremium,
          is_active: profile.isActive,
        },
        { onConflict: 'user_id' }
      )
      .select()
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error('Failed to upsert Bağkur profile');

    return this.mapToBaskurProfile(data);
  }

  private mapToObligation(row: any): TaxObligation {
    return {
      id: row.id,
      userId: row.user_id,
      obligationType: row.obligation_type,
      dueDate: new Date(row.due_date),
      description: row.description,
      estimatedAmount: row.estimated_amount || 0,
      paymentStatus: row.payment_status,
      reminderSent: row.reminder_sent || false,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  private mapToBaskurProfile(row: any): BaskurProfile {
    return {
      id: row.id,
      userId: row.user_id,
      profileType: row.profile_type,
      grossIncomeMonthly: row.gross_income_monthly,
      baskurTier: row.baskur_tier,
      monthlyPremium: row.monthly_premium,
      isActive: row.is_active,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}
