import { useState, useRef } from 'react';
import { CURRENCY_SYMBOL } from '@/constants';
import type { Debt } from '@/types';

interface DebtCardProps {
  debt: Debt;
  monthlyIncome: number;
  onUpdate: (id: string, data: Partial<Debt>) => Promise<void>;
  onDelete: (id: string) => void;
}

const STATUS_LABELS: Record<Debt['status'], string> = {
  active: 'Aktif',
  paid_off: 'Kapandı',
  overdue: 'Gecikmiş',
};

const STATUS_COLORS: Record<Debt['status'], string> = {
  active: 'bg-primary-100 text-primary-700',
  paid_off: 'bg-success-100 text-success-700',
  overdue: 'bg-error-100 text-error-700',
};

export default function DebtCard({ debt, monthlyIncome, onUpdate, onDelete }: DebtCardProps): JSX.Element {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(debt.creditorName);
  const [editRemaining, setEditRemaining] = useState(String(debt.remainingAmount));
  const [editMonthly, setEditMonthly] = useState(String(debt.monthlyPayment));
  const [editStatus, setEditStatus] = useState<Debt['status']>(debt.status);
  const [saving, setSaving] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [undoTimer, setUndoTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  const fmt = (n: number) =>
    `${CURRENCY_SYMBOL}${n.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  const payoffMonths = debt.monthlyPayment > 0
    ? Math.ceil(debt.remainingAmount / debt.monthlyPayment)
    : null;

  const payoffDate = payoffMonths !== null
    ? (() => {
        const d = new Date();
        d.setMonth(d.getMonth() + payoffMonths);
        return d.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' });
      })()
    : null;

  const progressPct = debt.amount > 0
    ? Math.round(((debt.amount - debt.remainingAmount) / debt.amount) * 100)
    : 0;

  const debtToIncomeRatio = monthlyIncome > 0
    ? (debt.monthlyPayment / monthlyIncome) * 100
    : 0;

  const isRisk = debtToIncomeRatio > 35;

  const startEdit = () => {
    setEditName(debt.creditorName);
    setEditRemaining(String(debt.remainingAmount));
    setEditMonthly(String(debt.monthlyPayment));
    setEditStatus(debt.status);
    setEditing(true);
    setTimeout(() => nameRef.current?.focus(), 50);
  };

  const cancelEdit = () => setEditing(false);

  const saveEdit = async () => {
    const remaining = parseFloat(editRemaining.replace(',', '.'));
    const monthly = parseFloat(editMonthly.replace(',', '.'));
    if (!editName.trim() || isNaN(remaining)) return;
    setSaving(true);
    try {
      await onUpdate(debt.id, {
        creditorName: editName.trim(),
        remainingAmount: remaining,
        monthlyPayment: isNaN(monthly) ? 0 : monthly,
        status: editStatus,
      });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleted(true);
    const timer = setTimeout(() => { onDelete(debt.id); }, 5000);
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
        <span className="text-sm text-neutral-400">Borç silindi</span>
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
          placeholder="Alacaklı adı"
          className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
        />
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="text-xs text-neutral-500 mb-1 block">Kalan Tutar (₺)</label>
            <input
              value={editRemaining}
              onChange={(e) => setEditRemaining(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') cancelEdit(); }}
              className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
            />
          </div>
          <div className="flex-1">
            <label className="text-xs text-neutral-500 mb-1 block">Aylık Ödeme (₺)</label>
            <input
              value={editMonthly}
              onChange={(e) => setEditMonthly(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') cancelEdit(); }}
              className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
            />
          </div>
        </div>
        <select
          value={editStatus}
          onChange={(e) => setEditStatus(e.target.value as Debt['status'])}
          className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
        >
          <option value="active">Aktif</option>
          <option value="paid_off">Kapandı</option>
          <option value="overdue">Gecikmiş</option>
        </select>
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
      className={`rounded-xl border p-4 hover:shadow-md transition-all group cursor-pointer ${
        debt.status === 'overdue'
          ? 'bg-error-50 border-error-200'
          : debt.status === 'paid_off'
            ? 'bg-neutral-50 border-neutral-200 opacity-60'
            : isRisk
              ? 'bg-warning-50 border-warning-300'
              : 'bg-white border-neutral-200'
      }`}
      onClick={startEdit}
      title="Düzenlemek için tıkla"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-neutral-900 text-sm truncate">{debt.creditorName}</div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[debt.status]}`}>
              {STATUS_LABELS[debt.status]}
            </span>
            {isRisk && monthlyIncome > 0 && (
              <span className="text-xs bg-warning-100 text-warning-700 px-2 py-0.5 rounded-full font-medium">
                Yüksek Risk
              </span>
            )}
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
          <div className="text-xs text-neutral-400">Kalan Borç</div>
          <div className="text-2xl font-bold text-neutral-900">{fmt(debt.remainingAmount)}</div>
        </div>
        {debt.monthlyPayment > 0 && (
          <div className="text-right">
            <div className="text-xs text-neutral-400">Aylık Ödeme</div>
            <div className="text-sm font-semibold text-neutral-700">{fmt(debt.monthlyPayment)}</div>
          </div>
        )}
      </div>

      {debt.amount > 0 && (
        <div className="mt-3">
          <div className="flex justify-between text-xs text-neutral-400 mb-1">
            <span>Ödeme ilerleme</span>
            <span>%{progressPct}</span>
          </div>
          <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${debt.status === 'paid_off' ? 'bg-success-500' : 'bg-primary-500'}`}
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      )}

      {payoffDate && debt.status === 'active' && (
        <div className="mt-2 text-xs text-neutral-500">
          Tahmini kapanış: <span className="font-medium text-neutral-700">{payoffDate}</span>
          {payoffMonths && <span className="text-neutral-400"> ({payoffMonths} ay)</span>}
        </div>
      )}

      {isRisk && monthlyIncome > 0 && (
        <div className="mt-2 text-xs text-warning-700">
          Bu borç aylık gelirinizin %{debtToIncomeRatio.toFixed(0)}'ini alıyor — risk eşiği %35
        </div>
      )}
    </div>
  );
}
