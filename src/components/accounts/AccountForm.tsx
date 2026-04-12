import { useState } from 'react';
import type { Account } from '@/types';

interface AccountFormProps {
  onSubmit: (data: Omit<Account, 'id' | 'createdAt' | 'updatedAt' | 'isActive'>) => Promise<void>;
  onCancel: () => void;
}

type AccountType = 'nakit' | 'banka' | 'kredi_kartı';

const TYPE_OPTIONS: Array<{ value: AccountType; label: string; desc: string }> = [
  { value: 'nakit', label: 'Nakit', desc: 'Cüzdan, çekmece' },
  { value: 'banka', label: 'Banka', desc: 'Vadesiz hesap' },
  { value: 'kredi_kartı', label: 'Kredi Kartı', desc: 'Kredi kartı borcu' },
];

export default function AccountForm({ onSubmit, onCancel }: AccountFormProps): JSX.Element {
  const [type, setType] = useState<AccountType>('banka');
  const [name, setName] = useState('');
  const [bankName, setBankName] = useState('');
  const [balance, setBalance] = useState('');
  const [cardLimit, setCardLimit] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'Hesap adı zorunlu';
    const bal = parseFloat(balance.replace(',', '.'));
    if (isNaN(bal)) errs.balance = 'Geçerli bir tutar gir';
    if (type === 'kredi_kartı' && cardLimit) {
      const lim = parseFloat(cardLimit.replace(',', '.'));
      if (isNaN(lim) || lim <= 0) errs.cardLimit = 'Geçerli limit gir';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const bal = parseFloat(balance.replace(',', '.'));
      const lim = cardLimit ? parseFloat(cardLimit.replace(',', '.')) : undefined;
      await onSubmit({
        userId: 'temp-user-id',
        name: name.trim(),
        type,
        balance: bal,
        currency: 'TRY',
        bankName: bankName.trim() || undefined,
        cardLimit: lim,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-2">Hesap Türü</label>
        <div className="grid grid-cols-3 gap-2">
          {TYPE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setType(opt.value)}
              className={`p-3 rounded-lg border-2 text-left transition-all ${
                type === opt.value
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-neutral-200 hover:border-neutral-300'
              }`}
            >
              <div className="text-sm font-medium text-neutral-900">{opt.label}</div>
              <div className="text-xs text-neutral-500 mt-0.5">{opt.desc}</div>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-1">Hesap Adı</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={type === 'nakit' ? 'ör. Cüzdan' : type === 'banka' ? 'ör. Garanti Maaş' : 'ör. Garanti Bonus'}
          className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 ${
            errors.name ? 'border-error-400' : 'border-neutral-300'
          }`}
        />
        {errors.name && <p className="text-xs text-error-600 mt-1">{errors.name}</p>}
      </div>

      {type !== 'nakit' && (
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">Banka Adı</label>
          <input
            value={bankName}
            onChange={(e) => setBankName(e.target.value)}
            placeholder="ör. Garanti BBVA, Akbank, İş Bankası"
            className="w-full border border-neutral-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
          />
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-1">
          {type === 'kredi_kartı' ? 'Mevcut Borç (₺)' : 'Güncel Bakiye (₺)'}
        </label>
        <input
          value={balance}
          onChange={(e) => setBalance(e.target.value)}
          placeholder="0"
          type="text"
          className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 ${
            errors.balance ? 'border-error-400' : 'border-neutral-300'
          }`}
        />
        {errors.balance && <p className="text-xs text-error-600 mt-1">{errors.balance}</p>}
      </div>

      {type === 'kredi_kartı' && (
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">Kart Limiti (₺)</label>
          <input
            value={cardLimit}
            onChange={(e) => setCardLimit(e.target.value)}
            placeholder="ör. 25000"
            type="text"
            className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 ${
              errors.cardLimit ? 'border-error-400' : 'border-neutral-300'
            }`}
          />
          {errors.cardLimit && <p className="text-xs text-error-600 mt-1">{errors.cardLimit}</p>}
        </div>
      )}

      <div className="flex gap-2 pt-2">
        <button
          type="submit"
          disabled={submitting}
          className="flex-1 py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors disabled:opacity-50"
        >
          {submitting ? 'Kaydediliyor...' : 'Hesap Ekle'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2.5 bg-neutral-100 text-neutral-700 rounded-lg text-sm hover:bg-neutral-200 transition-colors"
        >
          İptal
        </button>
      </div>
    </form>
  );
}
