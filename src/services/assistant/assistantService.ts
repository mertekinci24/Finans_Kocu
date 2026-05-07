import { AssistantContextCache, ChatMessage, SuggestedTransaction } from '@/types';
import { FinancialIntelligenceContext } from '../../types/intelligence';

// AI Proxy (model seçimi backend fallback sistemine bırakıldı)
const AI_PROXY_URL = '/api/ai/gemini';
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

function serializeFinancialIntelligenceContext(intel?: FinancialIntelligenceContext): string {
  if (!intel) return "";

  const lines: string[] = [];
  lines.push("## FINANCIAL INTELLIGENCE LAYER — DETERMINISTIC SIGNALS");
  lines.push("DİKKAT: Bu bölümdeki veriler sistem tarafından deterministik (kesin) olarak hesaplanmıştır.");
  lines.push("KURALLAR:");
  lines.push("- AI bu sinyalleri DEĞİŞTİREMEZ.");
  lines.push("- AI yeni oran, sayı, skor veya risk seviyesi HESAPLAYAMAZ.");
  lines.push("- AI yalnızca canBeExplainedByAI: true olan sinyalleri açıklayabilir.");
  lines.push("- AI, MissingFields içinde yer alan alanlarda yorum YAPAMAZ (veriler eksiktir).");
  lines.push("- AI, BlockedInsights konularında kesinlikle tavsiye veremez, her zaman belirtilen fallback cümlesini kullanmalıdır.");
  lines.push("- Findeks ve Uygulama (App) kaynakları birbirine KARIŞTIRILMAMALIDIR.");
  lines.push("- Kredi onayı, garanti veya yatırım tavsiyesi VERİLEMEZ.");
  
  lines.push("\n1. RİSK SİNYALLERİ:");
  if (intel.signals && intel.signals.length > 0) {
    intel.signals.forEach(s => {
      lines.push(`- Sinyal: [${s.code}] (Kaynak: ${s.source}, Seviye: ${s.level})`);
      lines.push(`  Özet: ${s.summary}`);
      lines.push(`  Yorum: ${s.interpretation}`);
      lines.push(`  Koçluk Konusu: ${s.coachGuidanceTopic}`);
      lines.push(`  Açıklanabilir mi?: ${s.canBeExplainedByAI}`);
    });
  } else {
    lines.push("- Risk sinyali bulunmuyor.");
  }

  lines.push("\n2. İZİNLER (PERMISSIONS):");
  if (intel.permissions) {
    const p = intel.permissions;
    lines.push(`- Kredi Notu Analizi: ${p.canAnalyzeCreditScore}`);
    lines.push(`- Borç/Limit Analizi: ${p.canAnalyzeDebtLimitRatio}`);
    lines.push(`- Ödeme Geçmişi Analizi: ${p.canAnalyzePaymentHistory}`);
    lines.push(`- Nakit Akışı Analizi: ${p.canAnalyzeCashflow}`);
    lines.push(`- Likidite Analizi: ${p.canAnalyzeLiquidity}`);
    lines.push(`- Aksiyon Planı Verebilir mi: ${p.canGiveActionPlan}`);
  }

  lines.push("\n3. EKSİK VERİLER (MISSING FIELDS):");
  if (intel.missingFields && intel.missingFields.length > 0) {
    intel.missingFields.forEach(m => {
      lines.push(`- ${m.field} (${m.source}): ${m.instructionToAI}`);
    });
  } else {
    lines.push("- Tespit edilen eksik alan yok.");
  }

  lines.push("\n4. İZİN VERİLEN KONULAR (ALLOWED INSIGHTS):");
  if (intel.allowedInsights && intel.allowedInsights.length > 0) {
    intel.allowedInsights.forEach(a => {
      lines.push(`- Konu: ${a.topic} (Kaynak: ${a.source}, Ton: ${a.allowedTone})`);
    });
  } else {
    lines.push("- Özel izin verilen konu yok.");
  }

  lines.push("\n5. YASAKLI KONULAR VE FALLBACK (BLOCKED INSIGHTS):");
  if (intel.blockedInsights && intel.blockedInsights.length > 0) {
    intel.blockedInsights.forEach(b => {
      lines.push(`- Konu: ${b.topic} (Kaynak: ${b.source})`);
      lines.push(`  Neden: ${b.reason}`);
      lines.push(`  Zorunlu Yanıt (Fallback): "${b.userFacingFallback}"`);
    });
  } else {
    lines.push("- Tespit edilen özel yasaklı konu yok (varsayılanlar geçerlidir).");
  }

  lines.push("\n6. UYARILAR:");
  if (intel.warnings && intel.warnings.length > 0) {
    intel.warnings.forEach(w => lines.push(`- ${w}`));
  } else {
    lines.push("- Sistem uyarısı yok.");
  }

  return lines.join("\n") + "\n";
}

