import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { dataSourceAdapter, supabase } from '@/services/supabase/adapter';
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

const buildDeterministicFindeksWelcome = (data: any) => {
  const score = data?.creditScore?.value ?? data?.legacyValues?.creditScore ?? "bilinmiyor";
  const documentType = data?.documentType || data?.scope || "bilinmeyen belge";

  const scoreText =
    typeof score === "number" && score >= 1470 && score <= 1719
      ? "iyi / güvenli"
      : typeof score === "number" && score >= 1720
      ? "çok iyi / prestijli"
      : typeof score === "number" && score >= 1150
      ? "dengeli / orta"
      : typeof score === "number"
      ? "gelişime açık veya kritik"
      : "belirsiz";

  return `Findeks raporuna göre kredi notunuz ${score}. Bu skor ${scoreText} seviyesinde görünüyor.

Bu PDF "${documentType}" olarak algılandı. Limit kullanımı, gecikme geçmişi, banka hesabı, kredi kartı ve aktif borç detayları bu belgede yer almıyor; bu alanları sıfır kabul etmiyorum.

Uygulama kayıtlarınızla birlikte daha net yorum yapabilirim. Sonraki adım olarak bana "toplam borç durumum nasıl?" veya "kart limitlerim ve borçlarım sağlıklı mı?" diye sorabilirsiniz.`;
};

const normalizeText = (text: string) =>
  text.toLocaleLowerCase('tr-TR')
    .replace(/[ıİ]/g, 'i')
    .replace(/[ğĞ]/g, 'g')
    .replace(/[üÜ]/g, 'u')
    .replace(/[şŞ]/g, 's')
    .replace(/[öÖ]/g, 'o')
    .replace(/[çÇ]/g, 'c');

const buildScoreBand = (score: any) => {
  const numericScore = Number(score);
  if (!Number.isFinite(numericScore)) return "belirsiz";
  if (numericScore >= 1720) return "çok iyi / prestijli";
  if (numericScore >= 1470) return "iyi / güvenli";
  if (numericScore >= 1150) return "dengeli / orta";
  if (numericScore >= 970) return "gelişime açık";
  return "kritik / çok zayıf";
};

// Phase 7.2D: Full risk report detection — data-driven, not string-dependent
const hasFullRiskFields = (fields: Record<string, unknown>): boolean => {
  return [
    fields.totalLimit,
    fields.totalDebt,
    fields.limitUsageRatio,
    fields.worstPaymentStatus,
    fields.currentLongestDelay,
    fields.availableLimit,
    fields.debtLimitRatio,
  ].some((value) => value !== null && value !== undefined && value !== '');
};

