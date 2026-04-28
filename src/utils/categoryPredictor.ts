import type { Transaction } from '@/types';

export interface ParsedInput {
  amount: number;
  description: string;
  type: 'gelir' | 'gider';
  suggestedCategory: string;
  suggestedAccountId?: string;
}

const INCOME_KEYWORDS = [
  'maaş', 'maas', 'ücret', 'ucret', 'gelir', 'kira geliri', 'prim', 'ikramiye',
  'serbest', 'fatura gelir', 'transfer gelir', 'havale gelir',
  'tahsilat', 'yatan', 'hakediş', 'hakedis', 'bonus'
];

const CATEGORY_RULES: Array<{ keywords: string[]; category: string }> = [
  { keywords: ['a101', 'bim', 'migros', 'şok', 'sok', 'carrefour', 'metro', 'market', 'manav', 'bakkal', 'getir market'], category: 'Market' },
  { keywords: ['starbucks', 'kafe', 'cafe', 'kahve', 'restaurant', 'restoran', 'yemek', 'pizza', 'burger', 'hamburger', 'kebap', 'döner', 'doner', 'lokanta', 'yemekhane', 'getir yemek', 'trendyol yemek', 'yemeksepeti'], category: 'Yeme-İçme' },
  { keywords: ['elektrik', 'su', 'doğalgaz', 'dogalgaz', 'internet', 'telefon', 'gsm', 'fatura', 'abonelik'], category: 'Faturalar' },
  { keywords: ['taksi', 'uber', 'otopark', 'benzin', 'akaryakıt', 'akaryakit', 'metro', 'otobüs', 'otobus', 'ulaşım', 'ulasim', 'brt', 'tramvay'], category: 'Ulaşım' },
  { keywords: ['kira', 'aidat'], category: 'Kira & Aidat' },
  { keywords: ['sinema', 'konser', 'tiyatro', 'eğlence', 'eglence', 'netflix', 'spotify', 'youtube', 'disney', 'blutv'], category: 'Eğlence' },
  { keywords: ['eczane', 'ilaç', 'ilac', 'doktor', 'hastane', 'klinik', 'sağlık', 'saglik', 'muayene'], category: 'Sağlık' },
  { keywords: ['giyim', 'kıyafet', 'kiyafet', 'ayakkabı', 'ayakkabi', 'zara', 'hm', 'lcw', 'mango', 'koton', 'pantolon', 'gömlek', 'gomlek', 'etek', 'ceket', 'mont', 'kaban', 'aksesuar'], category: 'Giyim' },
  { keywords: ['kitap', 'kırtasiye', 'kirtasiye', 'okul', 'kurs', 'eğitim', 'egitim', 'udemy'], category: 'Eğitim' },
  { keywords: ['taksit', 'kredi'], category: 'Kredi & Taksit' },
  { keywords: ['maaş', 'maas', 'ücret', 'ucret', 'gelir', 'prim', 'ikramiye'], category: 'Gelir' },
  { keywords: ['kira geliri', 'kira tahsilat'], category: 'Kira Geliri' },
];

export function parseQuickInput(raw: string, accounts?: Account[]): ParsedInput | null {
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed) return null;

  const signMatch = trimmed.match(/^([+-])/);
  const hasPlus = signMatch && signMatch[1] === '+';
  const hasMinus = signMatch && signMatch[1] === '-';

  const amountMatch = trimmed.match(/(\d+([.,]\d{1,2})?)/);
  if (!amountMatch) return null;

  const amountStr = amountMatch[1].replace(',', '.');
  const amount = parseFloat(amountStr);
  if (isNaN(amount) || amount <= 0) return null;

  const descriptionParts = trimmed.replace(amountMatch[0], '').replace(/^[+-]\s*/, '').trim();
  const description = descriptionParts;

  // Özel işlem tipleri için genişletilmiş income kontrolü
  const isIncome = INCOME_KEYWORDS.some((kw) => description.includes(kw));
  
  let type: 'gelir' | 'gider' = 'gider';
  if (hasMinus) {
    type = 'gider';
  } else if (hasPlus || isIncome) {
    type = 'gelir';
  }

  const suggestedCategory = predictCategory(description, type) || (type === 'gelir' ? 'Gelir' : 'Diğer');

  let suggestedAccountId: string | undefined;
  if (accounts && accounts.length > 0) {
    const matchedAccount = accounts.find((acc) => description.includes(acc.name.toLowerCase()));
    if (matchedAccount) {
      suggestedAccountId = matchedAccount.id;
    }
  }

  return { amount, description, type, suggestedCategory, suggestedAccountId };
}

export function predictCategory(description: string, type?: 'gelir' | 'gider'): string {
  const lower = description.toLowerCase();

  // 1. Tip belirtilmişse Öncelikli Tarama (Priority Rule)
  if (type) {
    for (const rule of CATEGORY_RULES) {
      const isIncomeCategory = rule.category === 'Gelir' || rule.category === 'Kira Geliri';
      
      // Eğer işlem "gelir" ise, "Gider" yönergesi olanları (Kira & Aidat vb.) tamamen atla.
      // Eğer işlem "gider" ise, "Gelir" yönergesi olanları atla.
      if (type === 'gelir' && !isIncomeCategory) continue;
      if (type === 'gider' && isIncomeCategory) continue;

      if (rule.keywords.some((kw) => lower.includes(kw))) {
        return rule.category;
      }
    }
  }

  // 2. Tip belirtilmemişse veya öncelikten sonuç çıkmadıysa Fallback/Brute Tarama
  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.some((kw) => lower.includes(kw))) {
      return rule.category;
    }
  }
  return '';
}

export function predictFromHistory(description: string, history: Transaction[]): string {
  if (!description || history.length === 0) return '';
  const lower = description.toLowerCase();

  const matches = history
    .filter((t) => t.description.toLowerCase().includes(lower) && t.category)
    .reduce<Record<string, number>>((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + 1;
      return acc;
    }, {});

  const sorted = Object.entries(matches).sort((a, b) => b[1] - a[1]);
  return sorted.length > 0 ? sorted[0][0] : '';
}

export const ALL_CATEGORIES = [
  'Market', 'Yeme-İçme', 'Faturalar', 'Ulaşım', 'Kira & Aidat',
  'Eğlence', 'Sağlık', 'Giyim', 'Eğitim', 'Kredi & Taksit',
  'Gelir', 'Kira Geliri', 'Diğer',
];