function serializeFindeksEvidence(data: any): string {
  if (!data) return "";

  const scoreComponents = data.scoreComponents || data.fields?.components;
  const componentLines: string[] = [];

  if (scoreComponents) {
    if (scoreComponents.paymentHabits) {
      componentLines.push(formatEvidenceField("Ödeme Alışkanlıkları Bileşeni", scoreComponents.paymentHabits));
    }
    if (scoreComponents.currentAccountAndDebtStatus || scoreComponents.currentDebt) {
      componentLines.push(formatEvidenceField("Mevcut Hesap ve Borç Durumu Bileşeni", scoreComponents.currentAccountAndDebtStatus || scoreComponents.currentDebt));
    }
    if (scoreComponents.creditUsageIntensity || scoreComponents.creditUsage) {
      componentLines.push(formatEvidenceField("Kredi Kullanım Yoğunluğu Bileşeni", scoreComponents.creditUsageIntensity || scoreComponents.creditUsage));
    }
    if (scoreComponents.newCreditOpenings || scoreComponents.newAccounts) {
      componentLines.push(formatEvidenceField("Yeni Kredili Ürün Açılışları Bileşeni", scoreComponents.newCreditOpenings || scoreComponents.newAccounts));
    }
  }

  const fields = data.fields || data;

  return `
**KULLANICI_FİNDEKS_PROFİLİ (SİSTEM KAYDI - KANITLI VERİ):**

Belge Bilgisi:
- Belge Tipi: ${data.documentType || data.scope || "unknown"}
- Parser Versiyonu: ${data.parserVersion || "unknown"}
- Kaynak: ${data.source || "attachment_parse"}

Kanıtlı Alanlar:
${formatEvidenceField("Kredi Notu", fields.creditScore)}
${formatEvidenceField("Limit Kullanımı", fields.limitUsageRatio)}
${formatEvidenceField("Gecikme Geçmişi", fields.delayMonths)}
${formatEvidenceField("Banka Hesapları", fields.bankAccounts)}
${formatEvidenceField("Kredi Kartları", fields.creditCards)}
${formatEvidenceField("Aktif Borçlar", fields.activeDebts)}

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
    console.log('[AI_PROXY_REQUEST]', {
      promptLength: fullPrompt.length,
    });

    const response = await fetch(AI_PROXY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        maxTokens: MAX_TOKENS,
        fullPrompt,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('[AI_PROXY_ERROR_BODY]', errorBody);
      throw new Error(`AI proxy error ${response.status}: ${errorBody}`);
    }

    const data = await response.json();

    // Parse response shape with fallback chain:
    // 1. Raw OpenRouter: choices[0].message.content
    // 2. Wrapped proxy:  data.data.message
    // 3. Gemini legacy: candidates[0].content.parts[0].text
    const text =
      data?.choices?.[0]?.message?.content ||
      data?.data?.message ||
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      'AI yanıt üretemedi.';

    const suggestedTransaction = extractSuggestedTransaction(text);

    return {
      message: sanitizeAssistantOutput(cleanResponseText(extractAnswerText(text))),
      suggestedTransaction,
      tokensUsed: data?.usage?.completion_tokens ?? 0,
    };
  } catch (error) {
    throw new Error(
      `Assistant message failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

function cleanResponseText(text: string): string {
  return text.replace(/\{[\s\S]*"action":\s*"suggest_transaction"[\s\S]*\}/g, '').trim();
}

function extractAnswerText(raw: string): string {
  const trimmed = raw.trim();

  try {
    const parsed = JSON.parse(trimmed);
    if (parsed && typeof parsed.answer === 'string') {
      return parsed.answer;
    }
  } catch {}

  const jsonMatch = trimmed.match(/\{[\s\S]*"answer"\s*:\s*"([\s\S]*?)"\s*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed && typeof parsed.answer === 'string') {
        return parsed.answer;
      }
    } catch {}
  }

  return trimmed;
}

