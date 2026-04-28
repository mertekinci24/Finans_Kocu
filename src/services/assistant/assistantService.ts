import { AssistantContextCache, ChatMessage, SuggestedTransaction } from '@/types';

// Gemini Free Tier API (Proxy üzerinden)
const AI_PROXY_URL = '/api/ai/gemini';
const GEMINI_MODEL = 'gemini-1.5-flash';
const MAX_TOKENS = 900;

function isExtractedField(field: any): boolean {
  return field && typeof field === "object" && "status" in field && "value" in field;
}

function fieldValue(field: any): any {
  if (isExtractedField(field)) return field.value;
  return field;
}

function fieldStatus(field: any): string {
  if (isExtractedField(field)) return field.status;
  return field === null || field === undefined ? "not_found" : "found";
}

function fieldConfidence(field: any): number | null {
  if (isExtractedField(field)) return field.confidence ?? null;
  return null;
}

function formatEvidenceField(label: string, field: any): string {
  const value = fieldValue(field);
  const status = fieldStatus(field);
  const confidence = fieldConfidence(field);
  const reason = isExtractedField(field) ? field.reason : undefined;

  if (status === "found") {
    return `- ${label}: ${value} (durum: found, güven: ${confidence ?? "bilinmiyor"})`;
  }

  if (status === "not_found") {
    return `- ${label}: Bu belgede yok / kapsam dışı (durum: not_found, güven: 0${reason ? `, sebep: ${reason}` : ""})`;
  }

  if (status === "low_confidence") {
    return `- ${label}: ${value ?? "belirsiz"} (durum: low_confidence, güven: ${confidence ?? "düşük"}${reason ? `, sebep: ${reason}` : ""})`;
  }

  if (status === "rejected") {
    return `- ${label}: Kullanma / reddedildi (durum: rejected${reason ? `, sebep: ${reason}` : ""})`;
  }

  return `- ${label}: bilinmiyor`;
}

function serializeFindeksEvidence(data: any): string {
  if (!data) return "";

  const scoreComponents = data.scoreComponents;
  const componentLines: string[] = [];

  if (scoreComponents) {
    if (scoreComponents.paymentHabits) {
      componentLines.push(formatEvidenceField("Ödeme Alışkanlıkları Bileşeni", scoreComponents.paymentHabits));
    }
    if (scoreComponents.currentAccountAndDebtStatus) {
      componentLines.push(formatEvidenceField("Mevcut Hesap ve Borç Durumu Bileşeni", scoreComponents.currentAccountAndDebtStatus));
    }
    if (scoreComponents.creditUsageIntensity) {
      componentLines.push(formatEvidenceField("Kredi Kullanım Yoğunluğu Bileşeni", scoreComponents.creditUsageIntensity));
    }
    if (scoreComponents.newCreditOpenings) {
      componentLines.push(formatEvidenceField("Yeni Kredili Ürün Açılışları Bileşeni", scoreComponents.newCreditOpenings));
    }
  }

  return `
**KULLANICI_FİNDEKS_PROFİLİ (SİSTEM KAYDI - KANITLI VERİ):**

Belge Bilgisi:
- Belge Tipi: ${data.documentType || data.scope || "unknown"}
- Parser Versiyonu: ${data.parserVersion || "unknown"}
- Kaynak: ${data.source || "unknown"}

Kanıtlı Alanlar:
${formatEvidenceField("Kredi Notu", data.creditScore)}
${formatEvidenceField("Limit Kullanımı", data.limitUsageRatio)}
${formatEvidenceField("Gecikme Geçmişi", data.delayMonths)}
${formatEvidenceField("Banka Hesapları", data.bankAccounts)}
${formatEvidenceField("Kredi Kartları", data.creditCards)}
${formatEvidenceField("Aktif Borçlar", data.activeDebts)}

Findeks Not Bileşenleri:
${componentLines.length > 0 ? componentLines.join("\n") : "- Bileşen verisi yok"}

Eksik / Kapsam Dışı Alanlar:
${Array.isArray(data.missingFields) && data.missingFields.length > 0 ? data.missingFields.map((f: string) => `- ${f}`).join("\n") : "- Yok"}

Uyarılar:
${Array.isArray(data.warnings) && data.warnings.length > 0 ? data.warnings.map((w: string) => `- ${w}`).join("\n") : "- Yok"}

ÖNEMLİ FINDeks KURALLARI:
1. status="found" olan alanları kesin veri kabul et.
2. status="not_found" olan alanları ASLA 0 kabul etme.
3. Eksik alanlar için "bu belgede yer almıyor" veya "bu rapor türünde kapsam dışı" de.
4. status="low_confidence" olan alanlarda belirsizlik belirt.
5. status="rejected" olan alanları yorumda kullanma.
6. Kredi notu bileşen yüzdeleri limit kullanım oranı değildir.
7. Banka kredi onayı garanti etme; sadece ihtimal ve hazırlık dili kullan.
`;
}

export interface AssistantResponse {
  message: string;
  suggestedTransaction?: SuggestedTransaction;
  tokensUsed: number;
}