const buildDeterministicIntentAnswer = (
  question: string,
  context: any,
  findeksData?: any
): string | null => {
  const q = normalizeText(question);

  const accounts = context.accountsSummary || [];
  const cards = accounts.filter((a: any) => a.type === 'kredi_kartı');
  const cashAccounts = accounts.filter((a: any) => a.type !== 'kredi_kartı');

  const totalCash = cashAccounts.reduce((s: number, a: any) => s + Number(a.balance || 0), 0);
  const totalCardDebt = cards.reduce((s: number, a: any) => s + Number(a.balance || 0), 0);
  const totalCardLimit = cards.reduce((s: number, a: any) => s + Number(a.cardLimit || 0), 0);
  const cardUsage = totalCardLimit > 0 ? (totalCardDebt / totalCardLimit) * 100 : null;

  const activeDebtTotal = (context.debts || []).reduce(
    (s: number, d: any) => s + Number(d.remaining_amount ?? d.remainingAmount ?? 0),
    0
  );

  const installmentMonthlyTotal = (context.installments || []).reduce(
    (s: number, i: any) => s + Number(i.monthly_payment ?? i.monthlyPayment ?? 0),
    0
  );

  // FIX 1: Extract latest parsed attachment (Robust Selection)
  const latestParsedFindeks = (context.parsedAttachments || []).find((item: any) => {
    const sd = item?.structured_data;
    const docType = (item?.document_type || sd?.documentType || "").toLowerCase();
    const pType = (sd?.parserType || "").toLowerCase();
    
    return (
      docType.includes('findeks') || 
      pType.includes('findeks') || 
      !!sd?.fields?.creditScore || 
      !!sd?.creditScore
    );
  });

  const latestStructured = latestParsedFindeks?.structured_data;
  // Fix 2: Root/Fields Fallback
  const latestFields = latestStructured?.fields || latestStructured || {};
  const latestMissingFields = latestFields.missingFields || [];
  const latestDocumentType = latestFields.documentType || latestParsedFindeks?.document_type || null;
  const latestFileName = latestParsedFindeks?.file_name || null;

  const score =
    latestFields.creditScore ??
    findeksData?.creditScore?.value ??
    findeksData?.legacyValues?.creditScore ??
    context.findeksData?.creditScore ??
    null;

  const reportDate = latestFields.reportDate ?? null;
  const scoreBand = buildScoreBand(score);
  const isParsedData = !!latestFields.creditScore;

  // --- DETERMINISTIC INTENT GUARDS (PHASE 7.2D-UAT — PRIORITY ORDER) ---

  // GUARD 0 (HIGHEST PRIORITY): New Calculation/Ratio Blocking Guard
  // Must run BEFORE all other guards to prevent LLM fallback on dangerous queries.
  // Normalized query examples:
  //   "bana yeni bir risk orani hesapla" -> catches 'hesapla' and 'risk orani'
  //   "oran uret" -> catches 'oran uret'
  //   "risk skoru hesapla" -> catches 'hesapla'
  const isCalculationRequest = (
    q.includes('hesapla') ||
    q.includes('hesap yap') ||
    q.includes('oran uret') ||
    q.includes('skor uret') ||
    q.includes('oran cikar') ||
    q.includes('yeni oran') ||
    q.includes('yeni risk') ||
    q.includes('risk skoru') ||
    q.includes('calculate') ||
    q.includes('generate ratio')
  );

  if (isCalculationRequest) {
    return 'Yeni bir oran veya risk skoru hesaplayamam. Yalnızca sistemde hazır bulunan deterministik özetleri ve Financial Intelligence sinyallerini yorumlayabilirim. Eksik veya hazır olmayan veriler için yeni hesap üretmem.';
  }

  // GUARD 1: Credit Approval Guarantee Guard
  if (
    q.includes('kesin kredi') ||
    q.includes('kredi onaylanir mi') ||
    q.includes('kredi cikar mi') ||
    q.includes('banka verir mi') ||
    q.includes('garanti mi')
  ) {
    const scoreComment = score ? `Yüklediğiniz Findeks verilerine göre kredi notunuz ${score} (${scoreBand}) seviyesinde görünüyor;` : 'Mevcut verilerinize göre;';
    return `Kesin kredi çıkar diyemem; kredi kararı bankanın kendi değerlendirme kriterlerine, gelir durumuna, mevcut borçluluğa ve başvuru koşullarına bağlıdır. ${scoreComment} ancak borç/limit oranı ve gecikme bilgileri de bankalar tarafından kritik düzeyde dikkate alınmalıdır.`;
  }

  // GUARD 2: New file parse-in-progress guard
  if (context.isProcessingNewFile) {
    if (q.includes('findeks') || q.includes('kredi not') || q.includes('rapor') || q.includes('dosya') || q.includes('analiz')) {
      // TODO Phase 7.2F: poll parse status and auto-send summary after parsed result is ready.
      return 'Dosyanız alındı ve analiz başlatıldı. Kısa süre sonra ‘Findeks raporumu yorumla’ diyerek rapor detaylarını alabilirsiniz. Analiz tamamlandığında rapordaki kredi notu, limit, borç ve gecikme bilgilerini varsayım yapmadan yorumlayacağım.';
    }
  }

  // --- EXISTING INTENTS ---
  if (
    q.includes('toplam borc') ||
    q.includes('borc durum') ||
    q.includes('borcum nasil')
  ) {
    return `Findeks raporuna göre bu PDF aktif borç, gecikme ve limit kullanım detaylarını içermiyor; bu alanları sıfır kabul etmiyorum.

Uygulama kayıtlarına göre kredi kartı ekstre/dönem borcu toplamınız ₺${totalCardDebt.toLocaleString('tr-TR')}, uygulama borçları kalan toplamınız ₺${activeDebtTotal.toLocaleString('tr-TR')}, taksitlerin görünen aylık ödeme toplamı ise ₺${installmentMonthlyTotal.toLocaleString('tr-TR')}. Nakit/banka varlığınız ₺${totalCash.toLocaleString('tr-TR')}.

Kısa koç yorumu: Kart borcunuz limitinize göre düşük görünse de taksitlerin aylık ödeme yükü yüksekse nakit akışını zorlayabilir. Sonraki adım olarak bu ay ödenecek taksit ve kart son ödeme tarihlerini birlikte önceliklendirelim.`;
  }

  if (
    q.includes('kart limit') ||
    q.includes('limitim') ||
    q.includes('kart borc') ||
    q.includes('limit kullanim')
  ) {
    const cardLines = cards.map((c: any) => {
      const limit = Number(c.cardLimit || 0);
      const debt = Number(c.balance || 0);
      const usage = limit > 0 ? (debt / limit) * 100 : null;
      return `${c.name}: Limit ${
        limit > 0 ? `₺${limit.toLocaleString('tr-TR')}` : 'bilgisi yok'
      }, dönem/ekstre borcu ₺${debt.toLocaleString('tr-TR')}${
        usage !== null ? `, kullanım oranı yaklaşık %${usage.toFixed(1)}` : ''
      }`;
    }).join('\n');

    return `Findeks raporuna göre bu PDF kart limiti veya limit kullanım oranı içermiyor; bu bilgi dosyada yer almıyor.

Uygulama kayıtlarına göre kart bilgileriniz:
${cardLines || 'Kayıtlı kredi kartı bulunamadı.'}

Kısa koç yorumu: Uygulama kayıtlarına göre toplam kart borcunuz ₺${totalCardDebt.toLocaleString('tr-TR')}${
      cardUsage !== null ? ` ve toplam kart limitinize göre yaklaşık %${cardUsage.toFixed(1)} kullanım görünüyor.` : '.'
    } Sonraki adım olarak kart ekstre tarihlerini takip edelim.`;
  }

  // FIX 2: Do not trigger Findeks deterministic answer for every message
  if (
    q.includes('findeks') ||
    q.includes('kredi not') ||
    q.includes('kredi skoru') ||
    q.includes('riskim') ||
    q.includes('rapora gore') ||
    q.includes('dosyaya gore') ||
    q.includes('yukledigim dosyaya gore')
  ) {
    const formatMoney = (value: any) =>
      value !== null && value !== undefined && Number.isFinite(Number(value))
        ? `₺${Number(value).toLocaleString('tr-TR')}`
        : 'bulunamadı';

    const totalLimit = latestFields.totalLimit ?? null;
    const totalDebt = latestFields.totalDebt ?? null;
    const limitUsageRatio = latestFields.limitUsageRatio ?? null;
    const worstPaymentStatus = latestFields.worstPaymentStatus ?? null;
    const currentLongestDelay = latestFields.currentLongestDelay ?? null;

    // FIX: Robust full risk detection — documentType string alone is unreliable.
    // A report qualifies as 'full risk' if its documentType matches OR if any
    // risk-specific financial field is present in the parsed data.
    const isFullRiskReport =
      latestDocumentType === 'findeks_full_risk_report' ||
      hasFullRiskFields(latestFields);

    if (import.meta.env.DEV) {
      console.log('[DETERMINISTIC_FINDEKS_SOURCE]', {
        hasParsedAttachment: !!latestParsedFindeks,
        fileName: latestFileName,
        score,
        reportDate,
        documentType: latestDocumentType,
        isFullRiskReport,
        hasFullRiskFieldsResult: hasFullRiskFields(latestFields),
        fieldsKeys: Object.keys(latestFields),
        totalLimit,
        totalDebt,
        limitUsageRatio,
      });
    }

    if (latestParsedFindeks && isFullRiskReport) {
      return `Yüklediğiniz son Findeks Risk Raporuna göre kredi notunuz ${score ?? 'bilinmiyor'} ve bu seviye ${scoreBand} olarak yorumlanır.${reportDate ? ` Rapor tarihi: ${reportDate}.` : ''}

Rapora göre toplam limitiniz ${formatMoney(totalLimit)}, toplam borcunuz ${formatMoney(totalDebt)} ve borç/limit oranınız ${limitUsageRatio !== null && limitUsageRatio !== undefined ? `%${limitUsageRatio}` : 'bulunamadı'} olarak görünüyor. Ödeme tarihçesindeki en olumsuz durum: ${worstPaymentStatus ?? 'bulunamadı'}. Mevcut en uzun gecikme süresi: ${currentLongestDelay ?? 'bulunamadı'}.

Kısa koç yorumu: Notunuz güçlü görünüyorsa bunu korumaya odaklanın; borç/limit oranı yüksek görünüyorsa zamanla düşürmek kredi profilinizi destekler.`;
    }

    if (latestParsedFindeks) {
      return `Yüklediğiniz son dosyaya göre kredi notunuz ${score ?? 'bilinmiyor'} ve bu seviye ${scoreBand} olarak yorumlanır.${reportDate ? ` Rapor tarihi: ${reportDate}.` : ''}

Bu PDF kredi notu özeti olduğu için limit kullanımı, gecikme geçmişi, aktif borç, banka hesabı ve kredi kartı adedi bu belgede yer almıyor; eksik alanları sıfır kabul etmiyorum.

Dosya: ${latestFileName || 'yüklenen dosya'}. Belge tipi: ${latestDocumentType || 'bilinmiyor'}. Eksik alanlar: ${
        latestMissingFields.length ? latestMissingFields.join(', ') : 'yok'
      }.

Kısa koç yorumu: Notunuz iyi seviyede görünse de tam risk değerlendirmesi için limit ve gecikme detayları gerekir. Sonraki adım olarak tam Findeks Risk Raporu veya banka limit özetini yükleyebilirsiniz.`;
    }

    return `Findeks raporuna göre kredi notunuz ${score ?? 'bilinmiyor'} ve bu seviye ${scoreBand} olarak yorumlanır.

Henüz yüklenmiş bir Findeks belgesi bulunamadı. Limit kullanımı, gecikme geçmişi, aktif borç, banka hesabı ve kredi kartı adedi hakkında yorum yapabilmem için bir Findeks Risk Raporu yüklemeniz gerekir; eksik alanları sıfır kabul etmiyorum.

Kısa koç yorumu: Sonraki adım olarak Findeks Risk Raporu PDF'inizi yükleyebilirsiniz.`;
  }

  return null;
};

