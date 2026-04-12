import type { Transaction } from '@/types';

export interface ParsedInput {
  amount: number;
  description: string;
  type: 'gelir' | 'gider';
  suggestedCategory: string;
}

const INCOME_KEYWORDS = [
  'maaş', 'maas', 'ücret', 'ucret', 'gelir', 'kira geliri', 'prim', 'ikramiye',
  'serbest', 'fatura gelir', 'transfer gelir', 'havale gelir',
];

const CATEGORY_RULES: Array<{ keywords: string[]; category: string }> = [
  { keywords: ['a101', 'bim', 'migros', 'şok', 'sok', 'carrefour', 'metro', 'market', 'manav', 'bakkal', 'getir market'], category: 'Market' },
  { keywords: ['starbucks', 'kafe', 'cafe', 'kahve', 'restaurant', 'restoran', 'yemek', 'pizza', 'burger', 'döner', 'doner', 'lokanta', 'yemekhane', 'getir yemek', 'trendyol yemek', 'yemeksepeti'], category: 'Yeme-İçme' },
  { keywords: ['elektrik', 'su', 'doğalgaz', 'dogalgaz', 'internet', 'telefon', 'gsm', 'fatura', 'abonelik'], category: 'Faturalar' },
  { keywords: ['taksi', 'uber', 'otopark', 'benzin', 'akaryakıt', 'akaryakit', 'metro', 'otobüs', 'otobus', 'ulaşım', 'ulasim', 'brt', 'tramvay'], category: 'Ulaşım' },
  { keywords: ['kira', 'aidat'], category: 'Kira & Aidat' },
  { keywords: ['sinema', 'konser', 'tiyatro', 'eğlence', 'eglence', 'netflix', 'spotify', 'youtube', 'disney', 'blutv'], category: 'Eğlence' },
  { keywords: ['eczane', 'ilaç', 'ilac', 'doktor', 'hastane', 'klinik', 'sağlık', 'saglik', 'muayene'], category: 'Sağlık' },
  { keywords: ['giyim', 'kıyafet', 'kiyafet', 'ayakkabı', 'ayakkabi', 'zara', 'hm', 'lcw', 'mango', 'koton'], category: 'Giyim' },
  { keywords: ['kitap', 'kırtasiye', 'kirtasiye', 'okul', 'kurs', 'eğitim', 'egitim', 'udemy'], category: 'Eğitim' },
  { keywords: ['taksit', 'kredi'], category: 'Kredi & Taksit' },
  { keywords: ['maaş', 'maas', 'ücret', 'ucret', 'gelir', 'prim', 'ikramiye'], category: 'Gelir' },
  { keywords: ['kira geliri', 'kira tahsilat'], category: 'Kira Geliri' },
];

export function parseQuickInput(raw: string): ParsedInput | null {
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed) return null;

  const amountMatch = trimmed.match(/(\d+([.,]\d{1,2})?)/);
  if (!amountMatch) return null;

  const amountStr = amountMatch[1].replace(',', '.');
  const amount = parseFloat(amountStr);
  if (isNaN(amount) || amount <= 0) return null;

  const description = trimmed.replace(amountMatch[1], '').trim();

  const isIncome = INCOME_KEYWORDS.some((kw) => description.includes(kw));
  const type: 'gelir' | 'gider' = isIncome ? 'gelir' : 'gider';

  const suggestedCategory = predictCategory(description) || (type === 'gelir' ? 'Gelir' : 'Diğer');

  return { amount, description, type, suggestedCategory };
}

export function predictCategory(description: string): string {
  const lower = description.toLowerCase();
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
