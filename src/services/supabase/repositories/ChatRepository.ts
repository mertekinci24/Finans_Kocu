import { supabase } from '../adapter';
import { ChatSession, ChatMessage, SuggestedTransaction } from '@/types';

export interface IChatRepository {
  createSession(userId: string, title: string): Promise<ChatSession>;
  getSession(sessionId: string): Promise<ChatSession | null>;
  getUserSessions(userId: string): Promise<ChatSession[]>;
  getMessages(sessionId: string): Promise<ChatMessage[]>;
  addMessage(
    sessionId: string,
    userId: string,
    role: 'user' | 'assistant',
    content: string,
    suggestedTransaction?: SuggestedTransaction,
    tokensUsed?: number
  ): Promise<ChatMessage>;
}

export class SupabaseChatRepository implements IChatRepository {
  async createSession(userId: string, title: string): Promise<ChatSession> {
    const { data, error } = await supabase
      .from('chat_sessions')
      .insert([{ user_id: userId, title }])
      .select()
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error('Failed to create chat session');

    return this.mapToSession(data);
  }

  async getSession(sessionId: string): Promise<ChatSession | null> {
    const { data, error } = await supabase
      .from('chat_sessions')
      .select('*')
      .eq('id', sessionId)
      .maybeSingle();

    if (error) throw error;
    return data ? this.mapToSession(data) : null;
  }

  async getUserSessions(userId: string): Promise<ChatSession[]> {
    const { data, error } = await supabase
      .from('chat_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) throw error;
    return (data || []).map((row) => this.mapToSession(row));
  }

  async getMessages(sessionId: string): Promise<ChatMessage[]> {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return (data || []).map((row) => this.mapToMessage(row));
  }

  async addMessage(
    sessionId: string,
    userId: string,
    role: 'user' | 'assistant',
    content: string,
    suggestedTransaction?: SuggestedTransaction,
    tokensUsed = 0
  ): Promise<ChatMessage> {
    const { data, error } = await supabase
      .from('chat_messages')
      .insert([
        {
          session_id: sessionId,
          user_id: userId,
          role,
          content,
          suggested_transaction: suggestedTransaction ? JSON.stringify(suggestedTransaction) : null,
          tokens_used: tokensUsed,
        },
      ])
      .select()
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error('Failed to add message');

    return this.mapToMessage(data);
  }

  private mapToSession(row: any): ChatSession {
    return {
      id: row.id,
      userId: row.user_id,
      title: row.title,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  private mapToMessage(row: any): ChatMessage {
    return {
      id: row.id,
      sessionId: row.session_id,
      userId: row.user_id,
      role: row.role,
      content: row.content,
      suggestedTransaction: row.suggested_transaction ? JSON.parse(row.suggested_transaction) : undefined,
      tokensUsed: row.tokens_used || 0,
      createdAt: new Date(row.created_at),
    };
  }
}
