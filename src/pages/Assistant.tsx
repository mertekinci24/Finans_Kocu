import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { dataSourceAdapter, supabase } from '@/services/supabase/adapter';
import { buildUserContext } from '@/services/assistant/ragContextBuilder';
import { sendAssistantMessage } from '@/services/assistant/assistantService';
import ChatInterface from '@/components/assistant/ChatInterface';
import { ChatSession, ChatMessage, SuggestedTransaction } from '@/types';

type AssistantEntryMode = "findeks_bridge" | "general_finance";

// Phase 7.2F-I: Debug flag to reduce noise in production
const ASSISTANT_DEBUG = import.meta.env.DEV && import.meta.env.VITE_ASSISTANT_DEBUG === 'true';

// Phase 7.2F-I: Explicitly treat 0 as a known value, while rejecting null/undefined/''
const hasKnownValue = (value: unknown): boolean =>
  value !== null && value !== undefined && value !== '';

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
      ? "dengeli / orta" // Fallback to avoid gap
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
      hasKnownValue(sd?.fields?.creditScore) || 
      hasKnownValue(sd?.creditScore)
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

  // --- DETERMINISTIC INTENT GUARDS (PHASE 7.2D-UAT — PRIORITY ORDER) ---

  // GUARD 0 (HIGHEST PRIORITY): New Calculation/Ratio Blocking Guard
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

    const isFullRiskReport =
      latestDocumentType === 'findeks_full_risk_report' ||
      hasFullRiskFields(latestFields);

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
  const autoSummarizedMessageIdsRef = useRef<Set<string>>(new Set());
  const isMountedRef = useRef(true);
  const activeSessionIdRef = useRef<string | null>(null);
  const isPollingRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    activeSessionIdRef.current = activeSession?.id ?? null;
  }, [activeSession?.id]);

  const pendingBridgeRef = useRef<{
    mode: AssistantEntryMode;
    findeksData?: any;
    initialQuery?: string;
  } | null>(null);

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

    if (isPollingRef.current.has(messageId)) return;
    isPollingRef.current.add(messageId);

    try {
      const qNorm = normalizeText(originalText);
      const isAutoSummaryCandidate =
        !!storagePath ||
        qNorm.includes('analiz') ||
        qNorm.includes('yorumla') ||
        qNorm.includes('findeks') ||
        qNorm.includes('rapor');

      if (!isAutoSummaryCandidate) return;
      if (autoSummarizedMessageIdsRef.current.has(messageId)) return;

      const MAX_TRIES = 40;
      const INTERVAL_MS = 1500;

      const isFindeksResult = (structured: any): boolean => {
        if (!structured) return false;
        const sd = structured.structured_data || structured;
        const fields = sd.fields || sd;
        return (
          (sd.documentType || '').toLowerCase().includes('findeks') ||
          hasKnownValue(fields.creditScore)
        );
      };

      const finalize = async (status: 'parsed' | 'failed' | 'timeout', structuredData: Record<string, unknown> | null) => {
        const autoSummaryKey = `${messageId}_${storagePath}`;
        if (autoSummarizedMessageIdsRef.current.has(autoSummaryKey)) return;
        autoSummarizedMessageIdsRef.current.add(autoSummaryKey);

        const isCurrentSession = isMountedRef.current && activeSessionIdRef.current === sessionId;
        if (!isCurrentSession) return;

        let responseText = '';
        if (status === 'failed') {
          responseText = 'Dosya alındı ancak analiz tamamlanamadı. PDF formatı desteklenmiyor olabilir.';
        } else if (status === 'timeout') {
          responseText = 'Analiz beklenenden uzun sürdü. Sonuç hazır olduğunda yorumlayabilirim.';
        } else if (status === 'parsed' && !isFindeksResult(structuredData)) {
          responseText = 'Analiz tamamlandı, ancak bu dosya Findeks raporu gibi görünmüyor.';
        } else if (status === 'parsed') {
          const baseContext = await buildUserContext(userId);
          const syntheticAttachment = {
            file_name: fileName,
            document_type: (structuredData as any)?.documentType?.toLowerCase() || 'unknown',
            status: 'parsed',
            structured_data: structuredData
          };
          const freshEnriched = { 
            ...baseContext, 
            parsedAttachments: [syntheticAttachment as any, ...(baseContext.parsedAttachments ?? [])],
            isProcessingNewFile: false 
          };
          responseText = buildDeterministicIntentAnswer('Findeks raporumu yorumla', freshEnriched) || 'Analiz hazır.';
        }

        const msg = await dataSourceAdapter.chat.addMessage(sessionId, userId, 'assistant', responseText, undefined, undefined, 0);
        if (isMountedRef.current && activeSessionIdRef.current === sessionId) {
          setMessages((prev) => [...prev, msg]);
        }
      };

      const uploadSince = new Date(new Date(uploadStartedAt).getTime() - 120000).toISOString();
      for (let attempt = 0; attempt < MAX_TRIES; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, INTERVAL_MS));
        const { data: byPath } = await supabase.from('attachment_parse_results').select('status, structured_data').eq('user_id', userId).eq('path', storagePath).in('status', ['parsed', 'failed']).maybeSingle();
        if (byPath) {
          if (byPath.status === 'failed') { await finalize('failed', null); return; }
          if (byPath.status === 'parsed') { await finalize('parsed', byPath.structured_data); return; }
        }
      }
      await finalize('timeout', null);
    } finally {
      isPollingRef.current.delete(messageId);
    }
  };

  const entryMode: AssistantEntryMode = location.state?.findeksData ? "findeks_bridge" : "general_finance";

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
    }
  }, [location.state]);

  useEffect(() => {
    if (activeSession) loadMessages();
  }, [activeSession]);

  useEffect(() => {
    const payload = pendingBridgeRef.current;
    if (activeSession && !hasTriggeredRef.current && !isLoading && payload?.mode === "findeks_bridge") {
      const initialQuery = payload.initialQuery || buildDefaultFindeksQuery(payload.findeksData);
      const timer = setTimeout(async () => {
        if (hasTriggeredRef.current || !user || !activeSession) return;
        hasTriggeredRef.current = true;
        setIsLoading(true);
        try {
          const userMsg = await dataSourceAdapter.chat.addMessage(activeSession.id, user.id, 'user', initialQuery, undefined, 0);
          setMessages((prev) => [...prev, userMsg]);
          const assistantText = buildDeterministicFindeksWelcome(payload.findeksData);
          const assistantMsg = await dataSourceAdapter.chat.addMessage(activeSession.id, user.id, 'assistant', assistantText, undefined, 0);
          setMessages((prev) => [...prev, assistantMsg]);
        } finally {
          setIsLoading(false);
        }
        pendingBridgeRef.current = null;
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
        setActiveSession(userSessions[0]);
      }
    } finally {
      isLoadingSessionsRef.current = false;
    }
  };

  const loadMessages = async () => {
    if (!activeSession) return;
    const sessionMessages = await dataSourceAdapter.chat.getMessages(activeSession.id);
    setMessages(sessionMessages);
  };

  useEffect(() => {
    if (!user || !activeSession || !messages.length) return;
    const now = Date.now();
    const pendingMsg = [...messages].reverse().find(m => {
      if (m.role !== 'user' || !m.attachment?.path) return false;
      const createdAt = new Date(m.createdAt).getTime();
      return (now - createdAt < 300000) && (m.sessionId === activeSession.id);
    });

    if (pendingMsg && pendingMsg.attachment && !isPollingRef.current.has(pendingMsg.id)) {
      pollParseAndAutoSummary({
        messageId: pendingMsg.id,
        sessionId: activeSession.id,
        userId: user.id,
        originalText: pendingMsg.content,
        storagePath: pendingMsg.attachment.path,
        fileName: pendingMsg.attachment.name,
        uploadStartedAt: new Date(pendingMsg.createdAt).toISOString()
      });
    }
  }, [messages, activeSession?.id]);

  const createNewSession = async () => {
    if (!user || isCreatingSessionRef.current) return null;
    isCreatingSessionRef.current = true;
    try {
      const title = `Sohbet ${new Date().toLocaleDateString('tr-TR')} ${new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}`;
      const newSession = await dataSourceAdapter.chat.createSession(user.id, title);
      setSessions(prev => [newSession, ...prev]);
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
      if (trimmed) {
        await dataSourceAdapter.chat.renameSession(sessionId, trimmed);
        setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, title: trimmed } : s));
        if (activeSession?.id === sessionId) setActiveSession(prev => prev ? { ...prev, title: trimmed } : null);
      }
    } finally {
      isRenamingRef.current = false;
      setRenamingSessionId(null);
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (!window.confirm('Emin misiniz?')) return;
    setDeletingSessionId(sessionId);
    try {
      await dataSourceAdapter.chat.deleteSession(sessionId);
      const remaining = sessions.filter(s => s.id !== sessionId);
      setSessions(remaining);
      if (activeSession?.id === sessionId) {
        setActiveSession(remaining.length > 0 ? remaining[0] : null);
        if (remaining.length === 0) setMessages([]);
      }
    } finally {
      setDeletingSessionId(null);
      setOpenSessionMenuId(null);
    }
  };

  const handleSendMessage = async (text: string, options?: { file?: File }) => {
    if (!user || !activeSession) return;
    setIsLoading(true);
    try {
      let attachmentMetadata = undefined;
      if (options?.file) {
        const file = options.file;
        const filePath = `${user.id}/${activeSession.id}/${Date.now()}-${file.name}`;
        await supabase.storage.from('chat-attachments').upload(filePath, file);
        attachmentMetadata = { name: file.name, type: file.type, size: file.size, path: filePath, bucket: 'chat-attachments' };
      }

      const userMsg = await dataSourceAdapter.chat.addMessage(activeSession.id, user.id, 'user', text, undefined, attachmentMetadata, 0);
      setMessages(prev => [...prev, userMsg]);

      const context = await buildUserContext(user.id);
      const deterministicAnswer = buildDeterministicIntentAnswer(text, { ...context, isProcessingNewFile: !!attachmentMetadata });

      if (deterministicAnswer) {
        const assistantMsg = await dataSourceAdapter.chat.addMessage(activeSession.id, user.id, 'assistant', deterministicAnswer, undefined, undefined, 0);
        setMessages(prev => [...prev, assistantMsg]);
        return;
      }

      const response = await sendAssistantMessage(text, context, messages);
      const assistantMsg = await dataSourceAdapter.chat.addMessage(activeSession.id, user.id, 'assistant', response.message, response.suggestedTransaction, undefined, response.tokensUsed);
      setMessages(prev => [...prev, assistantMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptTransaction = async (transaction: SuggestedTransaction) => {
    if (!user) return;
    try {
      const accounts = await dataSourceAdapter.account.getByUserId(user.id);
      const primaryAccount = accounts.find(a => a.isActive) || accounts[0];
      if (!primaryAccount) return;
      await dataSourceAdapter.transaction.create({ accountId: primaryAccount.id, amount: transaction.amount, description: transaction.description, category: transaction.category, date: transaction.date, type: transaction.type });
      setMessages(prev => prev.map(msg => ({ ...msg, suggestedTransaction: undefined })));
      alert('Kaydedildi!');
    } catch (e) { alert('Hata!'); }
  };

  return (
    <div className="flex h-[calc(100vh-2rem)] min-h-0 gap-4 overflow-hidden animate-fade-in text-foreground">
      <div className="w-64 bg-muted/30 rounded-lg p-4 border border-border flex flex-col min-h-0 overflow-hidden">
        <h2 className="text-lg font-bold mb-4">Sohbetler</h2>
        <button onClick={createNewSession} className="w-full mb-4 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-medium transition-colors">+ Yeni Sohbet Başlat</button>
        <div className="flex-1 space-y-2 overflow-y-auto min-h-0 pr-1">
          {sessions.map((session) => (
            <div key={session.id} className="relative group">
              {renamingSessionId === session.id ? (
                <input
                  type="text"
                  autoFocus
                  className="w-full text-left px-3 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onBlur={() => handleConfirmRename(session.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleConfirmRename(session.id);
                    if (e.key === 'Escape') setRenamingSessionId(null);
                  }}
                />
              ) : (
                <div className={`flex items-center rounded-lg pr-2 transition-colors ${activeSession?.id === session.id ? 'bg-primary text-primary-foreground' : 'bg-card hover:bg-muted text-foreground'}`}>
                  <button onClick={() => setActiveSession(session)} className="flex-1 truncate text-left px-3 py-2 text-sm" title={session.title}>{session.title}</button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setOpenSessionMenuId(openSessionMenuId === session.id ? null : session.id); }}
                    className={`p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity ${activeSession?.id === session.id ? 'hover:bg-primary-foreground/20 text-primary-foreground' : 'hover:bg-muted text-muted-foreground'}`}
                  >⋮</button>
                </div>
              )}
              {openSessionMenuId === session.id && (
                <>
                  <div className="fixed inset-0 z-10" onPointerDown={() => setOpenSessionMenuId(null)} />
                  <div className="absolute right-0 top-10 z-20 w-40 rounded-lg border border-border bg-card shadow-lg overflow-hidden py-1">
                    <button className="w-full text-left px-4 py-2 text-sm hover:bg-muted" onClick={() => handleStartRename(session)}>Yeniden adlandır</button>
                    <button className="w-full text-left px-4 py-2 text-sm text-destructive hover:bg-destructive/10" onClick={() => handleDeleteSession(session.id)}>Sil</button>
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
          <p className="text-muted-foreground text-sm">Doğal dille finansal sorularını sor, aksiyon al</p>
        </div>
        {activeSession ? (
          <ChatInterface messages={messages} isLoading={isLoading} onSendMessage={handleSendMessage} onAcceptTransaction={handleAcceptTransaction} />
        ) : (
          <div className="flex-1 min-h-0 flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed border-border rounded-lg bg-muted/30">
            <div className="text-4xl mb-4">💬</div>
            <p className="text-lg font-medium text-foreground">Henüz bir sohbet seçilmedi</p>
            <p className="text-sm mt-1">Sol menüdeki “+ Yeni Sohbet Başlat” butonuyla yeni bir sohbet oluşturabilirsiniz.</p>
          </div>
        )}
      </div>
    </div>
  );
}
