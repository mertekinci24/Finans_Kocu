import type { SupabaseClient } from '@supabase/supabase-js';
import type { IUserRepository } from '../../types';
import type { User } from '@types';

export class SupabaseUserRepository implements IUserRepository {
  constructor(private client: SupabaseClient) {}

  async getById(id: string): Promise<User | null> {
    const { data, error } = await this.client
      .from('users')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  async create(user: Omit<User, 'id' | 'createdAt'>): Promise<User> {
    const { data, error } = await this.client
      .from('users')
      .insert([user])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async update(id: string, user: Partial<User>): Promise<User> {
    const { data, error } = await this.client
      .from('users')
      .update(user)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.client.from('users').delete().eq('id', id);
    if (error) throw error;
  }
}
