import { useState, useRef } from 'react';
import { CURRENCY_SYMBOL, ACCOUNT_COLORS } from '@/constants';
import { ALL_CATEGORIES } from '@/utils/categoryPredictor';
import type { Transaction, Account } from '@/types';

interface TransactionRowProps {
  transaction: Transaction;
  account?: Account;
  onUpdate: (id: string, data: Partial<Transaction>) => Promise<void>;
  onDelete: (id: string) => void;
}

export default function TransactionRow({ transaction, account, onUpdate, onDelete }: TransactionRowProps): JSX.Element {
  const [editing, setEditing] = useState(false);
  const [editDesc, setEditDesc] = useState(transaction.description);
  const [editAmount, setEditAmount] = useState(String(transaction.amount));
  const [editCategory, setEditCategory] = useState(transaction.category);
  const [editType, setEditType] = useState<'gelir' | 'gider'>(transaction.type);
  const [saving, setSaving] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [undoTimer, setUndoTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const descRef = useRef<HTMLInputElement>(null);

  const colors = ACCOUNT_COLORS[account?.type || 'default'] || ACCOUNT_COLORS.default;

  const formatCurrency = (amount: number) =>
    `${CURRENCY_SYMBOL}${amount.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  const formatDate = (date: Date) =>
    new Date(date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });

  const formatTime = (date: Date) =>
    new Date(date).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

  const startEdit = () => {
    setEditDesc(transaction.description);
    setEditAmount(String(transaction.amount));
    setEditCategory(transaction.category);
    setEditType(transaction.type);
    setEditing(true);
    setTimeout(() => descRef.current?.focus(), 50);
  };

  const cancelEdit = () => setEditing(false);

  const saveEdit = async () => {
    const amount = parseFloat(editAmount.replace(',', '.'));
    if (isNaN(amount) || amount <= 0) return;
    setSaving(true);
    try {
      await onUpdate(transaction.id, {
        description: editDesc.trim() || transaction.description,
        amount,
        category: editCategory,
        type: editType,
      });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleted(true);
    const timer = setTimeout(() => {
      onDelete(transaction.id);
    }, 5000);
    setUndoTimer(timer);
  };

  const handleUndo = () => {
    if (undoTimer) clearTimeout(undoTimer);
    setUndoTimer(null);
    setDeleted(false);
  };

  if (deleted) {
    return (
      <div className="flex items-center justify-between px-4 py-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg border border-dashed border-neutral-300 dark:border-neutral-700">
        <span className="text-sm text-neutral-400">Silindi: {transaction.description}</span>
        <button
          onClick={handleUndo}
          className="text-xs font-medium text-primary-600 hover:text-primary-800 transition-colors px-2 py-1 bg-primary-50 dark:bg-primary-900/30 rounded"
        >
          Geri Al (5sn)
        </button>
      </div>
    );
  }

  if (editing) {
    return (
      <div className="bg-white dark:bg-neutral-900 border-2 border-primary-300 dark:border-primary-900 rounded-lg px-4 py-3 space-y-2">
        <div className="flex gap-2">
          <input
            ref={descRef}
            value={editDesc}
            onChange={(e) => setEditDesc(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') cancelEdit(); }}
            className="flex-1 border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
            placeholder="Açıklama"
          />
          <input
            value={editAmount}
            onChange={(e) => setEditAmount(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') cancelEdit(); }}
            className="w-28 border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 text-right"
            placeholder="Tutar"
          />
        </div>
        <div className="flex gap-2 items-center">
          <select
            value={editType}
            onChange={(e) => setEditType(e.target.value as 'gelir' | 'gider')}
            className="border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary-400"
          >
            <option value="gider">Gider</option>
            <option value="gelir">Gelir</option>
          </select>
          <select
            value={editCategory}
            onChange={(e) => setEditCategory(e.target.value)}
            className="flex-1 border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary-400"
          >
            {ALL_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <button
            onClick={saveEdit}
            disabled={saving}
            className="px-3 py-1.5 bg-primary-600 text-white text-xs rounded font-medium hover:bg-primary-700 transition-colors disabled:opacity-50"
          >
            {saving ? '...' : 'Kaydet'}
          </button>
          <button
            onClick={cancelEdit}
            className="px-2 py-1.5 text-neutral-500 dark:text-neutral-400 text-xs hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors"
          >
            İptal
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 rounded-lg transition-colors group cursor-pointer border border-transparent hover:border-neutral-100 dark:hover:border-neutral-800"
      onClick={startEdit}
      title="Düzenlemek için tıkla"
    >
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
          transaction.type === 'gelir' ? 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400' : 'bg-error-100 text-error-700 dark:bg-error-900/30 dark:text-error-400'
        }`}
      >
        {transaction.type === 'gelir' ? '+' : '−'}
      </div>

      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">{transaction.description}</div>
        <div className="flex items-center gap-2 mt-0.5">
          <div className="text-xs text-neutral-500 dark:text-neutral-400">{transaction.category}</div>
          <span className="text-neutral-300 dark:text-neutral-700 text-[10px]">•</span>
          <div className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold border ${colors.badge}`}>
            <span className={`w-1 h-1 rounded-full mr-1.5 ${colors.dot}`} />
            {account?.name || 'Genel / Bilinmeyen'}
          </div>
        </div>
      </div>

      <div className="text-right flex-shrink-0">
        <div className={`font-bold text-sm ${transaction.type === 'gelir' ? 'text-success-600 dark:text-success-400' : 'text-error-600 dark:text-error-400'}`}>
          {transaction.type === 'gelir' ? '+' : '−'}{formatCurrency(transaction.amount)}
        </div>
        <div className="flex flex-col items-end">
          <div className="text-[10px] text-neutral-400 dark:text-neutral-500 uppercase font-medium tracking-tight">
            {formatDate(transaction.date)}
          </div>
          <div className="text-[9px] text-zinc-400 dark:text-zinc-500 font-bold tabular-nums leading-none mt-0.5">
            {formatTime(transaction.createdAt)}
          </div>
        </div>
      </div>

      <button
        onClick={handleDeleteClick}
        className="opacity-0 group-hover:opacity-100 p-1.5 text-neutral-400 hover:text-error-600 hover:bg-error-50 dark:hover:bg-error-900/30 rounded transition-all flex-shrink-0"
        title="Sil"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
