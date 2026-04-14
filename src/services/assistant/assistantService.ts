import { AssistantContextCache, ChatMessage, SuggestedTransaction } from '@/types';

// Claude API çağrıları Edge Function üzerinden yapılır — API key sunucuda
const AI_PROXY_URL = '/api/ai/claude';
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
  _apiKey?: string // Legacy param — artık kullanılmıyor, Edge Function'dan gelir
): Promise<AssistantResponse> {
  const systemPrompt = buildSystemPrompt(context);
  const messages = buildMessageHistory(previousMessages, userMessage);

  try {
    const response = await fetch(AI_PROXY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
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

// ─── Senaryo Analizi (Claude Sonnet 4.6) ────────────────────────────
export interface ScenarioAnalysisInput {
  scenarioDescription: string;
  baselineScore: number;
  scenarioScore: number;
  scoreDelta: number;
  cashTightnessDate: Date | null;
  breakEvenMonth: number | null;
  riskLevel: 'safe' | 'moderate' | 'risky';
  recommendations: string[];
  baselineEndBalance: number;
  scenarioEndBalance: number;
}

/**
 * Claude Sonnet 4.6 ile senaryo analiz yorumu üretir.
 * API key yoksa kural bazlı fallback yorum döndürür.
 */
export async function analyzeScenario(
  input: ScenarioAnalysisInput,
  apiKey: string | null
): Promise<string> {
  // Fallback: API key yoksa kural bazlı yorum üret
  if (!apiKey) {
    return generateFallbackScenarioAnalysis(input);
  }

  const systemPrompt = `Sen FinansKoçu'nun senaryo analiz uzmanısın. Kullanıcının test ettiği senaryoyu analiz edip samimi, yargılamayan bir koç tonunda yorum yap.

Kurallar:
1. Türkçe konuş, samimi ol, "sen" de
2. Kısa vadeli risk ve uzun vadeli fayda dengesini kur
3. Somut rakamlar kullan
4. 2-3 paragraf yaz
5. Emoji kullan ama abartma
6. Yargılama — destek ve rehberlik tonu`;

  const userPrompt = `Kullanıcı şu senaryoyu test etti:
${input.scenarioDescription}

📊 Finansal Durum:
- Mevcut Skor: ${input.baselineScore}/100
- Senaryo Sonrası Skor: ${input.scenarioScore}/100 (${input.scoreDelta >= 0 ? '+' : ''}${input.scoreDelta})
- Mevcut 6 Ay Sonu Bakiye: ₺${input.baselineEndBalance.toLocaleString('tr-TR')}
- Senaryo 6 Ay Sonu Bakiye: ₺${input.scenarioEndBalance.toLocaleString('tr-TR')}
- Nakit Tıkanıklığı: ${input.cashTightnessDate ? new Date(input.cashTightnessDate).toLocaleDateString('tr-TR') : 'Yok'}
- Kâra Geçiş: ${input.breakEvenMonth ? `${input.breakEvenMonth}. aydan itibaren` : 'Hemen'}
- Risk Seviyesi: ${input.riskLevel === 'safe' ? 'Güvenli' : input.riskLevel === 'moderate' ? 'Orta Riskli' : 'Yüksek Riskli'}

Bu senaryoyu koç tonunda analiz et.`;

  try {
    const response = await fetch(AI_PROXY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 600,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });

    if (!response.ok) {
      return generateFallbackScenarioAnalysis(input);
    }

    const result = await response.json();
    return result.content[0].text;
  } catch {
    return generateFallbackScenarioAnalysis(input);
  }
}

/**
 * API key yokken kural bazlı senaryo yorumu üretir
 */
function generateFallbackScenarioAnalysis(input: ScenarioAnalysisInput): string {
  const parts: string[] = [];

  if (input.scoreDelta > 0) {
    parts.push(
      `Bu senaryo finansal sağlık skorunu ${input.baselineScore}'dan ${input.scenarioScore}'ye çıkarır (+${input.scoreDelta} puan). 📈`
    );
  } else if (input.scoreDelta < 0) {
    parts.push(
      `Bu senaryo finansal sağlık skorunu ${input.baselineScore}'dan ${input.scenarioScore}'ye düşürür (${input.scoreDelta} puan). 📉`
    );
  } else {
    parts.push(`Bu senaryo finansal sağlık skorunu değiştirmiyor (${input.baselineScore} puan).`);
  }

  if (input.cashTightnessDate) {
    const tightnessDate = new Date(input.cashTightnessDate);
    parts.push(
      `⚠️ Dikkat: ${tightnessDate.toLocaleDateString('tr-TR')} tarihinde nakit sıkışıklığı riski var.`
    );
  }

  if (input.breakEvenMonth) {
    parts.push(
      `Bu hamle seni kısa vadede sıkıştırsa da, ${input.breakEvenMonth}. aydan itibaren pozitif etki görmeye başlarsın.`
    );
  }

  if (input.riskLevel === 'safe') {
    parts.push('✅ Bu senaryo genel olarak güvenli görünüyor. Harekete geçebilirsin.');
  } else if (input.riskLevel === 'moderate') {
    parts.push('🟡 Orta düzeyde risk var. Küçük adımlarla ilerlemen daha güvenli olabilir.');
  } else {
    parts.push('🔴 Yüksek risk! Bu hamleyi yapmadan önce acil fonunu güçlendirmeni öneriyorum.');
  }

  return parts.join('\n\n');
}

