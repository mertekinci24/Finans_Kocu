import { useState, useRef, useEffect } from 'react';
import { parseQuickInput, ALL_CATEGORIES, predictFromHistory } from '@/utils/categoryPredictor';
import { CURRENCY_SYMBOL, ACCOUNT_COLORS } from '@/constants';
import { getAccountTypeLabel } from '@/utils/bankLogos';
import { useTimeStore } from '@/stores/timeStore';
import { formatDateInputLocal, parseDateInputLocal } from '@/utils/dateUtils';
import type { Transaction, Account } from '@/types';

interface QuickInputProps {
  accounts: Account[];
  recentTransactions: Transaction[];
  onSave: (data: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
}

export default function QuickInput({ accounts, recentTransactions, onSave }: QuickInputProps): JSX.Element {
  const [raw, setRaw] = useState('');
  const [parsed, setParsed] = useState<ReturnType<typeof parseQuickInput>>(null);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState(accounts[0]?.id || '');
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const { systemDate } = useTimeStore();
  const [selectedDate, setSelectedDate] = useState(formatDateInputLocal(new Date(systemDate)));

  useEffect(() => {
    setSelectedDate(formatDateInputLocal(new Date(systemDate)));
  }, [systemDate]);

  const selectedAccount = accounts.find(a => a.id === selectedAccountId);
  const accountColors = ACCOUNT_COLORS[selectedAccount?.type || 'default'] || ACCOUNT_COLORS.default;

  useEffect(() => {
    if (!selectedAccountId && accounts.length > 0) {
      setSelectedAccountId(accounts[0].id);
    }
  }, [accounts, selectedAccountId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setRaw(val);
    setSuccessMsg('');
    setErrorMsg('');

    const result = parseQuickInput(val, accounts);
    setParsed(result);

    if (result) {
      const fromHistory = predictFromHistory(result.description, recentTransactions);
      setSelectedCategory(fromHistory || result.suggestedCategory);
      if (result.suggestedAccountId) {
        setSelectedAccountId(result.suggestedAccountId);
      }
    } else {
      setSelectedCategory('');
    }
  };

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && parsed) {
      await handleSave();
    }
  };

  const handleSave = async () => {
    if (!parsed) return;
    if (!selectedAccountId) {
      setErrorMsg('Lütfen önce bir hesap ekleyin.');
      return;
    }
    
    setSaving(true);
    try {
      await onSave({
        accountId: selectedAccountId,
        amount: parsed.amount,
        description: parsed.description || raw,
        category: selectedCategory || (parsed.type === 'gelir' ? 'Gelir' : 'Diğer'),
        date: parseDateInputLocal(selectedDate),
        type: parsed.type,
        recurring: 'none',
      });
      setRaw('');
      setParsed(null);
      setSelectedCategory('');
      setSuccessMsg('İşlem Kaydedildi');
      setErrorMsg('');
      inputRef.current?.focus();
      setTimeout(() => setSuccessMsg(''), 2000);
    } catch (error: any) {
      console.error('[QuickInput] Save Failed:', error);
      setErrorMsg(error.message || 'Kayıt başarısız. Lütfen tekrar deneyin.');
    } finally {
      setSaving(false);
    }
  };

  const hasContent = parsed !== null;

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden relative transition-all">
      {errorMsg && (
        <div className="absolute inset-0 bg-black/50 z-10 flex items-center justify-center backdrop-blur-sm">
          <div className="bg-card border border-border rounded-lg p-4 shadow-xl text-center max-w-xs animate-in zoom-in-95 duration-200">
            <div className="text-error-600 mb-2">
              <svg className="w-8 h-8 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h4 className="font-semibold text-foreground mb-1">Hesap Bulunamadı</h4>
            <p className="text-sm text-muted-foreground mb-3">{errorMsg}</p>
            <button onClick={() => setErrorMsg('')} className="bg-foreground text-background text-sm px-4 py-1.5 rounded-md hover:opacity-90 w-full transition-colors font-bold">Tamam</button>
          </div>
        </div>
      )}
      
