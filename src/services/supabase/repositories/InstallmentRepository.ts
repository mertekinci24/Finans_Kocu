import type { SupabaseClient } from '@supabase/supabase-js';
import type { IInstallmentRepository } from '../../types';
import type { Installment } from '@types';
import type { InstallmentRow } from '@/types/database';

export class SupabaseInstallmentRepository implements IInstallmentRepository {
  constructor(private client: SupabaseClient) {}

  async getByUserId(userId: string): Promise<Installment[]> {
    const { data, error } = await this.client
      .from('installments')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(this.mapToInstallment);
  }

  async getById(id: string): Promise<Installment | null> {
    const { data, error } = await this.client
      .from('installments')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data ? this.mapToInstallment(data) : null;
  }

  async create(installment: Omit<Installment, 'id' | 'createdAt'>): Promise<Installment> {
    const { data, error } = await this.client
      .from('installments')
      .insert([
        {
          user_id: installment.userId,
          account_id: installment.accountId || null,
          lender_name: installment.lenderName,
          type: installment.type,
          principal: installment.principal,
          monthly_payment: installment.monthlyPayment,
          remaining_months: installment.remainingMonths,
          total_months: installment.totalMonths,
          interest_rate: installment.interestRate,
          next_payment_date: installment.nextPaymentDate.toISOString().split('T')[0],
          first_payment_date: installment.firstPaymentDate.toISOString().split('T')[0],
          status: installment.status,
          payment_history: installment.paymentHistory || {},
          note: installment.note || null,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Creation Error:', error);
      throw error;
    }
    return this.mapToInstallment(data);
  }

  async update(id: string, installment: Partial<Installment>): Promise<Installment> {
    const { data, error } = await this.client
      .from('installments')
      .update({
        ...(installment.accountId !== undefined && { account_id: installment.accountId }),
        ...(installment.lenderName !== undefined && { lender_name: installment.lenderName }),
        ...(installment.type !== undefined && { type: installment.type }),
        ...(installment.principal !== undefined && { principal: installment.principal }),
        ...(installment.monthlyPayment !== undefined && { monthly_payment: installment.monthlyPayment }),
        ...(installment.remainingMonths !== undefined && { remaining_months: installment.remainingMonths }),
        ...(installment.totalMonths !== undefined && { total_months: installment.totalMonths }),
        ...(installment.interestRate !== undefined && { interest_rate: installment.interestRate }),
        next_payment_date: installment.nextPaymentDate
          ? (typeof installment.nextPaymentDate === 'string' 
              ? installment.nextPaymentDate 
              : installment.nextPaymentDate.toISOString().split('T')[0])
          : undefined,
        first_payment_date: installment.firstPaymentDate
          ? (typeof installment.firstPaymentDate === 'string'
              ? installment.firstPaymentDate
              : installment.firstPaymentDate.toISOString().split('T')[0])
          : undefined,
        ...(installment.status !== undefined && { status: installment.status }),
        // 🚨 DATA LEGACY POLLUTION FIX: Reset payment history if explicitly provided or as part of a restructuring flag
        ...(installment.paymentHistory !== undefined && { payment_history: installment.paymentHistory }),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Update Error:', error);
      throw error;
    }
    return this.mapToInstallment(data);
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.client.from('installments').delete().eq('id', id);
    if (error) throw error;
  }

  private mapToInstallment(row: InstallmentRow): Installment {
    return {
      id: row.id,
      userId: row.user_id,
      accountId: row.account_id || undefined,
      lenderName: row.lender_name,
      type: row.type as any,
      principal: row.principal,
      monthlyPayment: row.monthly_payment,
      remainingMonths: row.remaining_months,
      totalMonths: row.total_months,
      interestRate: row.interest_rate,
      nextPaymentDate: new Date(row.next_payment_date),
      firstPaymentDate: row.first_payment_date 
        ? new Date(row.first_payment_date) 
        : (() => {
            const d = new Date(row.next_payment_date);
            d.setMonth(d.getMonth() - (row.total_months - row.remaining_months));
            return d;
          })(),
      status: row.status as any,
      paymentHistory: row.payment_history,
      note: row.note || undefined,
      createdAt: new Date(row.created_at),
    };
  }
}
