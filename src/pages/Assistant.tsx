import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { dataSourceAdapter } from '@/services/supabase/adapter';
import { buildUserContext } from '@/services/assistant/ragContextBuilder';
import { sendAssistantMessage } from '@/services/assistant/assistantService';
import ChatInterface from '@/components/assistant/ChatInterface';
import { ChatSession, ChatMessage, SuggestedTransaction } from '@/types';

type AssistantEntryMode = "findeks_bridge" | "general_finance";

const getFieldValue = (field: any) => {
  if (field && typeof field === "object" && "value" in field) {
    return field.value ?? "bulunamadı";
  }
  return field ?? "bulunamadı";
};

const buildDefaultFindeksQuery = (data: any) => {
  const score = getFieldValue(data?.creditScore);
  const docType = data?.documentType || data?.scope || "unknown";
  return `Findeks raporumu analiz eder misin? Kredi notum ${score}. Bu rapor tipi: ${docType}. Eksik alanları sıfır kabul etmeden ve varsayım yapmadan değerlendir.`;
};

export default function Assistant() {
  const { user } = useAuth();
  const location = useLocation();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSession, setActiveSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const hasTriggeredRef = useRef(false);
  const pendingBridgeRef = useRef<{
    mode: AssistantEntryMode;
    findeksData?: any;
    initialQuery?: string;
  } | null>(null);

  const entryMode: AssistantEntryMode =
    location.state?.findeksData ? "findeks_bridge" : "general_finance";

  useEffect(() => {
    if (user) {
      loadSessions();
    }
  }, [user]);

  useEffect(() => {
    if (location.state?.findeksData && !hasTriggeredRef.current) {
      pendingBridgeRef.current = {
        mode: "findeks_bridge",
        findeksData: location.state.findeksData,
        initialQuery: location.state.initialQuery,
      };

      console.log("[ASSISTANT_BRIDGE_CAPTURED]", {
        documentType: location.state.findeksData?.documentType,
        parserVersion: location.state.findeksData?.parserVersion,
        missingFields: location.state.findeksData?.missingFields,
      });
    }
  }, [location.state]);

  useEffect(() => {
    if (activeSession) {
      loadMessages();
    }
  }, [activeSession]);

  useEffect(() => {
    const payload = pendingBridgeRef.current;

    if (
      activeSession &&
      !hasTriggeredRef.current &&
      !isLoading &&
      payload?.mode === "findeks_bridge"
    ) {
      const initialQuery =
        payload.initialQuery || buildDefaultFindeksQuery(payload.findeksData);

      const timer = setTimeout(() => {
        if (hasTriggeredRef.current) return;

        hasTriggeredRef.current = true;

        handleSendMessage(initialQuery, {
          findeksOverride: payload.findeksData,
          entryMode: "findeks_bridge",
        });

        pendingBridgeRef.current = null;

        console.log("[ASSISTANT_BRIDGE_SENT]", {
          documentType: payload.findeksData?.documentType,
          missingFields: payload.findeksData?.missingFields,
        });
      }, 800);

      return () => clearTimeout(timer);
    }
  }, [activeSession, isLoading]);

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

  const handleSendMessage = async (
    text: string,
    options?: {
      findeksOverride?: any;
      entryMode?: AssistantEntryMode;
    }
  ) => {
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
      
      const enrichedContext = {
        ...context,
        findeksData: options?.findeksOverride ?? context.findeksData,
        assistantEntryMode: options?.entryMode ?? entryMode,
      };

      const response = await sendAssistantMessage(text, enrichedContext, messages);

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
      const msg = error instanceof Error ? error.message : 'Asistan hatası';
      if (activeSession) {
        const errorMsg = await dataSourceAdapter.chat.addMessage(
          activeSession.id,
          user.id,
          'assistant',
          `Hata: ${msg}`,
          undefined,
          0
        );
        setMessages((prev) => [...prev, errorMsg]);
      }
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