      <div className="flex items-center gap-3 p-4 border-b border-border bg-muted/50">
        <div className="text-sm font-black text-foreground uppercase tracking-tighter">Anlık/Günlük Harcama Kaydı</div>
        <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-black">Sadece Tek Seferlik</div>
        <div className="ml-auto">
          {successMsg && (
            <span className="text-xs text-success-600 dark:text-success-400 font-bold animate-pulse">{successMsg}</span>
          )}
        </div>
      </div>

      <div className="p-4 space-y-3">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              value={raw}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Bugün yaptığınız tek seferlik harcamaları yazın (Örn: 250 Market, 1000 Benzin)..."
              autoFocus
              className="w-full border border-border bg-background text-foreground placeholder:text-muted-foreground rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all pr-24"
            />
            <div className="absolute -top-2 left-3 px-1 bg-card text-[9px] font-black text-muted-foreground uppercase tracking-tighter">
              Tek Seferlik İşlem
            </div>
            {parsed && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <span
                  className={`text-xs font-black px-2 py-1 rounded-md shadow-sm border ${
                    parsed.type === 'gelir' ? 'bg-success-100 text-success-700 border-success-200 dark:bg-success-900/30 dark:text-success-400 dark:border-success-800' : 'bg-error-100 text-error-700 border-error-200 dark:bg-error-900/30 dark:text-error-400 dark:border-error-800'
                  }`}
                >
                  {parsed.type === 'gelir' ? '+' : '-'}{CURRENCY_SYMBOL}{parsed.amount.toLocaleString('tr-TR')}
                </span>
              </div>
            )}
          </div>
          <button
            onClick={handleSave}
            disabled={!hasContent || saving}
            className="px-6 py-3 bg-primary-600 text-white rounded-lg text-sm font-bold hover:bg-primary-700 transition-all shadow-md active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {saving ? '...' : 'Kaydet ↵'}
          </button>
        </div>

        {hasContent && (
          <div className="flex flex-wrap items-center gap-3 pt-1 animate-in slide-in-from-top-2 duration-300">
            {accounts.length > 0 && (
              <div className="flex items-center gap-2">
                <select
                  value={selectedAccountId}
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                  className={`border border-border rounded-lg px-2.5 py-1.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary bg-background text-foreground transition-all`}
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
                <div className={`px-2 py-1 rounded text-[10px] font-black border ${accountColors.badge}`}>
                  {getAccountTypeLabel(selectedAccount?.type || 'nakit')}
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-1.5">
              {ALL_CATEGORIES.slice(0, 8).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all border ${
                    selectedCategory === cat
                      ? 'bg-primary text-primary-foreground border-primary shadow-md scale-105'
                      : 'bg-muted text-muted-foreground border-border hover:bg-muted/80'
                  }`}
                >
                  {cat}
                </button>
              ))}
              <select
                value={ALL_CATEGORIES.includes(selectedCategory) ? selectedCategory : ''}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="border border-border rounded-full px-2.5 py-1 text-[10px] font-bold focus:outline-none bg-muted text-muted-foreground cursor-pointer"
              >
                <option value="">Diğer...</option>
                {ALL_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 border-l border-border pl-3 ml-1">
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-tighter">Tarih</span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent border-none p-0 text-xs font-bold text-neutral-700 dark:text-neutral-300 focus:ring-0 cursor-pointer"
              />
            </div>
          </div>
        )}
        <div className="pt-2 mt-2 border-t border-border/50">
          <p className="text-[10px] text-muted-foreground font-medium italic">
            * Düzenli ödemeler (Maaş, Kira, Fatura) için yukarıdaki <span className="text-blue-500 font-black">"PLANLAMA"</span> sekmesini kullanın.
          </p>
        </div>
      </div>
    </div>
  );
}
