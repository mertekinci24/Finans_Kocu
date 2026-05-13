import { useState, useMemo } from 'react';
import type { Account } from '@/types';
import { calculateCCDates, formatFullDate } from '@/utils/dateUtils';
import { useTimeStore } from '@/stores/timeStore';

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
  const [statementDay, setStatementDay] = useState('');
  const [paymentDay, setPaymentDay] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { systemDate } = useTimeStore();

  const nextStatement = useMemo(() => {
    if (type !== 'kredi_kartı' || !statementDay || !paymentDay) return null;
    const sDay = parseInt(statementDay, 10);
    const pDay = parseInt(paymentDay, 10);
    if (isNaN(sDay) || isNaN(pDay)) return null;
    try {
      return calculateCCDates(sDay, pDay, systemDate);
    } catch {
      return null;
    }
  }, [type, statementDay, paymentDay, systemDate]);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'Hesap adı zorunlu';
    const bal = parseFloat(balance.replace(',', '.'));
    if (isNaN(bal)) errs.balance = 'Geçerli bir tutar gir';
    if (type === 'kredi_kartı') {
      const lim = parseFloat(cardLimit.replace(',', '.'));
      if (isNaN(lim) || lim <= 0) errs.cardLimit = 'Geçerli limit gir';
      
      const sDay = parseInt(statementDay, 10);
      if (isNaN(sDay) || sDay < 1 || sDay > 31) errs.statementDay = '1-31 arası gün zorunlu';
      
      const pDay = parseInt(paymentDay, 10);
      if (isNaN(pDay) || pDay < 1 || pDay > 31) errs.paymentDay = '1-31 arası gün zorunlu';
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
      const sDay = statementDay ? parseInt(statementDay, 10) : undefined;
      const pDay = paymentDay ? parseInt(paymentDay, 10) : undefined;

      await onSubmit({
        userId: 'temp-user-id',
        name: name.trim(),
        type,
        balance: bal,
        currency: 'TRY',
        bankName: bankName.trim() || undefined,
        cardLimit: lim,
        statementDay: sDay,
        paymentDay: pDay,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-muted-foreground mb-2">Hesap Türü</label>
        <div className="grid grid-cols-3 gap-2">
          {TYPE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setType(opt.value)}
              className={`p-3 rounded-lg border-2 text-left transition-all ${
                type === opt.value
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:border-border/80'
              }`}
            >
              <div className="text-sm font-medium text-foreground">{opt.label}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{opt.desc}</div>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-muted-foreground mb-1">Hesap Adı</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={type === 'nakit' ? 'ör. Cüzdan' : type === 'banka' ? 'ör. Garanti Maaş' : 'ör. Garanti Bonus'}
          className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 bg-background text-foreground ${
            errors.name ? 'border-destructive' : 'border-border'
          }`}
        />
        {errors.name && <p className="text-xs text-destructive mt-1">{errors.name}</p>}
      </div>

      {type !== 'nakit' && (
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1">Banka Adı</label>
          <input
            value={bankName}
            onChange={(e) => setBankName(e.target.value)}
            placeholder="ör. Garanti BBVA, Akbank, İş Bankası"
            className="w-full border border-border bg-background text-foreground rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-muted-foreground mb-1">
          {type === 'kredi_kartı' ? 'Mevcut Borç (₺)' : 'Güncel Bakiye (₺)'}
        </label>
        <input
          value={balance}
          onChange={(e) => setBalance(e.target.value)}
          placeholder="0"
          type="text"
          className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 bg-background text-foreground ${
            errors.balance ? 'border-destructive' : 'border-border'
          }`}
        />
        {errors.balance && <p className="text-xs text-destructive mt-1">{errors.balance}</p>}
      </div>

      {type === 'kredi_kartı' && (
        <div className="grid grid-cols-2 gap-4 bg-muted/50 p-4 rounded-xl border border-border">
          <div className="col-span-2">
            <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1.5">Kart Limiti (₺)</label>
            <input
              value={cardLimit}
              onChange={(e) => setCardLimit(e.target.value)}
              placeholder="ör. 25000"
              type="text"
              className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 bg-background text-foreground ${
                errors.cardLimit ? 'border-destructive' : 'border-border'
              }`}
            />
            {errors.cardLimit && <p className="text-xs text-destructive mt-1">{errors.cardLimit}</p>}
          </div>
          <div>
            <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1.5">Hesap Kesim (1-31)</label>
            <input
              value={statementDay}
              onChange={(e) => setStatementDay(e.target.value)}
              placeholder="ör. 15"
              type="number"
              min="1"
              max="31"
              className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 bg-background text-foreground ${
                errors.statementDay ? 'border-destructive' : 'border-border'
              }`}
            />
            {errors.statementDay && <p className="text-xs text-destructive mt-1">{errors.statementDay}</p>}
            {nextStatement && (
              <p className="text-[9px] text-muted-foreground mt-1.5 font-medium">
                Hedef ekstre: {formatFullDate(nextStatement.statementDate)}
              </p>
            )}
          </div>
          <div>
            <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1.5">Son Ödeme (1-31)</label>
            <input
              value={paymentDay}
              onChange={(e) => setPaymentDay(e.target.value)}
              placeholder="ör. 25"
              type="number"
              min="1"
              max="31"
              className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 bg-background text-foreground ${
                errors.paymentDay ? 'border-destructive' : 'border-border'
              }`}
            />
            {errors.paymentDay && <p className="text-xs text-destructive mt-1">{errors.paymentDay}</p>}
          </div>
        </div>
      )}

      <div className="flex gap-2 pt-2">
        <button
          type="submit"
          disabled={submitting}
          className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-colors disabled:opacity-50"
        >
          {submitting ? 'Kaydediliyor...' : 'Hesap Ekle'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2.5 bg-muted text-muted-foreground rounded-lg text-sm hover:bg-muted/80 transition-colors"
        >
          İptal
        </button>
      </div>
    </form>
  );
}