export default function Assistant() {
  const { user } = useAuth();
  const location = useLocation();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSession, setActiveSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [openSessionMenuId, setOpenSessionMenuId] = useState<string | null>(null);
  const [renamingSessionId, setRenamingSessionId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null);
  
  const hasTriggeredRef = useRef(false);
  const hasBootstrappedSessionsRef = useRef(false);
  const isLoadingSessionsRef = useRef(false);
  const isCreatingSessionRef = useRef(false);
  const isRenamingRef = useRef(false);
  const sidebarMenuRef = useRef<HTMLDivElement | null>(null);
  // Phase 7.2F: Prevent duplicate auto-summary for the same message
  const autoSummarizedMessageIdsRef = useRef<Set<string>>(new Set());
  // Phase 7.2F: Unmount guard to prevent setState on unmounted component
  const isMountedRef = useRef(true);
  // Phase 7.2F: Ref to track active session ID — prevents stale closure in async finalize
  const activeSessionIdRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Phase 7.2F: Keep activeSessionIdRef in sync
  useEffect(() => {
    activeSessionIdRef.current = activeSession?.id ?? null;
  }, [activeSession?.id]);

  const pendingBridgeRef = useRef<{
    mode: AssistantEntryMode;
    findeksData?: any;
    initialQuery?: string;
  } | null>(null);

  // Phase 7.2F: Poll parse result and auto-send deterministic summary
  // Root cause of previous timeout: Edge Function uses onConflict='user_id,path',
  // so if the same file was parsed before, message_id is NOT updated on upsert.
  // Fix: Primary lookup by 'path' (unique per user+file), fallback by file_name.
  interface PollParseOpts {
    messageId: string;
    sessionId: string;
    userId: string;
    originalText: string;
    storagePath: string;
    fileName: string;
    uploadStartedAt: string;
  }
  const pollParseAndAutoSummary = async (opts: PollParseOpts) => {
    const { messageId, sessionId, userId, originalText, storagePath, fileName, uploadStartedAt } = opts;

    // Phase 7.2F Fix A: Attachment presence always qualifies for polling.
    // Previous bug: text-only gate blocked polling when user sent file with unrelated text.
    const hasAttachment = !!storagePath && !!fileName;
    const qNorm = normalizeText(originalText);
    const isAutoSummaryCandidate =
      hasAttachment ||
      qNorm.includes('analiz') ||
      qNorm.includes('yorumla') ||
      qNorm.includes('findeks') ||
      qNorm.includes('rapor') ||
      qNorm.includes('dosyay');

    if (import.meta.env.DEV) {
      console.log('[7.2F_POLL_GATE]', { hasAttachment, originalText, isAutoSummaryCandidate });
    }

    if (!isAutoSummaryCandidate) return;
    if (autoSummarizedMessageIdsRef.current.has(messageId)) return;

    const MAX_TRIES = 40;
    const INTERVAL_MS = 1500;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const isFindeksResult = (structured: any): boolean => {
      if (!structured) return false;
      const sd = structured.structured_data || structured;
      const docType = (sd.documentType || sd.document_type || '').toLowerCase();
      const pType = (sd.parserType || '').toLowerCase();
      const fields = sd.fields || sd;
      return (
        docType.includes('findeks') ||
        pType.includes('findeks') ||
        !!fields.creditScore ||
        !!sd.creditScore
      );
    };

    const finalize = async (status: 'parsed' | 'failed' | 'timeout', structuredData: Record<string, unknown> | null) => {
      const autoSummaryKey = `${messageId}_${storagePath}`;
      if (autoSummarizedMessageIdsRef.current.has(autoSummaryKey)) return;
      autoSummarizedMessageIdsRef.current.add(autoSummaryKey);

      if (status === 'failed') {
        const msg = await dataSourceAdapter.chat.addMessage(
          sessionId, userId, 'assistant',
          'Dosya alındı ancak analiz tamamlanamadı. PDF metin katmanı olmayabilir veya format desteklenmiyor olabilir.',
          undefined, undefined, 0
        );
        if (import.meta.env.DEV) console.log('[7.2F_UI_GUARD_FAILED]', { isMounted: isMountedRef.current, refId: activeSessionIdRef.current, sessionId, msgId: msg.id });
        if (isMountedRef.current && activeSessionIdRef.current === sessionId) {
          setMessages((prev) => {
            if (import.meta.env.DEV) console.log('[7.2F_SET_MESSAGES_FAILED]', { prevCount: prev.length, exists: prev.some((m) => m.id === msg.id) });
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
          await loadMessagesForSession(sessionId);
          if (import.meta.env.DEV) console.log('[7.2F_MESSAGE_INJECTED]', { status: 'failed', msgId: msg.id });
        } else {
          if (import.meta.env.DEV) console.log('[7.2F_MESSAGE_INJECTED_SKIPPED]', { status: 'failed', reason: 'guard_failed' });
        }
        return;
      }

      if (status === 'timeout') {
        if (import.meta.env.DEV) console.log('[7.2F_TIMEOUT_REASON] lastPass=3, timeout=true');
        const msg = await dataSourceAdapter.chat.addMessage(
          sessionId, userId, 'assistant',
          'Analiz beklenenden uzun sürdü. Sonuç arka planda tamamlanabilir; biraz sonra "Findeks raporumu yorumla" yazarsanız hazır sonucu kullanarak yorumlayabilirim.',
          undefined, undefined, 0
        );
        if (import.meta.env.DEV) console.log('[7.2F_UI_GUARD_TIMEOUT]', { isMounted: isMountedRef.current, refId: activeSessionIdRef.current, sessionId });
        if (isMountedRef.current && activeSessionIdRef.current === sessionId) {
          setMessages((prev) => {
            if (import.meta.env.DEV) console.log('[7.2F_SET_MESSAGES_TIMEOUT]', { prevCount: prev.length, exists: prev.some((m) => m.id === msg.id) });
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
          await loadMessagesForSession(sessionId);
        }
        return;
      }

      // status === 'parsed'
      if (!isFindeksResult(structuredData)) {
        const msg = await dataSourceAdapter.chat.addMessage(
          sessionId, userId, 'assistant',
          'Analiz tamamlandı, ancak bu dosya Findeks raporu gibi görünmüyor. Başka bir sorunuz varsa yardımcı olabilirim.',
          undefined, undefined, 0
        );
        if (import.meta.env.DEV) console.log('[7.2F_UI_GUARD_NON_FINDEKS]', { isMounted: isMountedRef.current, refId: activeSessionIdRef.current, sessionId });
        if (isMountedRef.current && activeSessionIdRef.current === sessionId) {
          setMessages((prev) => {
            if (import.meta.env.DEV) console.log('[7.2F_SET_MESSAGES_NON_FINDEKS]', { prevCount: prev.length, exists: prev.some((m) => m.id === msg.id) });
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
          await loadMessagesForSession(sessionId);
        }
        return;
      }

      if (import.meta.env.DEV) console.log('[7.2F_HAS_STRUCTURED_DATA] True');

      const baseContext = await buildUserContext(userId);
      const sd = structuredData as any;
      
      const syntheticAttachment = {
        file_name: fileName,
        document_type: (sd?.documentType || sd?.document_type || 'Unknown').toString().toLowerCase(),
        status: 'parsed',
        structured_data: structuredData
      };

      if (import.meta.env.DEV) console.log('[7.2F_SYNTHETIC_ATTACHMENT_INJECTED]');

      const freshEnriched = { 
        ...baseContext, 
        parsedAttachments: [
          syntheticAttachment as any,
          ...(baseContext.parsedAttachments ?? [])
        ],
        isProcessingNewFile: false 
      };
      
      const summary = buildDeterministicIntentAnswer(
        'Findeks raporumu profesyonelce yorumlar mısın?',
        freshEnriched,
        undefined
      );
      
      if (import.meta.env.DEV) console.log('[7.2F_SUMMARY_BUILT]', { ok: !!summary });

      const autoMsg = await dataSourceAdapter.chat.addMessage(
        sessionId, userId, 'assistant',
        summary ?? 'Analiz tamamlandı. Rapor detaylarını görmek için "Findeks raporumu yorumla" diyebilirsiniz.',
        undefined, undefined, 0
      );
      
      if (import.meta.env.DEV) console.log('[7.2F_UI_GUARD_PARSED]', { isMounted: isMountedRef.current, refId: activeSessionIdRef.current, sessionId, autoMsgId: autoMsg.id });
      if (isMountedRef.current && activeSessionIdRef.current === sessionId) {
        setMessages((prev) => {
          const alreadyExists = prev.some((m) => m.id === autoMsg.id);
          if (import.meta.env.DEV) console.log('[7.2F_SET_MESSAGES_PARSED]', { prevCount: prev.length, alreadyExists, autoMsgId: autoMsg.id });
          if (alreadyExists) return prev;
          return [...prev, autoMsg];
        });
        // Phase 7.2F-G: Fallback reload to guarantee live UI sync
        await loadMessagesForSession(sessionId);
        if (import.meta.env.DEV) console.log('[7.2F_MESSAGE_INJECTED]', { status: 'parsed', ok: true });
      } else {
        if (import.meta.env.DEV) console.log('[7.2F_MESSAGE_INJECTED_SKIPPED]', { status: 'parsed', reason: 'guard_failed', isMounted: isMountedRef.current, refId: activeSessionIdRef.current, sessionId });
      }
    };
    if (import.meta.env.DEV) console.log('[7.2F_POLL_START]', { messageId, storagePath, fileName, userId });

    const uploadSinceWithTolerance = new Date(
      new Date(uploadStartedAt).getTime() - 2 * 60 * 1000
    ).toISOString();

    for (let attempt = 0; attempt < MAX_TRIES; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, INTERVAL_MS));

      try {
        let row = null;

        // PASS 1: Exact match by storage path (most reliable -- path is unique per user+file in Edge Fn)
        const { data: byPath, error: err1 } = await supabase
          .from('attachment_parse_results')
          .select('status, structured_data')
          .eq('user_id', userId)
          .eq('path', storagePath)
          .in('status', ['parsed', 'failed'])
          .maybeSingle();

        if (err1 && import.meta.env.DEV) console.warn('[7.2F_PASS_1_PATH] Error:', err1.message);

        if (byPath) {
          row = byPath;
          if (import.meta.env.DEV) console.log('[7.2F_ROW_FOUND] Pass-1 (path)', row.status);
        }

        // PASS 2: file_name + updated_at window
        if (!row) {
          const { data: byName, error: err2 } = await supabase
            .from('attachment_parse_results')
            .select('status, structured_data')
            .eq('user_id', userId)
            .eq('file_name', fileName)
            .in('status', ['parsed', 'failed'])
            .gte('updated_at', uploadSinceWithTolerance)
            .order('updated_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (err2 && import.meta.env.DEV) console.warn('[7.2F_PASS_2_FILENAME_UPDATED_AT] Error:', err2.message);

          if (byName) {
            row = byName;
            if (import.meta.env.DEV) console.log('[7.2F_ROW_FOUND] Pass-2 (file_name)', row.status);
          }
        }

        // PASS 3: Latest parsed/failed for this user since upload
        if (!row) {
          const { data: byLatest, error: err3 } = await supabase
            .from('attachment_parse_results')
            .select('status, structured_data')
            .eq('user_id', userId)
            .in('status', ['parsed', 'failed'])
            .gte('updated_at', uploadSinceWithTolerance)
            .order('updated_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (err3 && import.meta.env.DEV) console.warn('[7.2F_PASS_3_LATEST_UPDATED_AT] Error:', err3.message);

          if (byLatest) {
            row = byLatest;
            if (import.meta.env.DEV) console.log('[7.2F_ROW_FOUND] Pass-3 (latest)', row.status);
          }
        }

        if (!row) {
          if (import.meta.env.DEV) console.log('[POLL_PARSE] Attempt ' + (attempt + 1) + ': no completed row yet');
          continue;
        }

        if (row.status === 'failed') { await finalize('failed', null); return; }
        if (row.status === 'parsed') { await finalize('parsed', row.structured_data); return; }

      } catch (err) {
        if (import.meta.env.DEV) console.warn('Unexpected poll error:', err);
      }
    }

    await finalize('timeout', null);
  };

  const entryMode: AssistantEntryMode =
    location.state?.findeksData ? "findeks_bridge" : "general_finance";

  useEffect(() => {
    if (user && !hasBootstrappedSessionsRef.current) {
      hasBootstrappedSessionsRef.current = true;
      loadSessions();
    }
  }, [user]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpenSessionMenuId(null);
        setRenamingSessionId(null);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    if (location.state?.findeksData && !hasTriggeredRef.current) {
      pendingBridgeRef.current = {
        mode: "findeks_bridge",
        findeksData: location.state.findeksData,
        initialQuery: location.state.initialQuery,
      };

      if (import.meta.env.DEV) {
        console.log("[ASSISTANT_BRIDGE_CAPTURED]", {
          documentType: location.state.findeksData?.documentType,
          parserVersion: location.state.findeksData?.parserVersion,
          missingFields: location.state.findeksData?.missingFields,
        });
      }
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

      const timer = setTimeout(async () => {
        if (hasTriggeredRef.current) return;
        if (!user || !activeSession) return;

        hasTriggeredRef.current = true;

        setIsLoading(true);
        try {
          const userMsg = await dataSourceAdapter.chat.addMessage(
            activeSession.id,
            user.id,
            'user',
            initialQuery,
            undefined,
            0
          );
          setMessages((prev) => [...prev, userMsg]);

          const assistantText = buildDeterministicFindeksWelcome(payload.findeksData);
          const assistantMsg = await dataSourceAdapter.chat.addMessage(
            activeSession.id,
            user.id,
            'assistant',
            assistantText,
            undefined,
            0
          );
          setMessages((prev) => [...prev, assistantMsg]);
        } catch (error) {
          console.error("Bridge message error:", error);
        } finally {
          setIsLoading(false);
        }

        pendingBridgeRef.current = null;

        if (import.meta.env.DEV) {
          console.log("[ASSISTANT_BRIDGE_SENT_DETERMINISTIC]", {
            documentType: payload.findeksData?.documentType,
            missingFields: payload.findeksData?.missingFields,
          });
        }
      }, 800);

      return () => clearTimeout(timer);
    }
  }, [activeSession, isLoading]);

  const loadSessions = async () => {
    if (!user || isLoadingSessionsRef.current) return;

    isLoadingSessionsRef.current = true;
    try {
      const userSessions = await dataSourceAdapter.chat.getUserSessions(user.id);

      if (userSessions.length > 0) {
        setSessions(userSessions);
        setActiveSession((prev) => prev ?? userSessions[0]);
        return;
      }

      setSessions([]);
      setActiveSession(null);
      setMessages([]);
    } finally {
      isLoadingSessionsRef.current = false;
    }
  };

  const loadMessages = async () => {
    if (!activeSession) return;
    const sessionMessages = await dataSourceAdapter.chat.getMessages(activeSession.id);
    setMessages(sessionMessages);
  };

  // Phase 7.2F-G: Session-independent message reload for async finalize
  const loadMessagesForSession = async (sid: string) => {
    const sessionMessages = await dataSourceAdapter.chat.getMessages(sid);
    if (isMountedRef.current && activeSessionIdRef.current === sid) {
      setMessages(sessionMessages);
      if (import.meta.env.DEV) console.log('[7.2F_LOAD_MESSAGES_FALLBACK]', { sid, count: sessionMessages.length });
    }
  };

  const createNewSession = async () => {
    if (!user || isCreatingSessionRef.current) return null;

    isCreatingSessionRef.current = true;
    try {
      const title = `Sohbet ${new Date().toLocaleDateString('tr-TR')} ${new Date().toLocaleTimeString('tr-TR', {
        hour: '2-digit',
        minute: '2-digit',
      })}`;
      const newSession = await dataSourceAdapter.chat.createSession(user.id, title);
      setSessions((prev) => {
        if (prev.some((s) => s.id === newSession.id)) return prev;
        return [newSession, ...prev];
      });
      setActiveSession(newSession);
      setMessages([]);
      return newSession;
    } finally {
      isCreatingSessionRef.current = false;
    }
  };

  const handleStartRename = (session: ChatSession) => {
    setRenamingSessionId(session.id);
    setRenameValue(session.title);
    setOpenSessionMenuId(null);
  };

  const handleConfirmRename = async (sessionId: string) => {
    if (isRenamingRef.current) return;
    isRenamingRef.current = true;

    try {
      const trimmed = renameValue.trim();
      if (!trimmed) {
        setRenamingSessionId(null);
        return;
      }

      await dataSourceAdapter.chat.renameSession(sessionId, trimmed);

      setSessions((prev) =>
        prev.map((s) => (s.id === sessionId ? { ...s, title: trimmed } : s))
      );

      if (activeSessionIdRef.current === sessionId) {
        setActiveSession((prev) => (prev ? { ...prev, title: trimmed } : prev));
      }
    } catch (e) {
      console.error(e);
    } finally {
      isRenamingRef.current = false;
      setRenamingSessionId(null);
      setRenameValue('');
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    const confirmed = window.confirm('Bu sohbet ve içindeki tüm mesajlar silinecek. Emin misiniz?');
    if (!confirmed || deletingSessionId) return;

    setDeletingSessionId(sessionId);

    try {
      await dataSourceAdapter.chat.deleteSession(sessionId);

      const remaining = sessions.filter((s) => s.id !== sessionId);

      if (remaining.length > 0) {
        setSessions(remaining);

        if (activeSessionIdRef.current === sessionId) {
          setActiveSession(remaining[0]);
        }

        return;
      }

      setSessions([]);
      setActiveSession(null);
      setMessages([]);
      return;
    } finally {
      setDeletingSessionId(null);
      setOpenSessionMenuId(null);
    }
  };

  const handleSendMessage = async (
    text: string,
    options?: {
      findeksOverride?: any;
      entryMode?: AssistantEntryMode;
      file?: File;
    }
  ) => {
    if (!user || !activeSession) return;

    setIsLoading(true);

    try {
      let attachmentMetadata = undefined;

      if (options?.file && options.file.size > 0) {
        const file = options.file;
        const safeFileName = file.name.replace(/[^\w.\-ğüşöçıİĞÜŞÖÇ]/g, '_');
        const filePath = `${user.id}/${activeSession.id}/${Date.now()}-${safeFileName}`;

        const { error: uploadError } = await supabase.storage
          .from('chat-attachments')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false,
            contentType: file.type || 'application/octet-stream',
          });

        if (uploadError) {
          throw new Error(`Dosya yüklenemedi: ${uploadError.message}`);
        }

        attachmentMetadata = {
          name: file.name,
          type: file.type,
          size: file.size,
          path: filePath,
          bucket: 'chat-attachments'
        };
      }

      const userMsg = await dataSourceAdapter.chat.addMessage(
        activeSession.id,
        user.id,
        'user',
        text,
        undefined,
        attachmentMetadata,
        0
      );
      setMessages((prev) => [...prev, userMsg]);

      // Trigger server-side parsing (non-blocking) + Phase 7.2F auto-summary polling
      if (attachmentMetadata) {
        const uploadStartedAt = new Date().toISOString();
        const sessionToken = (await supabase.auth.getSession()).data.session?.access_token;
        fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/api-gateway/ai/attachments/parse`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sessionToken}`
          },
          body: JSON.stringify({
            messageId: userMsg.id,
            bucket: attachmentMetadata.bucket,
            path: attachmentMetadata.path,
            fileName: attachmentMetadata.name,
            mimeType: attachmentMetadata.type
          })
        }).then((resp) => {
          if (import.meta.env.DEV) {
            console.log('[7.2F_PARSE_TRIGGER_RESPONSE]', { ok: resp.ok, status: resp.status });
            if (!resp.ok) {
              resp.text().then((body) => {
                console.warn('[7.2F_PARSE_TRIGGER_FAILED]', { status: resp.status, body: body.slice(0, 200) });
              }).catch(() => {});
            }
          }
        }).catch((err) => {
          if (import.meta.env.DEV) console.warn('[7.2F_PARSE_TRIGGER_NETWORK_ERROR]', err);
        });

        // Phase 7.2F: Start polling for parse completion in background
        pollParseAndAutoSummary({
          messageId: userMsg.id,
          sessionId: activeSession.id,
          userId: user.id,
          originalText: text,
          storagePath: attachmentMetadata.path,
          fileName: attachmentMetadata.name,
          uploadStartedAt,
        });
      }

      const context = await buildUserContext(user.id);
      
      if (import.meta.env.DEV) {
        console.log('[ASSISTANT_CONTEXT_PARSED_ATTACHMENTS]', {
          count: context.parsedAttachments?.length || 0,
          latest: context.parsedAttachments?.[0]?.structured_data,
        });
      }
      
      const enrichedContext = {
        ...context,
        findeksData: options?.findeksOverride ?? context.findeksData,
        assistantEntryMode: options?.entryMode ?? entryMode,
        isProcessingNewFile: !!attachmentMetadata, // Pass flag to deterministic guard
      };

      const deterministicAnswer = buildDeterministicIntentAnswer(
        text,
        enrichedContext,
        options?.findeksOverride ?? location.state?.findeksData
      );

      if (deterministicAnswer) {
        const assistantMsg = await dataSourceAdapter.chat.addMessage(
          activeSession.id,
          user.id,
          'assistant',
          deterministicAnswer,
          undefined, // suggestedTransaction
          undefined, // attachment
          0          // tokensUsed
        );
        setMessages((prev) => [...prev, assistantMsg]);
        return;
      }

      // SECURITY LAYER 2: Block LLM call entirely for calculation patterns
      const qNorm = normalizeText(text);
      const isBlockedLLMQuery = (
        qNorm.includes('hesapla') ||
        qNorm.includes('hesap yap') ||
        qNorm.includes('oran uret') ||
        qNorm.includes('skor uret') ||
        qNorm.includes('yeni oran') ||
        qNorm.includes('yeni risk') ||
        qNorm.includes('calculate') ||
        qNorm.includes('generate ratio')
      );

      if (isBlockedLLMQuery) {
        const safeMsg = await dataSourceAdapter.chat.addMessage(
          activeSession.id,
          user.id,
          'assistant',
          'Yeni hesaplama yapamam. Sadece mevcut deterministik sonuçları yorumlayabilirim.',
          undefined,
          undefined,
          0
        );
        setMessages((prev) => [...prev, safeMsg]);
        return;
      }

      const response = await sendAssistantMessage(text, enrichedContext, messages);

      // SECURITY LAYER 3: Prompt leak sanitizer
      const LEAK_PATTERNS = [
        'No JSON', 'internal thought', 'must not', 'deterministic summary',
        'The user asks', 'According to deterministic', 'Write Turkish', 'max 900 chars',
      ];
      const hasLeak = LEAK_PATTERNS.some((p) => response.message.includes(p));
      const safeResponse = hasLeak
        ? 'Yanıt oluşturulurken bir sorun oluştu. Lütfen sorunuzu tekrar sorun.'
        : response.message;

      const assistantMsg = await dataSourceAdapter.chat.addMessage(
        activeSession.id,
        user.id,
        'assistant',
        safeResponse,
        response.suggestedTransaction,
        undefined, // attachment
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
    <div className="flex h-[calc(100vh-2rem)] min-h-0 gap-4 overflow-hidden animate-fade-in">
      <div className="w-64 bg-neutral-50 rounded-lg p-4 border border-neutral-200 flex flex-col min-h-0 overflow-hidden">
        <h2 className="text-lg font-bold mb-4">Sohbetler</h2>

        <button
          onClick={createNewSession}
          className="w-full mb-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
        >
          + Yeni Sohbet Başlat
        </button>

        <div className="flex-1 space-y-2 overflow-y-auto min-h-0 pr-1">
          {sessions.map((session) => (
            <div key={session.id} className="relative group">
              {renamingSessionId === session.id ? (
                <input
                  type="text"
                  autoFocus
                  className="w-full text-left px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onBlur={() => handleConfirmRename(session.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleConfirmRename(session.id);
                    if (e.key === 'Escape') setRenamingSessionId(null);
                  }}
                />
              ) : (
                <div
                  className={`flex items-center rounded-lg pr-2 transition-colors ${
                    activeSession?.id === session.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-white hover:bg-neutral-100 text-neutral-900'
                  }`}
                >
                  <button
                    onClick={() => {
                      setActiveSession(session);
                      setOpenSessionMenuId(null);
                    }}
                    className="flex-1 truncate text-left px-3 py-2"
                    title={session.title}
                  >
                    {session.title}
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenSessionMenuId(
                        openSessionMenuId === session.id ? null : session.id
                      );
                    }}
                    className={`p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity ${
                      activeSession?.id === session.id
                        ? 'hover:bg-blue-700 text-blue-100 hover:text-white'
                        : 'hover:bg-neutral-200 text-neutral-400 hover:text-neutral-600'
                    }`}
                  >
                    ⋮
                  </button>
                </div>
              )}

              {openSessionMenuId === session.id && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onPointerDown={() => setOpenSessionMenuId(null)}
                    aria-hidden="true"
                  />
                  <div className="absolute right-0 top-10 z-20 w-40 rounded-lg border bg-white shadow-lg overflow-hidden py-1">
                    <button
                      className="w-full text-left px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStartRename(session);
                      }}
                    >
                      Yeniden adlandır
                    </button>
                    <button
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteSession(session.id);
                      }}
                      disabled={deletingSessionId === session.id}
                    >
                      {deletingSessionId === session.id ? 'Siliniyor...' : 'Sil'}
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="mb-4">
          <h1 className="text-2xl font-bold">AI Finansal Danışman</h1>
          <p className="text-neutral-600 text-sm">
            Doğal dille finansal sorularını sor, aksiyon al
          </p>
        </div>

        {activeSession ? (
          <ChatInterface
            messages={messages}
            isLoading={isLoading}
            onSendMessage={handleSendMessage}
            onAcceptTransaction={handleAcceptTransaction}
          />
        ) : (
          <div className="flex-1 min-h-0 flex flex-col items-center justify-center text-neutral-500 border-2 border-dashed border-neutral-200 rounded-lg bg-neutral-50">
            <div className="text-4xl mb-4">💬</div>
            <p className="text-lg font-medium text-neutral-700">Henüz bir sohbet seçilmedi</p>
            <p className="text-sm mt-1">Sol menüdeki “+ Yeni Sohbet Başlat” butonuyla yeni bir sohbet oluşturabilirsiniz.</p>
          </div>
        )}
      </div>
    </div>
  );
}
