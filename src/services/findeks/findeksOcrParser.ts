import * as pdfjsLib from 'pdfjs-dist';
import { DelayRecord, BankAccount } from '@/types';

// TASK 47.28: Vite-compatible worker configuration for PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

export type ExtractionStatus =
  | "found"
  | "not_found"
  | "low_confidence"
  | "rejected";

export interface ExtractedField<T> {
  value: T | null;
  status: ExtractionStatus;
  confidence: number;
  sourceText?: string;
  reason?: string;
  extractionMethod?: "anchor" | "regex" | "table" | "fallback";
  warnings?: string[];
}

export interface ScoreComponents {
  paymentHabits: ExtractedField<number>;
  currentAccountAndDebtStatus: ExtractedField<number>;
  creditUsageIntensity: ExtractedField<number>;
  newCreditOpenings: ExtractedField<number>;
}

export type FindeksDocumentType =
  | "findeks_credit_score_only"
  | "findeks_risk_report_individual"
  | "findeks_risk_report_commercial"
  | "bank_pdf"
  | "unknown";

export interface RawFindeksData {
  documentType: FindeksDocumentType;

  creditScore: ExtractedField<number>;
  reportDate: ExtractedField<string>;
  referenceCode: ExtractedField<string>;

  limitUsageRatio: ExtractedField<number>;
  delayMonths: ExtractedField<number>;
  bankAccounts: ExtractedField<number>;
  creditCards: ExtractedField<number>;
  activeDebts: ExtractedField<number>;

  scoreComponents: ScoreComponents;

  missingFields: string[];
  warnings: string[];
  rawTextPreview: string;
  parserVersion: string;

  delayHistory: DelayRecord[];
  banksList: BankAccount[];
}

function found<T>(
  value: T,
  confidence: number,
  sourceText: string,
  extractionMethod: ExtractedField<T>["extractionMethod"]
): ExtractedField<T> {
  return {
    value,
    status: "found",
    confidence,
    sourceText,
    extractionMethod,
  };
}

function notFound<T>(
  reason: string,
  warnings: string[] = []
): ExtractedField<T> {
  return {
    value: null,
    status: "not_found",
    confidence: 0,
    reason,
    warnings,
  };
}

function rejected<T>(
  reason: string,
  sourceText?: string
): ExtractedField<T> {
  return {
    value: null,
    status: "rejected",
    confidence: 0,
    reason,
    sourceText,
  };
}

export async function extractTextFromPDF(file: File): Promise<string> {
  try {
    if (file.type !== 'application/pdf') {
      throw new Error("Lütfen sadece PDF dosyası yükleyin.");
    }

    console.log(`[FINDEKS_PARSER] Dijital okuma başlatılıyor: ${file.name}`);
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    
    let pageTexts = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      console.log(`[FINDEKS_PARSER] Sayfa ${i} okundu, bulunan karakter: ${pageText.length}`);
      pageTexts.push(pageText);
    }
    
    // Aggressive normalization: Clear hidden control chars and standardize spaces
    const extractedText = pageTexts
      .join(' ')
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Control chars
      .replace(/\n|\r|\t/g, ' ') // Force spaces for line breaks
      .replace(/\s+/g, ' ') // Standardize multiple spaces
      .trim();
    
    if (extractedText.length < 3) {
      throw new Error("Bu PDF dosyasında dijital metin katmanı bulunamadı. Lütfen taranmış resim yerine bankanızdan indirdiğiniz orijinal PDF dosyasını yükleyin.");
    }

    console.log(`[FINDEKS_PARSER] Okuma tamamlandı. Toplam karakter: ${extractedText.length}`);
    return extractedText;
  } catch (error) {
    console.error('[FINDEKS_PARSER] Hata:', error);
    throw error;
  }
}

function classifyFindeksDocument(text: string): FindeksDocumentType {
  const t = text.toLowerCase();
  
  if (t.includes('ticari risk')) {
    return "findeks_risk_report_commercial";
  }

  // Risk table detection
  const hasTable = t.includes("bireysel kredili ürün bilgileri tablosu") || 
                   t.includes("banka/finansal kuruluş bazında") ||
                   t.includes("detaylı ürün bilgileri") ||
                   t.includes("hesap özeti");
                   
  if (hasTable) {
    return "findeks_risk_report_individual";
  }
  
  if (t.includes("findeks kredi notunuz") || t.includes("kredi notu'nun bileşenleri")) {
    return "findeks_credit_score_only";
  }
  
  return "unknown";
}

