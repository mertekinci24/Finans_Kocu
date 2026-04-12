import { useState } from 'react';
import type { Installment } from '@/types';

interface InstallmentFormProps {
  onSubmit: (data: Omit<Installment, 'id' | 'createdAt'>) => Promise<void>;
  onCancel: () => void;
}

export default function InstallmentForm({ onSubmit, onCancel }: InstallmentFormProps): JSX.Element {
  const [lenderName, setLenderName] = useState('');
  const [principal, setPrincipal] = useState('');
  const [monthlyPayment, setMonthlyPayment] = useState('');
  const [totalMonths, setTotalMonths] = useState('');
  const [remainingMonths, setRemainingMonths] = useState('');
  const [interestRate, setInterestRate] = useState('0');
  const [nextPaymentDate, setNextPaymentDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleTotalMonthsChange = (val: string) => {
    setTotalMonths(val);
    if (!remainingMonths) setRemainingMonths(val);
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!lenderName.trim()) errs.lenderName = 'Mağaza/kart adı zorunlu';
    if (isNaN(parseFloat(monthlyPayment)) || parseFloat(monthlyPayment) <= 0) errs.monthlyPayment = 'Geçerli aylık taksit gir';
    if (isNaN(parseInt(totalMonths)) || parseInt(totalMonths) <= 0) errs.totalMonths = 'Toplam taksit sayısı zorunlu';
    const rem = parseInt(remainingMonths);
    const tot = parseInt(totalMonths);
    if (isNaN(rem) || rem <= 0) errs.remainingMonths = 'Kalan taksit sayısı zorunlu';
    if (!isNaN(rem) && !isNaN(tot) && rem > tot) errs.remainingMonths = 'Kalan, toplam taksiti geçemez';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const monthly = parseFloat(monthlyPayment.replace(',', '.'));
      const total = parseInt(totalMonths, 10);
      const remaining = parseInt(remainingMonths, 10);
      const prin = parseFloat(principal.replace(',', '.')) || monthly * total;

      await onSubmit({
        userId: 'temp-user-id',
        lenderName: lenderName.trim(),
        principal: prin,
        monthlyPayment: monthly,
        totalMonths: total,
        remainingMonths: remaining,
        interestRate: parseFloat(interestRate) || 0,
        nextPaymentDate: new Date(nextPaymentDate),
        status: 'active',
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
        <label className="block text-sm font-medium text-neutral-700 mb-1">Mağaza / Kart Adı</label>
        <input
          value={lenderName}
          onChange={(e) => setLenderName(e.target.value)}
          placeholder="ör. Garanti MediaMarkt, YKB Samsung"
          className={inputCls('lenderName')}
          autoFocus
        />
        {errors.lenderName && <p className="text-xs text-error-600 mt-1">{errors.lenderName}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">Aylık Taksit (₺)</label>
          <input
            value={monthlyPayment}
            onChange={(e) => setMonthlyPayment(e.target.value)}
            placeholder="ör. 850"
            className={inputCls('monthlyPayment')}
          />
          {errors.monthlyPayment && <p className="text-xs text-error-600 mt-1">{errors.monthlyPayment}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">Toplam Taksit Sayısı</label>
          <input
            value={totalMonths}
            onChange={(e) => handleTotalMonthsChange(e.target.value)}
            placeholder="ör. 12"
            type="number"
            min="1"
            className={inputCls('totalMonths')}
          />
          {errors.totalMonths && <p className="text-xs text-error-600 mt-1">{errors.totalMonths}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">Kalan Taksit Sayısı</label>
          <input
            value={remainingMonths}
            onChange={(e) => setRemainingMonths(e.target.value)}
            placeholder="ör. 9"
            type="number"
            min="1"
            className={inputCls('remainingMonths')}
          />
          {errors.remainingMonths && <p className="text-xs text-error-600 mt-1">{errors.remainingMonths}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">Anapara Tutarı (₺) — isteğe bağlı</label>
          <input
            value={principal}
            onChange={(e) => setPrincipal(e.target.value)}
            placeholder="Boş bırakabilirsin"
            className="w-full border border-neutral-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">Sonraki Ödeme Tarihi</label>
          <input
            type="date"
            value={nextPaymentDate}
            onChange={(e) => setNextPaymentDate(e.target.value)}
            className="w-full border border-neutral-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
          />
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

      {monthlyPayment && remainingMonths && (
        <div className="bg-primary-50 rounded-lg p-3 text-sm">
          <div className="flex justify-between text-primary-700">
            <span>Toplam kalan ödeme:</span>
            <span className="font-semibold">
              ₺{(parseFloat(monthlyPayment.replace(',', '.') || '0') * parseInt(remainingMonths || '0', 10)).toLocaleString('tr-TR')}
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
          {submitting ? 'Kaydediliyor...' : 'Taksit Ekle'}
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
