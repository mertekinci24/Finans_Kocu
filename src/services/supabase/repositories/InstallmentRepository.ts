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
          lender_name: installment.lenderName,
          principal: installment.principal,
          monthly_payment: installment.monthlyPayment,
          remaining_months: installment.remainingMonths,
          total_months: installment.totalMonths,
          interest_rate: installment.interestRate,
          next_payment_date: installment.nextPaymentDate.toISOString().split('T')[0],
          status: installment.status,
        },
      ])
      .select()
      .single();

    if (error) throw error;
    return this.mapToInstallment(data);
  }

  async update(id: string, installment: Partial<Installment>): Promise<Installment> {
    const { data, error } = await this.client
      .from('installments')
      .update({
        lender_name: installment.lenderName,
        principal: installment.principal,
        monthly_payment: installment.monthlyPayment,
        remaining_months: installment.remainingMonths,
        total_months: installment.totalMonths,
        interest_rate: installment.interestRate,
        next_payment_date: installment.nextPaymentDate
          ? installment.nextPaymentDate.toISOString().split('T')[0]
          : undefined,
        status: installment.status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
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
      lenderName: row.lender_name,
      principal: row.principal,
      monthlyPayment: row.monthly_payment,
      remainingMonths: row.remaining_months,
      totalMonths: row.total_months,
      interestRate: row.interest_rate,
      nextPaymentDate: new Date(row.next_payment_date),
      status: row.status,
      createdAt: new Date(row.created_at),
    };
  }
}