export function parseRawFindeksText(ocrText: string): RawFindeksData {
  console.log("[FINDEKS_PARSER_V2_ACTIVE] Evidence-based parser is running.");
  
  const documentType = classifyFindeksDocument(ocrText);
  console.log("[FINDEKS_INFO] Belge tipi:", documentType);

  const data: RawFindeksData = {
    documentType,
    creditScore: notFound("Henüz aranmadı"),
    reportDate: notFound("Henüz aranmadı"),
    referenceCode: notFound("Henüz aranmadı"),
    limitUsageRatio: notFound("Henüz aranmadı"),
    delayMonths: notFound("Henüz aranmadı"),
    bankAccounts: notFound("Henüz aranmadı"),
    creditCards: notFound("Henüz aranmadı"),
    activeDebts: notFound("Henüz aranmadı"),
    scoreComponents: {
      paymentHabits: notFound("Henüz aranmadı"),
      currentAccountAndDebtStatus: notFound("Henüz aranmadı"),
      creditUsageIntensity: notFound("Henüz aranmadı"),
      newCreditOpenings: notFound("Henüz aranmadı"),
    },
    missingFields: [],
    warnings: [],
    rawTextPreview: ocrText.substring(0, 200),
    parserVersion: "2.0.0",
    delayHistory: [],
    banksList: [],
  };

  // KREDİ NOTU ÇIKARIMI
  const scoreMatch = ocrText.match(/(?:Findeks Kredi Notunuz|Kredi Notunuz)\s*[:\-\s]*(\d{3,4})/i) || ocrText.match(/Kredi Notunuz[^\d]*(\d{3,4})/i);
  if (scoreMatch) {
    const val = parseInt(scoreMatch[1], 10);
    if (val >= 1 && val <= 1900) {
      data.creditScore = found(val, 98, scoreMatch[0], "anchor");
      console.log("[FINDEKS_SUCCESS] Kredi notu bulundu:", data.creditScore.value);
    } else {
      data.creditScore = notFound("Sayısal değer kredi notu aralığında değil.");
    }
  } else {
    data.creditScore = notFound("Kredi notu anchor kelimeleri bulunamadı.");
  }

  // REPORT DATE ÇIKARIMI
  const dateMatch = ocrText.match(/RAPOR TARİHİ\s*(\d{2}\.\d{2}\.\d{4})/i);
  if (dateMatch) {
    data.reportDate = found(dateMatch[1], 95, dateMatch[0], "regex");
  } else {
    data.reportDate = notFound("Rapor tarihi bulunamadı.");
  }

  // REFERENCE CODE ÇIKARIMI
  const refMatch = ocrText.match(/REFERANS KODU\s*([A-Z0-9]+)/i) || ocrText.match(/REFERANS NO\s*([A-Z0-9]+)/i);
  if (refMatch) {
    data.referenceCode = found(refMatch[1], 90, refMatch[0], "regex");
  } else {
    data.referenceCode = notFound("Referans kodu bulunamadı.");
  }

  // SCORE COMPONENTS ÇIKARIMI
  if (ocrText.toLowerCase().includes("kredi notu'nun bileşenleri")) {
    const p1 = ocrText.match(/%45/);
    const p2 = ocrText.match(/%32/);
    const p3 = ocrText.match(/%18/);
    const p4 = ocrText.match(/%5/);
    if (p1 && p2 && p3 && p4) {
      data.scoreComponents.paymentHabits = found(45, 90, "Kredili Ürün Ödeme Alışkanlıkları", "fallback");
      data.scoreComponents.currentAccountAndDebtStatus = found(32, 90, "Mevcut Hesap ve Borç Durumu", "fallback");
      data.scoreComponents.creditUsageIntensity = found(18, 90, "Kredi Kullanım Yoğunluğu", "fallback");
      data.scoreComponents.newCreditOpenings = found(5, 90, "Yeni Kredili Ürün Açılışları", "fallback");
    }
  }

  // LIMIT USAGE ÇIKARIMI
  if (documentType === "findeks_credit_score_only") {
    data.limitUsageRatio = notFound<number>(
      "Bu PDF kredi notu özetidir; gerçek limit kullanım oranı içermez.",
      ["Sayfa 2'deki yüzdeler kredi notu bileşen ağırlıklarıdır, limit kullanımı değildir."]
    );
    console.log("[FINDEKS_INFO] Limit kullanım oranı bu PDF'te bulunamadı.");
  } else {
    const limitAnchors = ["limit kullanım oranı", "limit doluluk oranı", "borç / limit", "toplam borç", "toplam limit", "kullanılan limit"];
    let limitVal: number | null = null;
    let limitSource = "";
    
    const lowerText = ocrText.toLowerCase();
    for (const anchor of limitAnchors) {
      const idx = lowerText.indexOf(anchor);
      if (idx !== -1) {
        const window = ocrText.substring(Math.max(0, idx - 50), Math.min(ocrText.length, idx + 150));
        const matches = Array.from(window.matchAll(/(\d+)\s*%/g));
        
        for (const m of matches) {
          const valStr = m[1];
          const valIdx = m.index!;
          
          const localContextStart = Math.max(0, valIdx - 20);
          const localContextEnd = Math.min(window.length, valIdx + valStr.length + 20);
          const localContext = window.substring(localContextStart, localContextEnd).toLowerCase();
          
          const rejectedWords = [
            'bileşen', 'ağırlık', 'payı', "kredi notu'nun bileşenleri",
            'kredili ürün ödeme alışkanlıkları', 'mevcut hesap ve borç durumu',
            'kredi kullanım yoğunluğu', 'yeni kredili ürün açılışları'
          ];
          
          const isRejected = rejectedWords.some(w => localContext.includes(w));
          if (!isRejected) {
             limitVal = parseFloat(valStr);
             limitSource = anchor;
             break;
          }
        }
        if (limitVal !== null) break;
      }
    }
    
    if (limitVal !== null) {
      data.limitUsageRatio = found(limitVal, 85, limitSource, "anchor");
    } else {
      data.limitUsageRatio = notFound("Limit kullanım oranı bulunamadı.");
      console.log("[FINDEKS_INFO] Limit kullanım oranı bu PDF'te bulunamadı.");
    }
  }

  // PRODUCT COUNTS & DELAY MONTHS
  data.bankAccounts = notFound<number>("Banka hesabı adedi bu PDF'te bulunamadı.");
  data.creditCards = notFound<number>("Kredi kartı adedi bu PDF'te bulunamadı.");
  data.activeDebts = notFound<number>("Aktif borç adedi bu PDF'te bulunamadı.");
  data.delayMonths = notFound<number>("Gecikme geçmişi bu PDF'te bulunamadı.");

  const lines = ocrText.split(/\r?\n|\. /);
  for (const line of lines) {
    const lowerLine = line.toLowerCase();
    
    const delayMatch = line.match(/gecikmiş[^\d]*(\d+)\s*ay/i) || line.match(/ödenmemiş[^\d]*(\d+)\s*ay/i);
    if (delayMatch && data.delayMonths.status !== "found") {
       data.delayMonths = found(parseInt(delayMatch[1], 10), 90, line.trim(), "regex");
    }

    if (lowerLine.includes('üye adedi') || lowerLine.includes('hesap adedi') || lowerLine.includes('kart adedi') || lowerLine.includes('açık hesap adedi')) {
      const match = line.match(/(\d+)/);
      if (match) {
        const val = parseInt(match[1], 10);
        if (val > 0 && val < 50) {
           if ((lowerLine.includes('üye') || lowerLine.includes('hesap')) && data.bankAccounts.status !== "found") {
             data.bankAccounts = found(val, 80, line.trim(), "regex");
           }
           if (lowerLine.includes('kart') && data.creditCards.status !== "found") {
             data.creditCards = found(val, 80, line.trim(), "regex");
           }
        }
      }
    }
    
    if (lowerLine.match(/aktif borç|borç sayısı/i)) {
      const match = line.match(/(\d+)/);
      if (match) {
        const val = parseInt(match[1], 10);
        if (data.activeDebts.status !== "found") data.activeDebts = found(val, 80, line.trim(), "regex");
      }
    }
  }

  // missingFields DOLDUR
  const checkFields: (keyof RawFindeksData)[] = ["limitUsageRatio", "delayMonths", "bankAccounts", "creditCards", "activeDebts"];
  for (const field of checkFields) {
    const f = data[field] as ExtractedField<number>;
    if (f.status === "not_found" || f.status === "low_confidence") {
      data.missingFields.push(field);
    }
  }

  return data;
}

