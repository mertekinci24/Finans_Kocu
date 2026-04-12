export interface BankMeta {
  shortName: string;
  color: string;
  textColor: string;
}

const BANK_MAP: Array<{ keywords: string[]; meta: BankMeta }> = [
  {
    keywords: ['garanti', 'bbva'],
    meta: { shortName: 'GNT', color: '#00A651', textColor: '#ffffff' },
  },
  {
    keywords: ['iş bankası', 'is bankasi', 'isbank'],
    meta: { shortName: 'İŞB', color: '#1D5FA6', textColor: '#ffffff' },
  },
  {
    keywords: ['yapı kredi', 'yapi kredi', 'ykb'],
    meta: { shortName: 'YKB', color: '#003087', textColor: '#ffffff' },
  },
  {
    keywords: ['akbank'],
    meta: { shortName: 'AKB', color: '#E30613', textColor: '#ffffff' },
  },
  {
    keywords: ['ziraat'],
    meta: { shortName: 'ZRT', color: '#E30613', textColor: '#ffffff' },
  },
  {
    keywords: ['vakıfbank', 'vakifbank'],
    meta: { shortName: 'VKF', color: '#F5A500', textColor: '#000000' },
  },
  {
    keywords: ['halkbank'],
    meta: { shortName: 'HLK', color: '#1F3A7A', textColor: '#ffffff' },
  },
  {
    keywords: ['teb'],
    meta: { shortName: 'TEB', color: '#0066B2', textColor: '#ffffff' },
  },
  {
    keywords: ['ing'],
    meta: { shortName: 'ING', color: '#FF6200', textColor: '#ffffff' },
  },
  {
    keywords: ['denizbank'],
    meta: { shortName: 'DNZ', color: '#003DA5', textColor: '#ffffff' },
  },
  {
    keywords: ['finans', 'qnb'],
    meta: { shortName: 'QNB', color: '#6D1F7A', textColor: '#ffffff' },
  },
  {
    keywords: ['enpara'],
    meta: { shortName: 'ENP', color: '#FF6900', textColor: '#ffffff' },
  },
  {
    keywords: ['papara'],
    meta: { shortName: 'PPR', color: '#7B2D8B', textColor: '#ffffff' },
  },
];

export function getBankMeta(bankName?: string): BankMeta {
  if (!bankName) {
    return { shortName: '?', color: '#64748b', textColor: '#ffffff' };
  }
  const lower = bankName.toLowerCase();
  for (const entry of BANK_MAP) {
    if (entry.keywords.some((kw) => lower.includes(kw))) {
      return entry.meta;
    }
  }
  const initials = bankName
    .split(' ')
    .slice(0, 3)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
  return { shortName: initials || bankName.slice(0, 3).toUpperCase(), color: '#64748b', textColor: '#ffffff' };
}

export function getAccountTypeIcon(type: 'nakit' | 'banka' | 'kredi_kartı'): string {
  switch (type) {
    case 'nakit': return 'N';
    case 'banka': return 'B';
    case 'kredi_kartı': return 'K';
  }
}

export function getAccountTypeLabel(type: 'nakit' | 'banka' | 'kredi_kartı'): string {
  switch (type) {
    case 'nakit': return 'Nakit';
    case 'banka': return 'Banka';
    case 'kredi_kartı': return 'Kredi Kartı';
  }
}