function sanitizeAssistantOutput(text: string): string {
  let cleaned = text.trim();

  cleaned = cleaned
    .replace(/^.*We need.*$/gim, '')
    .replace(/^.*Let's.*$/gim, '')
    .replace(/^.*Need to.*$/gim, '')
    .replace(/^.*I should.*$/gim, '')
    .replace(/^.*analysis.*$/gim, '')
    .replace(/^.*Paragraph\s*\d*:.*$/gim, '')
    .replace(/\bactual\b/gi, 'mevcut')
    .replace(/\bcomponent\b/gi, 'bileşen')
    .replace(/\bcontradiction\b/gi, 'tutarsızlık')
    .replace(/\bcalculate\b/gi, 'hesapla')
    .replace(/\bWe\b/g, '')
    .replace(/\bLet's\b/g, '')
    .trim();

  const unfinishedEndings = [
    've',
    'ile',
    'için',
    'ö',
    'taksit ö',
    'kullan'
  ];

  const lower = cleaned.toLowerCase();
  if (unfinishedEndings.some((ending) => lower.endsWith(ending))) {
    cleaned += ' ... Yanıt tamamlanamadı; lütfen tekrar sorarsan daha net yanıtlayabilirim.';
  }

  if (/^\.*$/.test(cleaned) || cleaned.length < 20) {
    return 'Yanıt şu an sağlıklı üretilemedi. Lütfen sorunuzu tekrar daha kısa şekilde yazar mısınız?';
  }

  return cleaned || 'Yanıt oluşturulamadı. Lütfen tekrar dener misin?';
}

function buildParsedAttachmentsInfo(context: AssistantContextCache): string {
  const parsed = context.parsedAttachments || [];

  if (!Array.isArray(parsed) || parsed.length === 0) {
    return '';
  }

  return `

YÜKLENEN DOSYALARDAN AYIKLANAN KANITLI VERİLER:
${parsed.map((item: any) => {
    const data = item.structured_data || {};
    const fields = data.fields || {};
    const components = fields.components || {};
    const missingFields = Array.isArray(data.missingFields) ? data.missingFields : [];

    if (data.parserType === 'findeks_semantic') {
      return `Dosya: ${item.file_name || 'Bilinmeyen dosya'}
Belge tipi: ${data.documentType || 'bilinmiyor'}
Parser: ${data.parserType || 'bilinmiyor'} v${data.parserVersion || 'bilinmiyor'}
Kredi notu: ${fields.creditScore ?? 'bulunamadı'}
Rapor tarihi: ${fields.reportDate ?? 'bulunamadı'}
Bileşenler:
- Ödeme alışkanlıkları: ${components.paymentHabits ?? 'bulunamadı'}
- Mevcut hesap ve borç durumu: ${components.currentDebt ?? 'bulunamadı'}
- Kredi kullanım yoğunluğu: ${components.creditUsage ?? 'bulunamadı'}
- Yeni kredili ürün açılışları: ${components.newAccounts ?? 'bulunamadı'}
Eksik alanlar: ${missingFields.length ? missingFields.join(', ') : 'Yok'}`;
    }

    return `Dosya: ${item.file_name || 'Bilinmeyen dosya'}
Durum: parsed (Ham metin ayıklandı, detaylı analiz bekliyor)`;
  }).join('\n\n')}`;
}

function buildDeterministicFinancialSummary(context: AssistantContextCache): string {
  const cards = context.accountsSummary.filter((a: any) => a.type === 'kredi_kartı');
  const cashAccounts = context.accountsSummary.filter((a: any) => a.type !== 'kredi_kartı');

  const totalCash = cashAccounts.reduce((sum: number, a: any) => sum + Number(a.balance || 0), 0);
  const totalCardDebt = cards.reduce((sum: number, a: any) => sum + Number(a.balance || 0), 0);
  const totalCardLimit = cards.reduce((sum: number, a: any) => sum + Number(a.cardLimit || 0), 0);

  const activeDebtTotal = (context.debts || []).reduce(
    (sum: number, d: any) => sum + Number(d.remaining_amount ?? d.remainingAmount ?? 0),
    0
  );

  const installmentMonthlyTotal = (context.installments || []).reduce(
    (sum: number, i: any) => sum + Number(i.monthly_payment ?? i.monthlyPayment ?? 0),
    0
  );

  const cardUsageRatio =
    totalCardLimit > 0 ? (totalCardDebt / totalCardLimit) * 100 : null;

  return `
DETERMİNİSTİK FİNANSAL ÖZET:
- Toplam nakit/banka varlığı: ₺${totalCash.toLocaleString('tr-TR')}
- Kredi kartı ekstre/dönem borcu toplamı: ₺${totalCardDebt.toLocaleString('tr-TR')}
- Kredi kartı toplam limiti: ${
    totalCardLimit > 0 ? `₺${totalCardLimit.toLocaleString('tr-TR')}` : 'limit bilgisi yok'
  }
- Uygulama kayıtlarına göre kart kullanım oranı: ${
    cardUsageRatio !== null ? `%${cardUsageRatio.toFixed(1)}` : 'hesaplanamaz'
  }
- Uygulama borçları kalan toplamı: ₺${activeDebtTotal.toLocaleString('tr-TR')}
- Taksitlerin görünen aylık ödeme toplamı: ₺${installmentMonthlyTotal.toLocaleString('tr-TR')}
- Aylık ortalama gelir: ₺${context.transactionsTrend.avgMonthlyIncome.toLocaleString('tr-TR')}
- Aylık ortalama gider: ₺${context.transactionsTrend.avgMonthlyExpense.toLocaleString('tr-TR')}
- Tasarruf oranı: %${context.transactionsTrend.savingsRate.toFixed(1)}

Not:
- Bu özet uygulama kayıtlarından hesaplanmıştır.
- Findeks raporundaki eksik alanlar bu hesaplara dahil edilmemiştir.
- Kart balance değeri limit değil, dönem/ekstre borcudur.
`;
}

function buildSystemPrompt(context: AssistantContextCache): string {
  const accountsInfo = context.accountsSummary
    .map((acc) => {
      if (acc.type === 'kredi_kartı') {
        return `${acc.name} (kredi kartı) | Dönem Borcu: ₺${acc.balance.toLocaleString('tr-TR')}${
          acc.cardLimit ? ` | Limit: ₺${acc.cardLimit.toLocaleString('tr-TR')}` : ' | Limit bilgisi girilmemiş'
        }`;
      }
      return `${acc.name} (${acc.type}): ₺${acc.balance.toLocaleString('tr-TR')}`;
    })
    .join('\n');

  const debtsInfo = `- Borçlar:\n${context.debts?.map(d => {
    const name = d.creditor_name || d.name || 'Borç';
    const remaining = d.remaining_amount ?? d.remainingAmount ?? null;
    const monthly = d.monthly_payment ?? d.monthlyPayment ?? null;

    return `${name}: Kalan borç: ${
      remaining !== null ? `₺${Number(remaining).toLocaleString('tr-TR')}` : 'bilgi yok'
    }${
      monthly !== null ? ` | Aylık ödeme: ₺${Number(monthly).toLocaleString('tr-TR')}` : ' | Aylık ödeme bilgisi yok'
    }`;
  }).join('\n') || 'Yok'}`;

  const installmentsInfo = `- Taksitler:\n${context.installments?.map(i => {
    const name = i.lender_name || i.name || 'Taksit';
    const monthly = i.monthly_payment ?? i.monthlyPayment ?? null;
    const remainingMonths = i.remaining_months ?? i.remainingMonths ?? null;

    return `${name}: ${
      monthly !== null ? `Aylık ödeme: ₺${Number(monthly).toLocaleString('tr-TR')}` : 'Aylık ödeme bilgisi yok'
    }${
      remainingMonths !== null ? ` | Kalan süre: ${remainingMonths} ay` : ' | Kalan süre bilgisi yok'
    }`;
  }).join('\n') || 'Yok'}`;

  const topCategoriesInfo = context.transactionsTrend.topCategories
    .map((c) => `${c.name}: ₺${c.amount.toLocaleString('tr-TR')}`)
    .join('\n');

  const alertsInfo = context.alerts.length > 0 ? `\n⚠️ Dikkat Çeken Noktalar:\n${context.alerts.join('\n')}` : '';

  const findeksInfo = ''; // Phase 7.2E-B: Legacy Findeks bridge disabled; Financial Intelligence Layer is primary source.

  const deterministicSummary = buildDeterministicFinancialSummary(context);

  const parsedAttachmentsInfo = buildParsedAttachmentsInfo(context);
  
  const financialIntelligenceInfo = serializeFinancialIntelligenceContext(context.financialIntelligenceContext);

  const parsedAttachmentRules = `
YÜKLENEN DOSYA KURALLARI:
- Yüklenen dosyalardan ayıklanan structured_data kanıtlı veri kabul edilir.
- Raw PDF metni yoksa dosyanın tamamını okuduğunu iddia etme.
- missingFields içindeki alanları sıfır kabul etme.
- Findeks not bileşenlerini limit kullanım oranı sanma.
- Kullanıcı "yüklediğim dosyaya göre", "dosyaya göre", "findeks raporuma göre" veya "rapora göre" derse önce parsed attachment verisine bak.
- Eğer parsedAttachments içinde findeks_semantic verisi varsa, Findeks sorularında onu birincil kaynak kabul et. Eski Findeks bridge verisi sadece parsedAttachments yoksa kullanılır.
`;

  return `**KRİTİK KURALLAR — MUTLAKA UY**

GÖREVİN:
- Finansal hesaplamaları yeniden yapma.
- DETERMİNİSTİK FİNANSAL ÖZET içindeki sonuçları kullan.
- Kullanıcıya kısa, anlaşılır ve profesyonel koç yorumu yap.
- Eğer soru spesifikse sadece o soruyu yanıtla.

ÇIKTI:
- Sadece kullanıcıya gösterilecek nihai cevabı yaz.
- JSON yazma.
- İç düşünce yazma.
- En fazla 900 karakter yaz.

ZORUNLU CEVAP FORMATI:
- Cevaba doğrudan kullanıcıya yanıt vererek başla.
- Asla "Paragraph", "Plan", "Analysis", "Let's", "We need", "actual", "component" gibi kelimeler yazma.
- Cevapta iç hesaplama sürecini gösterme.
- Yeni hesap yapma; hazır sonuç yoksa eksik veri olduğunu belirt.
- Cevabı şu yapıda ver:
  1. Findeks raporuna göre...
  2. Uygulama kayıtlarına göre...
  3. Kısa koç yorumu...
  4. Sonraki adım...

CEVAP STİLİ:
- Uzun liste yapma.
- Bütün borçları tek tek saymak zorunda değilsen özetle.
- Hesaplama gerekiyorsa yalnızca deterministik özet veya Financial Intelligence sinyallerinde hazır verilen sonucu kullan.
- Cevabı yarıda bırakacak kadar uzun açıklama yapma.

${parsedAttachmentRules}

**Findeks Kuralları (Eğer Findeks verisi varsa):**
- Kanıtlı veri dışına çıkma.
- not_found alanları 0 gibi yorumlama.
- Eksik limit/borç/kart bilgileri için kesin borç analizi yapma.
- Kredi notu bileşenlerini doğru yorumla.
- Kullanıcıya eksik belgeyi nasıl tamamlayacağını söyle.
- Eğer belge "findeks_credit_score_only" ise: Kredi notu güvenle okunmuşsa yorumla. Limit ve borç detayları yoksa açıkça belirt. "Bu PDF kredi notu özeti; tam risk raporu değil" de. Kullanıcıya Tam Findeks Risk Raporu veya banka limit özeti yüklemesini öner.

${parsedAttachmentsInfo}

**Kullanıcının Güncel Mali Durumu:**
- Hesaplar:
${accountsInfo}
${debtsInfo}
${installmentsInfo}
- Aylık Ortalama Gelir: ₺${context.transactionsTrend.avgMonthlyIncome.toLocaleString('tr-TR')}
- Aylık Ortalama Gider: ₺${context.transactionsTrend.avgMonthlyExpense.toLocaleString('tr-TR')}
- Tasarruf Oranı: %${context.transactionsTrend.savingsRate.toFixed(1)}
- En Çok Harcanan Kategoriler:
${topCategoriesInfo}
${findeksInfo}${alertsInfo}

${deterministicSummary}

${financialIntelligenceInfo}

**Kurallar:**
1. Eğer FINANCIAL INTELLIGENCE LAYER bölümü ile eski ham veri blokları arasında çelişki varsa, FINANCIAL INTELLIGENCE LAYER kuralları önceliklidir.
2. Kullanıcının gerçek verilerine ve deterministik sinyallere dayanarak güvenli koçluk yorumu yap. Kredi onayı, yatırım tavsiyesi, ürün önerisi veya garanti dili kullanma.
3. "Yazıyor..." hissi vermek için kısa cümleler kullan
4. Eğer kullanıcı bir işlem söylerse ("500 TL market"), JSON formatında öner: {"action": "suggest_transaction", "amount": 500, "category": "Yiyecek", "description": "Market", "type": "gider"}
5. Yargılama yapma — destek ve rehberlik tonu
6. Türkçe, konuşma dili, "koç" tonu`;
}

function buildConversationText(previousMessages: ChatMessage[], newUserMessage: string): string {
  const lines: string[] = [];
  const recentMessages = previousMessages.slice(-6);

  recentMessages.forEach((msg) => {
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
