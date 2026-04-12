import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { dataSourceAdapter } from '@/services/supabase/adapter';
import { buildUserContext } from '@/services/assistant/ragContextBuilder';
import { sendAssistantMessage } from '@/services/assistant/assistantService';
import ChatInterface from '@/components/assistant/ChatInterface';
import { ChatSession, ChatMessage, SuggestedTransaction } from '@/types';

export default function Assistant() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSession, setActiveSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user) {
      loadSessions();
    }
  }, [user]);

  useEffect(() => {
    if (activeSession) {
      loadMessages();
    }
  }, [activeSession]);

  const loadSessions = async () => {
    if (!user) return;
    const userSessions = await dataSourceAdapter.chat.getUserSessions(user.id);
    setSessions(userSessions);
    if (userSessions.length === 0) {
      createNewSession();
    } else {
      setActiveSession(userSessions[0]);
    }
  };

  const loadMessages = async () => {
    if (!activeSession) return;
    const sessionMessages = await dataSourceAdapter.chat.getMessages(activeSession.id);
    setMessages(sessionMessages);
  };

  const createNewSession = async () => {
    if (!user) return;
    const newSession = await dataSourceAdapter.chat.createSession(user.id, 'Yeni Sohbet');
    setSessions((prev) => [newSession, ...prev]);
    setActiveSession(newSession);
    setMessages([]);
  };

  const handleSendMessage = async (text: string) => {
    if (!user || !activeSession) return;

    setIsLoading(true);

    try {
      const userMsg = await dataSourceAdapter.chat.addMessage(
        activeSession.id,
        user.id,
        'user',
        text,
        undefined,
        0
      );
      setMessages((prev) => [...prev, userMsg]);

      const context = await buildUserContext(user.id);
      const apiKey = import.meta.env.VITE_CLAUDE_API_KEY;

      if (!apiKey) {
        throw new Error('Claude API key not configured');
      }

      const response = await sendAssistantMessage(text, context, messages, apiKey);

      const assistantMsg = await dataSourceAdapter.chat.addMessage(
        activeSession.id,
        user.id,
        'assistant',
        response.message,
        response.suggestedTransaction,
        response.tokensUsed
      );
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (error) {
      console.error('Assistant error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptTransaction = async (transaction: SuggestedTransaction) => {
    if (!user) return;

    try {
      const accounts = await dataSourceAdapter.account.getByUserId(user.id);
      const primaryAccount = accounts.find((a) => a.isActive) || accounts[0];

      if (!primaryAccount) {
        alert('Lütfen önce bir hesap oluşturun');
        return;
      }

      await dataSourceAdapter.transaction.create({
        accountId: primaryAccount.id,
        amount: transaction.amount,
        description: transaction.description,
        category: transaction.category,
        date: transaction.date,
        type: transaction.type,
      });

      setMessages((prev) =>
        prev.map((msg) =>
          msg.suggestedTransaction ? { ...msg, suggestedTransaction: undefined } : msg
        )
      );

      alert('İşlem kaydedildi!');
    } catch (error) {
      console.error('Transaction save error:', error);
      alert('İşlem kaydedilirken hata oluştu');
    }
  };

  return (
    <div className="flex h-full gap-4 animate-fade-in">
      <div className="w-64 bg-neutral-50 rounded-lg p-4 border border-neutral-200 flex flex-col">
        <h2 className="text-lg font-bold mb-4">Sohbetler</h2>

        <button
          onClick={createNewSession}
          className="w-full mb-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
        >
          + Yeni Sohbet
        </button>

        <div className="flex-1 space-y-2 overflow-y-auto">
          {sessions.map((session) => (
            <button
              key={session.id}
              onClick={() => setActiveSession(session)}
              className={`w-full text-left px-3 py-2 rounded-lg transition-colors truncate ${
                activeSession?.id === session.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-white hover:bg-neutral-100 text-neutral-900'
              }`}
              title={session.title}
            >
              {session.title}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="mb-4">
          <h1 className="text-2xl font-bold">AI Finansal Danışman</h1>
          <p className="text-neutral-600 text-sm">
            Doğal dille finansal sorularını sor, aksiyon al
          </p>
        </div>

        {activeSession && (
          <ChatInterface
            messages={messages}
            isLoading={isLoading}
            onSendMessage={handleSendMessage}
            onAcceptTransaction={handleAcceptTransaction}
          />
        )}
      </div>
    </div>
  );
}
