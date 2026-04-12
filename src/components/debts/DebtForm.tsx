import { useState } from 'react';
import type { Debt } from '@/types';

interface DebtFormProps {
  onSubmit: (data: Omit<Debt, 'id' | 'createdAt'>) => Promise<void>;
  onCancel: () => void;
}

export default function DebtForm({ onSubmit, onCancel }: DebtFormProps): JSX.Element {
  const [creditorName, setCreditorName] = useState('');
  const [amount, setAmount] = useState('');
  const [remainingAmount, setRemainingAmount] = useState('');
  const [monthlyPayment, setMonthlyPayment] = useState('');
  const [interestRate, setInterestRate] = useState('0');
  const [dueDate, setDueDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleAmountChange = (val: string) => {
    setAmount(val);
    if (!remainingAmount) setRemainingAmount(val);
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!creditorName.trim()) errs.creditorName = 'Alacaklı adı zorunlu';
    if (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) errs.amount = 'Geçerli tutar gir';
    const rem = parseFloat(remainingAmount.replace(',', '.'));
    if (isNaN(rem) || rem < 0) errs.remainingAmount = 'Geçerli kalan tutar gir';
    if (!dueDate) errs.dueDate = 'Vade tarihi zorunlu';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const amt = parseFloat(amount.replace(',', '.'));
      const rem = parseFloat(remainingAmount.replace(',', '.'));
      const monthly = parseFloat(monthlyPayment.replace(',', '.')) || 0;

      await onSubmit({
        userId: 'temp-user-id',
        creditorName: creditorName.trim(),
        amount: amt,
        remainingAmount: rem,
        monthlyPayment: monthly,
        interestRate: parseFloat(interestRate) || 0,
        dueDate: new Date(dueDate),
        status: rem <= 0 ? 'paid_off' : 'active',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls = (field: string) =>
    `w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 ${errors[field] ? 'border-error-400' : 'border-neutral-300'}`;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-1">Alacaklı Adı</label>
        <input
          value={creditorName}
          onChange={(e) => setCreditorName(e.target.value)}
          placeholder="ör. Garanti Bankası, Araba Kredisi, Arkadaş"
          className={inputCls('creditorName')}
          autoFocus
        />
        {errors.creditorName && <p className="text-xs text-error-600 mt-1">{errors.creditorName}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">Toplam Borç (₺)</label>
          <input
            value={amount}
            onChange={(e) => handleAmountChange(e.target.value)}
            placeholder="ör. 50000"
            className={inputCls('amount')}
          />
          {errors.amount && <p className="text-xs text-error-600 mt-1">{errors.amount}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">Kalan Tutar (₺)</label>
          <input
            value={remainingAmount}
            onChange={(e) => setRemainingAmount(e.target.value)}
            placeholder="ör. 35000"
            className={inputCls('remainingAmount')}
          />
          {errors.remainingAmount && <p className="text-xs text-error-600 mt-1">{errors.remainingAmount}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">Aylık Ödeme (₺)</label>
          <input
            value={monthlyPayment}
            onChange={(e) => setMonthlyPayment(e.target.value)}
            placeholder="ör. 2500"
            className="w-full border border-neutral-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
          />
          <p className="text-xs text-neutral-400 mt-1">Risk analizi için gerekli</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">Faiz Oranı (%) — isteğe bağlı</label>
          <input
            value={interestRate}
            onChange={(e) => setInterestRate(e.target.value)}
            placeholder="0"
            type="number"
            min="0"
            step="0.01"
            className="w-full border border-neutral-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-1">Vade Tarihi</label>
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className={inputCls('dueDate')}
        />
        {errors.dueDate && <p className="text-xs text-error-600 mt-1">{errors.dueDate}</p>}
      </div>

      {monthlyPayment && remainingAmount && (
        <div className="bg-primary-50 rounded-lg p-3 text-sm">
          <div className="flex justify-between text-primary-700">
            <span>Tahmini kapanış:</span>
            <span className="font-semibold">
              {(() => {
                const m = parseFloat(monthlyPayment.replace(',', '.'));
                const r = parseFloat(remainingAmount.replace(',', '.'));
                if (m <= 0 || r <= 0) return '—';
                const months = Math.ceil(r / m);
                const d = new Date();
                d.setMonth(d.getMonth() + months);
                return `${d.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })} (${months} ay)`;
              })()}
            </span>
          </div>
        </div>
      )}

      <div className="flex gap-2 pt-2">
        <button
          type="submit"
          disabled={submitting}
          className="flex-1 py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors disabled:opacity-50"
        >
          {submitting ? 'Kaydediliyor...' : 'Borç Ekle'}
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
