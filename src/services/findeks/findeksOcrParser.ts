import Tesseract from 'tesseract.js';
import { DelayRecord, BankAccount } from '@/types';

export interface RawFindeksData {
  creditScore: number;
  limitUsageRatio: number;
  delayMonths: number;
  delayHistory: DelayRecord[];
  bankAccounts: number;
  creditCards: number;
  activeDebts: number;
  banksList: BankAccount[];
}

const findeksScoreRanges = {
  kritik: { min: 1, max: 969 },
  gelişim_açık: { min: 970, max: 1149 },
  dengeli: { min: 1150, max: 1469 },
  güvenli: { min: 1470, max: 1719 },
  prestijli: { min: 1720, max: 1900 },
};

export async function extractTextFromPDF(pdfFile: File): Promise<string> {
  try {
    const { data } = await Tesseract.recognize(
      pdfFile,
      'tur'
    );
    return data.text;
  } catch (error) {
    throw new Error(`PDF OCR failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export function parseRawFindeksText(ocrText: string): RawFindeksData {
  const data: RawFindeksData = {
    creditScore: 0,
    limitUsageRatio: 0,
    delayMonths: 0,
    delayHistory: [],
    bankAccounts: 0,
    creditCards: 0,
    activeDebts: 0,
    banksList: [],
  };

  // Extract Kredi Notu (Findeks Score)
  const scorePattern = /kredi\s+notu[:\s]*([\d]+)|puanınız[:\s]*([\d]+)|score[:\s]*([\d]+)/i;
  const scoreMatch = ocrText.match(scorePattern);
  if (scoreMatch) {
    data.creditScore = parseInt(scoreMatch[1] || scoreMatch[2] || scoreMatch[3] || '0', 10);
  }

  // Extract Limit Kullanım Oranı
  const limitPattern = /limit\s+kullanım[:\s]*(%?[\d.]+)|kullanım\s+oranı[:\s]*(%?[\d.]+)/i;
  const limitMatch = ocrText.match(limitPattern);
  if (limitMatch) {
    const ratioStr = limitMatch[1] || limitMatch[2] || '0';
    data.limitUsageRatio = parseFloat(ratioStr.replace('%', '').trim());
  }

  // Extract Gecikme Geçmişi (delay months)
  const delayPattern = /gecikmiş[:\s]*([\d]+)\s*ay|ödenmemiş[:\s]*([\d]+)\s*ay|delay[:\s]*([\d]+)/i;
  const delayMatch = ocrText.match(delayPattern);
  if (delayMatch) {
    data.delayMonths = parseInt(delayMatch[1] || delayMatch[2] || delayMatch[3] || '0', 10);
  }

  // Extract Banka Hesap Sayısı
  const bankAccPattern = /banka\s+hesab[ı|i][:\s]*([\d]+)|hesap\s+say[ı|i]s[ı|i][:\s]*([\d]+)/i;
  const bankAccMatch = ocrText.match(bankAccPattern);
  if (bankAccMatch) {
    data.bankAccounts = parseInt(bankAccMatch[1] || bankAccMatch[2] || '0', 10);
  }

  // Extract Kredi Kartı Sayısı
  const cardPattern = /kredi\s+kartı[:\s]*([\d]+)|kart\s+say[ı|i]s[ı|i][:\s]*([\d]+)|kartlar[:\s]*([\d]+)/i;
  const cardMatch = ocrText.match(cardPattern);
  if (cardMatch) {
    data.creditCards = parseInt(cardMatch[1] || cardMatch[2] || cardMatch[3] || '0', 10);
  }

  // Extract Active Debts
  const debtPattern = /aktif\s+borç[:\s]*([\d]+)|borç\s+say[ı|i]s[ı|i][:\s]*([\d]+)|bor[ç|c]lar[:\s]*([\d]+)/i;
  const debtMatch = ocrText.match(debtPattern);
  if (debtMatch) {
    data.activeDebts = parseInt(debtMatch[1] || debtMatch[2] || debtMatch[3] || '0', 10);
  }

  // Extract Banks List (simplified pattern)
  const bankNamePatterns = [
    /garanti\s+bank/i,
    /iş\s+bank/i,
    /yapı\s+kredi|ykb/i,
    /akbank/i,
    /denizbank/i,
    /kuveyt\s+türk/i,
    /hsbc/i,
    /finansbank/i,
  ];

  bankNamePatterns.forEach((pattern) => {
    if (pattern.test(ocrText)) {
      const bankName = ocrText.match(pattern)?.[0]?.split(/\s+/)[0] || 'Banka';
      if (!data.banksList.find((b) => b.name.toLowerCase() === bankName.toLowerCase())) {
        data.banksList.push({
          name: bankName,
          type: 'banka',
          status: 'aktif',
        });
      }
    }
  });

  return data;
}

export function determineRiskLevel(
  creditScore: number,
  limitUsageRatio: number,
  delayMonths: number
): 'kritik' | 'gelişim_açık' | 'dengeli' | 'güvenli' | 'prestijli' {
  if (delayMonths > 0 || limitUsageRatio > 80) {
    return 'kritik';
  }

  const range = Object.entries(findeksScoreRanges).find(
    ([_, bounds]) => creditScore >= bounds.min && creditScore <= bounds.max
  );

  return (range?.[0] || 'gelişim_açık') as 'kritik' | 'gelişim_açık' | 'dengeli' | 'güvenli' | 'prestijli';
}

export function calculateScoreImprovementPotential(
  currentScore: number,
  limitUsageRatio: number,
  delayMonths: number
): number {
  let potential = 0;

  if (currentScore < 1900) {
    potential += Math.min(100, (1900 - currentScore) / 5);
  }

  if (limitUsageRatio > 50) {
    potential += Math.min(150, (limitUsageRatio - 50) * 2);
  }

  if (delayMonths > 0) {
    potential += Math.min(200, delayMonths * 50);
  }

  return Math.min(500, Math.round(potential));
}
