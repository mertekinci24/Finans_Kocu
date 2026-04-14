import { supabase } from '../adapter';
import type { SavingGoal, GoalStatus } from '../../goalService';

export class SupabaseGoalRepository {
  /**
   * Kullanıcının tüm hedeflerini getir
   */
  async getByUserId(userId: string): Promise<SavingGoal[]> {
    const { data, error } = await supabase
      .from('saving_goals')
      .select('*')
      .eq('user_id', userId)
      .order('priority', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(this.mapToGoal);
  }

  /**
   * Aktif hedefleri getir
   */
  async getActiveByUserId(userId: string): Promise<SavingGoal[]> {
    const { data, error } = await supabase
      .from('saving_goals')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('priority', { ascending: true });

    if (error) throw error;
    return (data || []).map(this.mapToGoal);
  }

  /**
   * Tek hedef getir
   */
  async getById(id: string): Promise<SavingGoal | null> {
    const { data, error } = await supabase
      .from('saving_goals')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data ? this.mapToGoal(data) : null;
  }

  /**
   * Yeni hedef oluştur
   */
  async create(goal: Omit<SavingGoal, 'id' | 'createdAt' | 'updatedAt'>): Promise<SavingGoal> {
    const { data, error } = await supabase
      .from('saving_goals')
      .insert({
        user_id: goal.userId,
        name: goal.name,
        category: goal.category,
        target_amount: goal.targetAmount,
        current_amount: goal.currentAmount,
        monthly_saving: goal.monthlySaving,
        target_date: goal.targetDate ? new Date(goal.targetDate).toISOString() : null,
        priority: goal.priority,
        status: goal.status,
        note: goal.note || null,
      })
      .select()
      .single();

    if (error) throw error;
    return this.mapToGoal(data);
  }

  /**
   * Hedefi güncelle
   */
  async update(id: string, updates: Partial<SavingGoal>): Promise<SavingGoal> {
    const updateData: Record<string, unknown> = {};

    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.category !== undefined) updateData.category = updates.category;
    if (updates.targetAmount !== undefined) updateData.target_amount = updates.targetAmount;
    if (updates.currentAmount !== undefined) updateData.current_amount = updates.currentAmount;
    if (updates.monthlySaving !== undefined) updateData.monthly_saving = updates.monthlySaving;
    if (updates.targetDate !== undefined) updateData.target_date = updates.targetDate ? new Date(updates.targetDate).toISOString() : null;
    if (updates.priority !== undefined) updateData.priority = updates.priority;
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.note !== undefined) updateData.note = updates.note;

    updateData.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('saving_goals')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return this.mapToGoal(data);
  }

  /**
   * Hedefe para ekle
   */
  async addFunds(id: string, amount: number): Promise<SavingGoal> {
    const current = await this.getById(id);
    if (!current) throw new Error('Goal not found');

    const newAmount = current.currentAmount + amount;
    const newStatus: GoalStatus = newAmount >= current.targetAmount ? 'completed' : current.status;

    return this.update(id, {
      currentAmount: newAmount,
      status: newStatus,
    });
  }

  /**
   * Hedefi sil
   */
  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('saving_goals')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  /**
   * Supabase row → SavingGoal type mapping
   */
  private mapToGoal(row: Record<string, unknown>): SavingGoal {
    return {
      id: row.id as string,
      userId: row.user_id as string,
      name: row.name as string,
      category: (row.category as string) as SavingGoal['category'],
      targetAmount: row.target_amount as number,
      currentAmount: row.current_amount as number,
      monthlySaving: row.monthly_saving as number,
      targetDate: row.target_date ? new Date(row.target_date as string) : undefined,
      priority: row.priority as SavingGoal['priority'],
      status: row.status as SavingGoal['status'],
      note: row.note as string | undefined,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    };
  }
}
