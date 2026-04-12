export interface ParsedTransaction {
  date: Date;
  description: string;
  amount: number;
  type: 'gelir' | 'gider';
  category?: string;
  reference?: string;
}

export interface ParserResult {
  transactions: ParsedTransaction[];
  bankName?: string;
  accountNumber?: string;
  errors: string[];
}

/**
 * Basit CSV/metin tabanlı banka ekstresi parser
 * Format: Tarih,Açıklama,Miktar,Tür (gelir/gider)
 * Örnek: 2026-04-01,Market,250.50,gider
 */
export class BankStatementParser {
  static parseCSV(content: string): ParserResult {
    const lines = content.split('\n').filter((line) => line.trim());
    const transactions: ParsedTransaction[] = [];
    const errors: string[] = [];
    const categoryMap: Record<string, string> = {
      market: 'yiyecek',
      superm: 'yiyecek',
      gıda: 'yiyecek',
      ödeme: 'işlem',
      havale: 'işlem',
      virman: 'işlem',
      maaş: 'maaş',
      ücret: 'maaş',
      salon: 'sağlık',
      eczane: 'sağlık',
      okul: 'eğitim',
      üniversi: 'eğitim',
      internet: 'hizmet',
      elektrik: 'hizmet',
      su: 'hizmet',
      doğalgaz: 'hizmet',
      telefon: 'hizmet',
      netflix: 'eğlence',
      spotify: 'eğlence',
      oyun: 'eğlence',
    };

    lines.forEach((line, idx) => {
      try {
        const parts = line.split(',').map((p) => p.trim());
        if (parts.length < 4) {
          errors.push(`Satır ${idx + 1}: Eksik alan`);
          return;
        }

        const dateStr = parts[0];
        const description = parts[1];
        const amountStr = parts[2];
        const typeStr = parts[3].toLowerCase();

        const amount = parseFloat(amountStr);
        if (isNaN(amount)) {
          errors.push(`Satır ${idx + 1}: Geçersiz miktar`);
          return;
        }

        const type = typeStr === 'gelir' || typeStr === 'income' ? 'gelir' : 'gider';

        const date = new Date(dateStr);
        if (isNaN(date.getTime())) {
          errors.push(`Satır ${idx + 1}: Geçersiz tarih`);
          return;
        }

        const category = this.categorizeTransaction(description, categoryMap);

        transactions.push({
          date,
          description,
          amount: Math.abs(amount),
          type,
          category,
        });
      } catch (e) {
        errors.push(`Satır ${idx + 1}: Parse hatası`);
      }
    });

    return { transactions, errors };
  }

  static parseText(content: string): ParserResult {
    const transactions: ParsedTransaction[] = [];
    const errors: string[] = [];

    const lines = content.split('\n');
    const datePattern = /(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/;
    const amountPattern = /([\d.]+,?\d*)\s*(TL|₺)?/;

    lines.forEach((line, idx) => {
      if (!line.trim()) return;

      try {
        const dateMatch = line.match(datePattern);
        if (!dateMatch) {
          errors.push(`Satır ${idx + 1}: Tarih bulunamadı`);
          return;
        }

        const dateStr = dateMatch[1].replace(/[-\/]/g, '-');
        const [day, month, year] = dateStr.split('-');
        const date = new Date(`${year}-${month}-${day}`);

        if (isNaN(date.getTime())) {
          errors.push(`Satır ${idx + 1}: Geçersiz tarih`);
          return;
        }

        const amountMatch = line.match(amountPattern);
        if (!amountMatch) {
          errors.push(`Satır ${idx + 1}: Miktar bulunamadı`);
          return;
        }

        const amountStr = amountMatch[1].replace(/,/, '.');
        const amount = parseFloat(amountStr);

        if (isNaN(amount)) {
          errors.push(`Satır ${idx + 1}: Geçersiz miktar`);
          return;
        }

        const type = line.toLowerCase().includes('gelir') ? 'gelir' : 'gider';
        const description = line.replace(dateMatch[0], '').replace(amountMatch[0], '').trim();

        transactions.push({
          date,
          description: description || 'İşlem',
          amount: Math.abs(amount),
          type,
        });
      } catch (e) {
        errors.push(`Satır ${idx + 1}: Parse hatası`);
      }
    });

    return { transactions, errors };
  }

  private static categorizeTransaction(
    description: string,
    categoryMap: Record<string, string>
  ): string {
    const desc = description.toLowerCase();
    for (const [keyword, category] of Object.entries(categoryMap)) {
      if (desc.includes(keyword)) {
        return category;
      }
    }
    return 'diğer';
  }
}

export const bankStatementParser = new BankStatementParser();
