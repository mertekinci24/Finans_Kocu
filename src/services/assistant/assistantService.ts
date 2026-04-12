import { AssistantContextCache, ChatMessage, SuggestedTransaction } from '@/types';

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-3-5-sonnet-20241022';
const MAX_TOKENS = 512;

export interface AssistantResponse {
  message: string;
  suggestedTransaction?: SuggestedTransaction;
  tokensUsed: number;
}

export async function sendAssistantMessage(
  userMessage: string,
  context: AssistantContextCache,
  previousMessages: ChatMessage[],
  apiKey: string
): Promise<AssistantResponse> {
  const systemPrompt = buildSystemPrompt(context);
  const messages = buildMessageHistory(previousMessages, userMessage);

  try {
    const response = await fetch(CLAUDE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: systemPrompt,
        messages,
      }),
    });

    if (!response.ok) {
      throw new Error(`Claude API error: ${response.statusText}`);
    }

    const result = await response.json();
    const assistantMessage = result.content[0].text;
    const tokensUsed = result.usage?.output_tokens || 0;

    const suggestedTransaction = extractSuggestedTransaction(assistantMessage);

    return {
      message: assistantMessage,
      suggestedTransaction,
      tokensUsed,
    };
  } catch (error) {
    throw new Error(
      `Assistant message failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

function buildSystemPrompt(context: AssistantContextCache): string {
  const accountsInfo = context.accountsSummary
    .map((a) => `${a.name} (${a.type}): ₺${a.balance.toLocaleString('tr-TR')}`)
    .join('\n');

  const topCategoriesInfo = context.transactionsTrend.topCategories
    .map((c) => `${c.name}: ₺${c.amount.toLocaleString('tr-TR')}`)
    .join('\n');

  const alertsInfo = context.alerts.length > 0 ? `\n⚠️ Dikkat Çeken Noktalar:\n${context.alerts.join('\n')}` : '';

  return `Sen FinansKoçu'nun AI Asistanısın. Kullanıcıyla WhatsApp gibi samimi, kolay bir diyalogta konuş.

**Kullanıcının Güncel Mali Durumu:**
- Hesaplar:
${accountsInfo}
- Aylık Ortalama Gelir: ₺${context.transactionsTrend.avgMonthlyIncome.toLocaleString('tr-TR')}
- Aylık Ortalama Gider: ₺${context.transactionsTrend.avgMonthlyExpense.toLocaleString('tr-TR')}
- Tasarruf Oranı: %${context.transactionsTrend.savingsRate.toFixed(1)}
- En Çok Harcanan Kategoriler:
${topCategoriesInfo}
${context.findeksScore ? `- Findeks Kredi Notu: ${context.findeksScore}` : ''}${alertsInfo}

**Kurallar:**
1. Kullanıcının gerçek verilerine dayanarak tavsiye ver (örn: "Garanti kartındaki taksit yükü gelirinizin %35'i")
2. "Yazıyor..." hissi vermek için kısa cümleler kullan
3. Eğer kullanıcı bir işlem söylerse ("500 TL market"), JSON formatında öner: {"action": "suggest_transaction", "amount": 500, "category": "Yiyecek", "description": "Market", "type": "gider"}
4. Yargılama yapma — destek ve rehberlik tonu
5. Türkçe, konuşma dili, "koç" tonu`;
}

function buildMessageHistory(previousMessages: ChatMessage[], newUserMessage: string): Array<{role: string; content: string}> {
  const messages: Array<{role: string; content: string}> = [];

  previousMessages.forEach((msg) => {
    messages.push({
      role: msg.role,
      content: msg.content,
    });
  });

  messages.push({
    role: 'user',
    content: newUserMessage,
  });

  return messages;
}

function extractSuggestedTransaction(
  assistantMessage: string
): SuggestedTransaction | undefined {
  try {
    const jsonMatch = assistantMessage.match(/\{[\s\S]*"action":\s*"suggest_transaction"[\s\S]*\}/);
    if (!jsonMatch) return undefined;

    const parsed = JSON.parse(jsonMatch[0]);
    if (parsed.action !== 'suggest_transaction') return undefined;

    const today = new Date();
    const date = new Date(parsed.date || today);

    return {
      amount: parsed.amount,
      category: parsed.category,
      description: parsed.description,
      date,
      type: parsed.type || 'gider',
      confidence: 0.8,
    };
  } catch {
    return undefined;
  }
}
