import { useState, useRef } from 'react';
import { CURRENCY_SYMBOL } from '@/constants';
import type { Installment } from '@/types';

interface InstallmentCardProps {
  installment: Installment;
  onUpdate: (id: string, data: Partial<Installment>) => Promise<void>;
  onDelete: (id: string) => void;
}

export default function InstallmentCard({ installment, onUpdate, onDelete }: InstallmentCardProps): JSX.Element {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(installment.lenderName);
  const [editMonthly, setEditMonthly] = useState(String(installment.monthlyPayment));
  const [editRemaining, setEditRemaining] = useState(String(installment.remainingMonths));
  const [saving, setSaving] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [undoTimer, setUndoTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  const fmt = (n: number) =>
    `${CURRENCY_SYMBOL}${n.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  const endDate = (): string => {
    const d = new Date();
    d.setMonth(d.getMonth() + installment.remainingMonths);
    return d.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' });
  };

  const progressPct = installment.totalMonths > 0
    ? Math.round(((installment.totalMonths - installment.remainingMonths) / installment.totalMonths) * 100)
    : 0;

  const startEdit = () => {
    setEditName(installment.lenderName);
    setEditMonthly(String(installment.monthlyPayment));
    setEditRemaining(String(installment.remainingMonths));
    setEditing(true);
    setTimeout(() => nameRef.current?.focus(), 50);
  };

  const cancelEdit = () => setEditing(false);

  const saveEdit = async () => {
    const monthly = parseFloat(editMonthly.replace(',', '.'));
    const remaining = parseInt(editRemaining, 10);
    if (!editName.trim() || isNaN(monthly) || isNaN(remaining)) return;
    setSaving(true);
    try {
      await onUpdate(installment.id, {
        lenderName: editName.trim(),
        monthlyPayment: monthly,
        remainingMonths: remaining,
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
      onDelete(installment.id);
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
      <div className="bg-neutral-50 border-2 border-dashed border-neutral-300 rounded-xl p-4 flex items-center justify-between">
        <span className="text-sm text-neutral-400">Taksit silindi</span>
        <button onClick={handleUndo} className="text-xs font-medium text-primary-600 px-3 py-1.5 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors">
          Geri Al (5sn)
        </button>
      </div>
    );
  }

  if (editing) {
    return (
      <div className="bg-white border-2 border-primary-400 rounded-xl p-4 space-y-3 shadow-sm">
        <input
          ref={nameRef}
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') cancelEdit(); }}
          placeholder="Mağaza / Kart adı"
          className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
        />
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="text-xs text-neutral-500 mb-1 block">Aylık Taksit (₺)</label>
            <input
              value={editMonthly}
              onChange={(e) => setEditMonthly(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') cancelEdit(); }}
              className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
            />
          </div>
          <div className="flex-1">
            <label className="text-xs text-neutral-500 mb-1 block">Kalan Taksit</label>
            <input
              value={editRemaining}
              onChange={(e) => setEditRemaining(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') cancelEdit(); }}
              type="number"
              min="1"
              className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={saveEdit}
            disabled={saving}
            className="flex-1 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 font-medium"
          >
            {saving ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
          <button onClick={cancelEdit} className="px-4 py-2 bg-neutral-100 text-neutral-700 text-sm rounded-lg hover:bg-neutral-200 transition-colors">
            İptal
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="bg-white border border-neutral-200 rounded-xl p-4 hover:shadow-md transition-all group cursor-pointer"
      onClick={startEdit}
      title="Düzenlemek için tıkla"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-neutral-900 text-sm truncate">{installment.lenderName}</div>
          <div className="text-xs text-neutral-500 mt-0.5">
            {installment.remainingMonths} taksit kaldı · Bitiş: {endDate()}
          </div>
        </div>
        <button
          onClick={handleDeleteClick}
          className="opacity-0 group-hover:opacity-100 p-1.5 text-neutral-400 hover:text-error-600 hover:bg-error-50 rounded-lg transition-all flex-shrink-0 ml-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>

      <div className="mt-3 flex items-end justify-between">
        <div>
          <div className="text-xs text-neutral-400">Aylık Taksit</div>
          <div className="text-xl font-bold text-primary-700">{fmt(installment.monthlyPayment)}</div>
        </div>
        <div className="text-right">
          <div className="text-xs text-neutral-400">Toplam Kalan</div>
          <div className="text-sm font-semibold text-neutral-700">
            {fmt(installment.monthlyPayment * installment.remainingMonths)}
          </div>
        </div>
      </div>

      <div className="mt-3">
        <div className="flex justify-between text-xs text-neutral-400 mb-1">
          <span>İlerleme</span>
          <span>{progressPct}%</span>
        </div>
        <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary-500 rounded-full transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-neutral-400 mt-1">
          <span>{installment.totalMonths - installment.remainingMonths}/{installment.totalMonths} taksit ödendi</span>
          {installment.principal > 0 && (
            <span>Anapara: {fmt(installment.principal)}</span>
          )}
        </div>
      </div>
    </div>
  );
}
