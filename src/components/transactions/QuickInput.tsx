import { useState, useRef } from 'react';
import { parseQuickInput, ALL_CATEGORIES, predictFromHistory } from '@/utils/categoryPredictor';
import { CURRENCY_SYMBOL } from '@/constants';
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
  const inputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setRaw(val);
    setSuccessMsg('');

    const result = parseQuickInput(val);
    setParsed(result);

    if (result) {
      const fromHistory = predictFromHistory(result.description, recentTransactions);
      setSelectedCategory(fromHistory || result.suggestedCategory);
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
    if (!parsed || !selectedAccountId) return;
    setSaving(true);
    try {
      await onSave({
        accountId: selectedAccountId,
        amount: parsed.amount,
        description: parsed.description || raw,
        category: selectedCategory || 'Diğer',
        date: new Date(),
        type: parsed.type,
      });
      setRaw('');
      setParsed(null);
      setSelectedCategory('');
      setSuccessMsg('Kaydedildi!');
      inputRef.current?.focus();
      setTimeout(() => setSuccessMsg(''), 2000);
    } finally {
      setSaving(false);
    }
  };

  const hasContent = parsed !== null;

  return (
    <div className="bg-white border border-neutral-200 rounded-xl shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 p-4 border-b border-neutral-100">
        <div className="text-sm font-semibold text-neutral-700">Hızlı Giriş</div>
        <div className="text-xs text-neutral-400">ör: 3500 market, 12500 maaş</div>
        {successMsg && (
          <span className="ml-auto text-xs text-success-600 font-medium">{successMsg}</span>
        )}
      </div>

      <div className="p-4 space-y-3">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              value={raw}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="3500 market..."
              autoFocus
              className="w-full border border-neutral-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 pr-24"
            />
            {parsed && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    parsed.type === 'gelir' ? 'bg-success-100 text-success-700' : 'bg-error-100 text-error-700'
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
            className="px-4 py-3 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {saving ? '...' : 'Kaydet ↵'}
          </button>
        </div>

        {hasContent && (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {accounts.length > 1 && (
              <select
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                className="border border-neutral-300 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary-400 text-neutral-700"
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            )}

            <div className="flex flex-wrap gap-1.5">
              {ALL_CATEGORIES.slice(0, 8).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                    selectedCategory === cat
                      ? 'bg-primary-600 text-white shadow-sm'
                      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
              <select
                value={ALL_CATEGORIES.includes(selectedCategory) ? selectedCategory : ''}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="border border-neutral-200 rounded-full px-2.5 py-1 text-xs focus:outline-none text-neutral-500"
              >
                <option value="">Diğer...</option>
                {ALL_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
