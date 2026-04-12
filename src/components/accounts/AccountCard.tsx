import { useState, useRef } from 'react';
import { CURRENCY_SYMBOL } from '@/constants';
import { getAccountTypeLabel } from '@/utils/bankLogos';
import BankLogo from './BankLogo';
import type { Account } from '@/types';

interface AccountCardProps {
  account: Account;
  onUpdate: (id: string, data: Partial<Account>) => Promise<void>;
  onDelete: (id: string) => void;
}

interface UndoState {
  visible: boolean;
  timer: ReturnType<typeof setTimeout> | null;
}

export default function AccountCard({ account, onUpdate, onDelete }: AccountCardProps): JSX.Element {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(account.name);
  const [editBalance, setEditBalance] = useState(String(account.balance));
  const [editBankName, setEditBankName] = useState(account.bankName || '');
  const [saving, setSaving] = useState(false);
  const [undo, setUndo] = useState<UndoState>({ visible: false, timer: null });
  const nameRef = useRef<HTMLInputElement>(null);

  const formatCurrency = (amount: number) =>
    `${CURRENCY_SYMBOL}${amount.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  const startEdit = () => {
    setEditName(account.name);
    setEditBalance(String(account.balance));
    setEditBankName(account.bankName || '');
    setEditing(true);
    setTimeout(() => nameRef.current?.focus(), 50);
  };

  const cancelEdit = () => {
    setEditing(false);
  };

  const saveEdit = async () => {
    const newBalance = parseFloat(editBalance.replace(',', '.'));
    if (!editName.trim() || isNaN(newBalance)) return;
    setSaving(true);
    try {
      await onUpdate(account.id, {
        name: editName.trim(),
        balance: newBalance,
        bankName: editBankName.trim() || undefined,
      });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = () => {
    const timer = setTimeout(() => {
      onDelete(account.id);
      setUndo({ visible: false, timer: null });
    }, 5000);
    setUndo({ visible: true, timer });
  };

  const handleUndo = () => {
    if (undo.timer) clearTimeout(undo.timer);
    setUndo({ visible: false, timer: null });
  };

  const accountTypeColor =
    account.type === 'nakit'
      ? 'bg-success-50 border-success-200'
      : account.type === 'kredi_kartı'
        ? 'bg-error-50 border-error-200'
        : 'bg-primary-50 border-primary-200';

  if (undo.visible) {
    return (
      <div className="bg-neutral-100 rounded-xl border-2 border-dashed border-neutral-300 p-4 flex items-center justify-between">
        <span className="text-neutral-500 text-sm">Hesap silindi</span>
        <button
          onClick={handleUndo}
          className="px-3 py-1.5 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 transition-colors font-medium"
        >
          Geri Al (5sn)
        </button>
      </div>
    );
  }

  if (editing) {
    return (
      <div className="bg-white rounded-xl border-2 border-primary-400 p-4 shadow-sm space-y-3">
        <div className="flex items-center gap-3 mb-1">
          <BankLogo account={{ ...account, bankName: editBankName || account.bankName }} size="md" />
          <span className="text-xs text-neutral-500 font-medium">{getAccountTypeLabel(account.type)}</span>
        </div>
        <input
          ref={nameRef}
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') cancelEdit(); }}
          placeholder="Hesap adı"
          className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
        />
        {account.type !== 'nakit' && (
          <input
            value={editBankName}
            onChange={(e) => setEditBankName(e.target.value)}
            placeholder="Banka adı (ör. Garanti, Akbank)"
            className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
          />
        )}
        <input
          value={editBalance}
          onChange={(e) => setEditBalance(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') cancelEdit(); }}
          placeholder="Bakiye"
          type="text"
          className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
        />
        <div className="flex gap-2">
          <button
            onClick={saveEdit}
            disabled={saving}
            className="flex-1 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 font-medium"
          >
            {saving ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
          <button
            onClick={cancelEdit}
            className="px-4 py-2 bg-neutral-100 text-neutral-700 text-sm rounded-lg hover:bg-neutral-200 transition-colors"
          >
            İptal
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`${accountTypeColor} rounded-xl border p-4 hover:shadow-md transition-all group cursor-pointer`}
      onClick={startEdit}
      title="Düzenlemek için tıkla"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <BankLogo account={account} size="md" />
          <div>
            <div className="font-semibold text-neutral-900 text-sm">{account.name}</div>
            <div className="text-xs text-neutral-500 mt-0.5">
              {account.bankName || getAccountTypeLabel(account.type)}
            </div>
          </div>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); handleDeleteClick(); }}
          className="opacity-0 group-hover:opacity-100 p-1.5 text-neutral-400 hover:text-error-600 hover:bg-error-50 rounded-lg transition-all"
          title="Hesabı sil"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>

      <div className="mt-4">
        <div className="text-2xl font-bold text-neutral-900">
          {formatCurrency(account.balance)}
        </div>
        {account.type === 'kredi_kartı' && account.cardLimit && (
          <div className="mt-1">
            <div className="flex justify-between text-xs text-neutral-500 mb-1">
              <span>Kullanılan</span>
              <span>{((account.balance / account.cardLimit) * 100).toFixed(0)}%</span>
            </div>
            <div className="h-1.5 bg-neutral-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-error-500 rounded-full transition-all"
                style={{ width: `${Math.min(100, (account.balance / account.cardLimit) * 100)}%` }}
              />
            </div>
            <div className="text-xs text-neutral-400 mt-1">
              Limit: {formatCurrency(account.cardLimit)}
            </div>
          </div>
        )}
      </div>

      <div className="mt-3 text-xs text-neutral-400 opacity-0 group-hover:opacity-100 transition-opacity">
        Düzenlemek için tıkla
      </div>
    </div>
  );
}
