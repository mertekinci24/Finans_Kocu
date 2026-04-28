import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import type { Installment, Account, InstallmentType } from '@/types';

interface InstallmentFormProps {
  accounts: Account[];
  onSubmit: (data: Omit<Installment, 'id' | 'createdAt'>) => Promise<void>;
  onCancel: () => void;
}

const INSTALLMENT_TYPES: { value: InstallmentType; label: string }[] = [
  { value: 'kredi_kartı_taksiti', label: '💳 Kredi Kartı Taksiti' },
  { value: 'banka_kredisi', label: '🏦 Banka Kredisi' },
  { value: 'kişisel_borç', label: '👥 Kişisel Borç' },
];

export default function InstallmentForm({ accounts, onSubmit, onCancel }: InstallmentFormProps): JSX.Element {
  const { user } = useAuth();
  const [lenderName, setLenderName] = useState('');
  const [accountId, setAccountId] = useState(accounts[0]?.id || '');
  const [type, setType] = useState<InstallmentType>('kredi_kartı_taksiti');
  const [principal, setPrincipal] = useState('');
  const [monthlyPayment, setMonthlyPayment] = useState('');
  const [totalMonths, setTotalMonths] = useState('');
  const [remainingMonths, setRemainingMonths] = useState('');
  const [interestRate, setInterestRate] = useState('0');
  const [nextPaymentDate, setNextPaymentDate] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  });
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  const selectedAccount = accounts.find(a => a.id === accountId);
  const isCreditCard = selectedAccount?.type === 'kredi_kartı';

  const calculateAutoDate = () => {
    if (!isCreditCard || !selectedAccount?.statementDay || !selectedAccount?.paymentDay) return null;
    
    const today = new Date();
    const day = today.getDate();
    const sDay = selectedAccount.statementDay;
    const pDay = selectedAccount.paymentDay;
    
    let targetMonth = today.getMonth();
    let targetYear = today.getFullYear();
    
    if (day >= sDay) {
      targetMonth += 1;
    }
    
    // Simplistic due date: if pDay < sDay it's usually next month
    let dueMonth = targetMonth;
    if (pDay < sDay) {
      dueMonth += 1;
    }
    
    const result = new Date(targetYear, dueMonth, pDay);
    return result;
  };

  const autoDate = calculateAutoDate();

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
    if (!validate() || !user?.id) return;
    setSubmitting(true);
    try {
      const monthly = parseFloat(monthlyPayment.replace(',', '.'));
      const total = parseInt(totalMonths, 10);
      const remaining = parseInt(remainingMonths, 10);
      const prin = parseFloat(principal.replace(',', '.')) || monthly * total;

      const nextDate = isCreditCard && autoDate ? autoDate : new Date(nextPaymentDate);
      const firstDate = new Date(nextDate);
      firstDate.setMonth(firstDate.getMonth() - (total - remaining));

      setSubmitError(null);
      await onSubmit({
        userId: user.id,
        accountId: accountId || undefined,
        lenderName: lenderName.trim(),
        type,
        principal: prin,
        monthlyPayment: monthly,
        totalMonths: total,
        remainingMonths: remaining,
        interestRate: parseFloat(interestRate) || 0,
        nextPaymentDate: nextDate,
        firstPaymentDate: firstDate,
        status: 'active',
      });
    } catch (err: any) {
      console.error('Submit Error:', err);
      setSubmitError(err.message || 'Taksit eklenirken bir hata oluştu. Lütfen veritabanı şemasını kontrol edin.');
    } finally {
      setSubmitting(false);
    }
  };

  const labelCls = "block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1";
  const inputCls = (field: string) =>
    `w-full bg-white dark:bg-slate-900 border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 transition-colors text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 ${
      errors[field] ? 'border-error-400' : 'border-neutral-300 dark:border-neutral-700'
    }`;

  const selectCls = "w-full bg-white dark:bg-slate-900 border border-neutral-300 dark:border-neutral-700 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 text-neutral-900 dark:text-white";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {submitError && (
        <div className="p-3 bg-error-50 dark:bg-error-900/20 border border-error-200 dark:border-error-800 rounded-lg flex items-start gap-2 animate-in fade-in slide-in-from-top-1">
          <svg className="w-4 h-4 text-error-600 dark:text-error-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-xs text-error-700 dark:text-error-300 font-medium">
            {submitError}
          </div>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Borç Türü</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as InstallmentType)}
            className={selectCls}
          >
            {INSTALLMENT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Ödemenin Yapılacağı Hesap</label>
          <select
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            className={selectCls}
          >
            <option value="">Hesap Seçilmedi</option>
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id}>{acc.name}</option>
            ))}
          </select>
          <p className="mt-1 text-[10px] text-neutral-500 dark:text-neutral-400 italic">
            Seçerseniz, ödeme günü geldiğinde bu hesabın bakiyesinden otomatik düşülür.
          </p>
        </div>
      </div>

      <div>
        <label className={labelCls}>Mağaza / Alacaklı Adı</label>
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
          <label className={labelCls}>Aylık Taksit (₺)</label>
          <input
            value={monthlyPayment}
            onChange={(e) => setMonthlyPayment(e.target.value)}
            placeholder="ör. 850"
            className={inputCls('monthlyPayment')}
          />
          {errors.monthlyPayment && <p className="text-xs text-error-600 mt-1">{errors.monthlyPayment}</p>}
        </div>
        <div>
          <label className={labelCls}>Toplam Taksit Sayısı</label>
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
          <label className={labelCls}>Kalan Taksit Sayısı</label>
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
          <label className={labelCls}>Anapara Tutarı (₺) — isteğe bağlı</label>
          <input
            value={principal}
            onChange={(e) => setPrincipal(e.target.value)}
            placeholder="Boş bırakabilirsin"
            className={inputCls('principal')}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className={isCreditCard ? "opacity-40 pointer-events-none" : ""}>
          <label className={labelCls}>İlk Ödeme Tarihi</label>
          {isCreditCard && autoDate ? (
            <div className="w-full bg-neutral-100 dark:bg-zinc-800 border border-neutral-300 dark:border-neutral-700 rounded-lg px-3 py-2.5 text-sm font-bold text-primary-600">
              {autoDate.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
          ) : (
            <input
              type="date"
              value={nextPaymentDate}
              onChange={(e) => setNextPaymentDate(e.target.value)}
              className={inputCls('nextPaymentDate')}
            />
          )}
          {isCreditCard && (
            <p className="mt-1 text-[9px] text-primary-600 dark:text-primary-400 font-bold uppercase tracking-tight">
              ✨ Kart döngüsüne göre otomatik hesaplandı
            </p>
          )}
        </div>
        <div>
          <label className={labelCls}>Faiz Oranı (%) — isteğe bağlı</label>
          <input
            value={interestRate}
            onChange={(e) => setInterestRate(e.target.value)}
            placeholder="0"
            type="number"
            min="0"
            step="0.01"
            className={inputCls('interestRate')}
          />
        </div>
      </div>

      {monthlyPayment && remainingMonths && (
        <div className="bg-primary-50 dark:bg-primary-900/20 rounded-lg p-3 text-sm">
          <div className="flex justify-between text-primary-700 dark:text-primary-300">
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
          className="px-4 py-2.5 bg-neutral-100 dark:bg-slate-800 text-neutral-700 dark:text-neutral-300 rounded-lg text-sm hover:bg-neutral-200 dark:hover:bg-slate-700 transition-colors"
        >
          İptal
        </button>
      </div>
    </form>
  );
}
