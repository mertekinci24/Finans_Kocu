import { supabase } from '../adapter';
import { ChatSession, ChatMessage, SuggestedTransaction, ChatAttachment } from '@/types';
import type { ChatSessionRow, ChatMessageRow } from '@/types/database';

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
    attachment?: ChatAttachment,
    tokensUsed?: number
  ): Promise<ChatMessage>;
  renameSession(sessionId: string, newTitle: string): Promise<void>;
  deleteSession(sessionId: string): Promise<void>;
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
    attachment?: ChatAttachment,
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
          attachment: attachment ? JSON.stringify(attachment) : null,
          tokens_used: tokensUsed,
        },
      ])
      .select()
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error('Failed to add message');

    return this.mapToMessage(data);
  }

  async renameSession(sessionId: string, newTitle: string): Promise<void> {
    const { error } = await supabase
      .from('chat_sessions')
      .update({
        title: newTitle.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId);

    if (error) throw error;
  }

  // Assuming chat_messages.session_id has ON DELETE CASCADE configured in the database
  async deleteSession(sessionId: string): Promise<void> {
    const { data, error } = await supabase
      .from('chat_sessions')
      .delete()
      .eq('id', sessionId)
      .select('id');

    if (error) throw error;

    if (!data || data.length === 0) {
      throw new Error(
        'Delete failed: no chat session row was deleted. Check RLS DELETE policy or session ownership.'
      );
    }
  }

  private mapToSession(row: ChatSessionRow): ChatSession {
    return {
      id: row.id,
      userId: row.user_id,
      title: row.title,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  private mapToMessage(row: ChatMessageRow): ChatMessage {
    return {
      id: row.id,
      sessionId: row.session_id,
      userId: row.user_id,
      role: row.role as 'user' | 'assistant',
      content: row.content,
      suggestedTransaction: row.suggested_transaction ? JSON.parse(row.suggested_transaction) : undefined,
      attachment: row.attachment ? JSON.parse(row.attachment) : undefined,
      tokensUsed: row.tokens_used || 0,
      createdAt: new Date(row.created_at),
    };
  }
}