export async function sendAssistantMessage(
  userMessage: string,
  context: AssistantContextCache,
  previousMessages: ChatMessage[]
): Promise<AssistantResponse> {
  const systemPrompt = buildSystemPrompt(context);
  const conversationHistory = buildConversationText(previousMessages, userMessage);

  const fullPrompt = `${systemPrompt}\n\n--- SOHBET GEÇMİŞİ ---\n${conversationHistory}`;

  try {
    const response = await fetch(AI_PROXY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: GEMINI_MODEL,
        maxTokens: MAX_TOKENS,
        fullPrompt,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Gemini API error: ${response.status} — ${errorBody}`);
    }

    const data = await response.json();
    const text =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      'AI yanıt üretemedi.';

    const suggestedTransaction = extractSuggestedTransaction(text);

    return {
      message: cleanResponseText(text),
      suggestedTransaction,
      tokensUsed: data?.usageMetadata?.candidatesTokenCount || 0,
    };
  } catch (error) {
    throw new Error(
      `Assistant message failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

function cleanResponseText(text: string): string {
  // Remove any JSON transaction blocks from the visible message
  return text.replace(/\{[\s\S]*"action":\s*"suggest_transaction"[\s\S]*\}/g, '').trim();
}

function buildSystemPrompt(context: AssistantContextCache): string {
  const accountsInfo = context.accountsSummary
    .map((a) => `${a.name} (${a.type}): ₺${a.balance.toLocaleString('tr-TR')}`)
    .join('\n');

  const topCategoriesInfo = context.transactionsTrend.topCategories
    .map((c) => `${c.name}: ₺${c.amount.toLocaleString('tr-TR')}`)
    .join('\n');

  const alertsInfo = context.alerts.length > 0 ? `\n⚠️ Dikkat Çeken Noktalar:\n${context.alerts.join('\n')}` : '';

  const findeksInfo = context.findeksData ? serializeFindeksEvidence(context.findeksData) : '';

  return `Sen FinansKoçu'nun AI Asistanısın. Kullanıcıyla WhatsApp gibi samimi, kolay bir diyalogta konuş.

**Kullanıcının Güncel Mali Durumu:**
- Hesaplar:
${accountsInfo}
- Aylık Ortalama Gelir: ₺${context.transactionsTrend.avgMonthlyIncome.toLocaleString('tr-TR')}
- Aylık Ortalama Gider: ₺${context.transactionsTrend.avgMonthlyExpense.toLocaleString('tr-TR')}
- Tasarruf Oranı: %${context.transactionsTrend.savingsRate.toFixed(1)}
- En Çok Harcanan Kategoriler:
${topCategoriesInfo}
${findeksInfo}${alertsInfo}

**Kurallar:**
1. Kullanıcının gerçek verilerine dayanarak tavsiye ver (örn: "Garanti kartındaki taksit yükü gelirinizin %35'i")
2. "Yazıyor..." hissi vermek için kısa cümleler kullan
3. Eğer kullanıcı bir işlem söylerse ("500 TL market"), JSON formatında öner: {"action": "suggest_transaction", "amount": 500, "category": "Yiyecek", "description": "Market", "type": "gider"}
4. Yargılama yapma — destek ve rehberlik tonu
5. Türkçe, konuşma dili, "koç" tonu

**Findeks Kuralları (Eğer Findeks verisi varsa):**
- Kanıtlı veri dışına çıkma.
- not_found alanları 0 gibi yorumlama.
- Eksik limit/borç/kart bilgileri için kesin borç analizi yapma.
- Kredi notu bileşenlerini doğru yorumla.
- Kullanıcıya eksik belgeyi nasıl tamamlayacağını söyle.
- Eğer belge "findeks_credit_score_only" ise: Kredi notu güvenle okunmuşsa yorumla. Limit ve borç detayları yoksa açıkça belirt. "Bu PDF kredi notu özeti; tam risk raporu değil" de. Kullanıcıya Tam Findeks Risk Raporu veya banka limit özeti yüklemesini öner.`;
}

function buildConversationText(previousMessages: ChatMessage[], newUserMessage: string): string {
  const lines: string[] = [];

  previousMessages.forEach((msg) => {
    const role = msg.role === 'user' ? 'Kullanıcı' : 'Asistan';
    lines.push(`${role}: ${msg.content}`);
  });

  lines.push(`Kullanıcı: ${newUserMessage}`);

  return lines.join('\n');
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

// ─── Senaryo Analizi (Gemini) ────────────────────────────
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
 * Gemini ile senaryo analiz yorumu üretir.
 * API key yoksa kural bazlı fallback yorum döndürür.
 */
export async function analyzeScenario(
  input: ScenarioAnalysisInput
): Promise<string> {
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

  const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;

  try {
    const response = await fetch(AI_PROXY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: GEMINI_MODEL,
        maxTokens: 600,
        fullPrompt,
      }),
    });

    if (!response.ok) {
      return generateFallbackScenarioAnalysis(input);
    }

    const data = await response.json();
    const text =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      generateFallbackScenarioAnalysis(input);

    return text;
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