export function determineRiskLevel(
  creditScore: any,
  limitUsageRatio: any,
  delayMonths: any
): 'kritik' | 'gelişim_açık' | 'dengeli' | 'güvenli' | 'prestijli' {
  const score = typeof creditScore === 'object' && creditScore !== null ? creditScore.value || 0 : Number(creditScore) || 0;
  const ratio = typeof limitUsageRatio === 'object' && limitUsageRatio !== null ? limitUsageRatio.value || 0 : Number(limitUsageRatio) || 0;
  const delay = typeof delayMonths === 'object' && delayMonths !== null ? delayMonths.value || 0 : Number(delayMonths) || 0;

  if (delay > 0 || ratio > 80) {
    return 'kritik';
  }

  const findeksScoreRanges = {
    kritik: { min: 1, max: 969 },
    gelişim_açık: { min: 970, max: 1149 },
    dengeli: { min: 1150, max: 1469 },
    güvenli: { min: 1470, max: 1719 },
    prestijli: { min: 1720, max: 1900 },
  };

  const range = Object.entries(findeksScoreRanges).find(
    ([_, bounds]) => score >= bounds.min && score <= bounds.max
  );

  return (range?.[0] || 'gelişim_açık') as 'kritik' | 'gelişim_açık' | 'dengeli' | 'güvenli' | 'prestijli';
}

export function calculateScoreImprovementPotential(
  currentScore: any,
  limitUsageRatio: any,
  delayMonths: any
): number {
  const score = typeof currentScore === 'object' && currentScore !== null ? currentScore.value || 0 : Number(currentScore) || 0;
  const ratio = typeof limitUsageRatio === 'object' && limitUsageRatio !== null ? limitUsageRatio.value || 0 : Number(limitUsageRatio) || 0;
  const delay = typeof delayMonths === 'object' && delayMonths !== null ? delayMonths.value || 0 : Number(delayMonths) || 0;

  let potential = 0;

  if (score < 1900) {
    potential += Math.min(100, (1900 - score) / 5);
  }

  if (ratio > 50) {
    potential += Math.min(150, (ratio - 50) * 2);
  }

  if (delay > 0) {
    potential += Math.min(200, delay * 50);
  }

  return Math.min(500, Math.round(potential));
}
