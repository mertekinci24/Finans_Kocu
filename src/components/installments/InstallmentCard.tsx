import { useState, useRef } from 'react';
import {
  CURRENCY_SYMBOL, 
  ACCOUNT_COLORS, 
  INSTALLMENT_TYPE_ICONS as TYPE_ICONS, 
  INSTALLMENT_TYPE_LABELS as TYPE_LABELS, 
  INSTALLMENT_TYPE_BADGE_STYLE as TYPE_BADGE_STYLE 
} from '@/constants';
import type { Installment, Account, InstallmentType } from '@/types';

interface InstallmentCardProps {
  installment: Installment;
  accounts: Account[];
  onUpdate: (id: string, data: Partial<Installment>) => Promise<void>;
  onDelete: (id: string) => void;
}

const BANK_COLORS: Record<string, string> = {
  'akbank': 'shadow-red-500/20',
  'garanti': 'shadow-emerald-500/20',
  'yapı kredi': 'shadow-blue-600/20',
  'iş bankası': 'shadow-indigo-600/20',
  'ziraat': 'shadow-red-600/20',
  'finansbank': 'shadow-blue-400/20',
  'enpara': 'shadow-purple-500/20',
  'halkbank': 'shadow-blue-700/20',
  'vakıfbank': 'shadow-yellow-500/20',
  'qnb': 'shadow-blue-900/20',
  'teb': 'shadow-green-600/20',
  'papara': 'shadow-zinc-400/20',
  'tost': 'shadow-orange-400/20',
  'deniz': 'shadow-blue-500/20',
  'kuveyt': 'shadow-emerald-700/20',
};

export default function InstallmentCard({ installment, accounts, onUpdate, onDelete }: InstallmentCardProps): JSX.Element {
  const [editing, setEditing] = useState(false);
  
  // --- IMPLICIT DELINQUENCY CHECK (Logic Sync v6.1) ---
  const getDelinquencyStatus = () => {
    if (!installment.firstPaymentDate) return { isCritical: false, delinquentMonths: [] };
    
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const startDate = new Date(installment.firstPaymentDate);
    const startYear = startDate.getFullYear();
    const startMonth = startDate.getMonth();
    
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const monthsDistance = (currentYear - startYear) * 12 + (currentMonth - startMonth);
    
    const delinquentMonths: string[] = [];
    let isCritical = false;
    
    for (let m = 0; m <= monthsDistance; m++) {
      const targetTotal = (startYear * 12 + startMonth) + m;
      const targetYear = Math.floor(targetTotal / 12);
      const targetMonthIdx = targetTotal % 12;
      const monthKey = `${targetYear}-${String(targetMonthIdx + 1).padStart(2, '0')}`;
      
      const history = installment.paymentHistory?.[monthKey];
      const isNotPaid = !history || !history.status || history.status !== 'paid';
      
      const specificDueDate = new Date(Date.UTC(targetYear, targetMonthIdx, 15));
      if (isNotPaid && specificDueDate < thirtyDaysAgo) {
        isCritical = true;
        delinquentMonths.push(monthKey);
      }
    }
    return { isCritical, delinquentMonths };
  };

  const delInfo = getDelinquencyStatus();

  const [editName, setEditName] = useState(installment.lenderName);
  const [editMonthly, setEditMonthly] = useState(String(installment.monthlyPayment));
  const [editRemaining, setEditRemaining] = useState(String(installment.remainingMonths));
  const [editDate, setEditDate] = useState(new Date(installment.nextPaymentDate).toISOString().split('T')[0]);
  const [editType, setEditType] = useState<InstallmentType>(installment.type || 'kredi_kartı_taksiti');
  const [editAccountId, setEditAccountId] = useState(installment.accountId || '');
  const [editTotalMonths, setEditTotalMonths] = useState(String(installment.totalMonths));
  const [editPrincipal, setEditPrincipal] = useState(String(installment.principal || 0));
  const [editInterestRate, setEditInterestRate] = useState(String(installment.interestRate || 0));
  const [saving, setSaving] = useState(false);
  const [showPlan, setShowPlan] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [undoTimer, setUndoTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  const account = accounts.find(a => a.id === installment.accountId);
  const colors = ACCOUNT_COLORS[account?.type || 'default'] || ACCOUNT_COLORS.default;

  const getBankShadow = (bankName?: string) => {
    if (!bankName) return 'shadow-xl';
    const name = bankName.toLowerCase();
    for (const [key, shadow] of Object.entries(BANK_COLORS)) {
      if (name.includes(key)) return `shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)] ${shadow}`;
    }
    return 'shadow-xl';
  };

  const shadowClass = getBankShadow(account?.bankName);

  const fmt = (n: number) =>
    `${CURRENCY_SYMBOL}${n.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  const formatDate = (date: Date) =>
    new Date(date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });

  const paidCount = Math.max(0, installment.totalMonths - (installment.remainingMonths || 0));
  const progressPct = installment.totalMonths > 0
    ? Math.max(0, Math.min(100, Math.round((paidCount / installment.totalMonths) * 100)))
    : 0;

  const startEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditName(installment.lenderName);
     setEditMonthly(String(installment.monthlyPayment));
    setEditRemaining(String(installment.remainingMonths));
    setEditDate(new Date(installment.nextPaymentDate).toISOString().split('T')[0]);
    setEditType(installment.type || 'kredi_kartı_taksiti');
    setEditAccountId(installment.accountId || '');
    setEditTotalMonths(String(installment.totalMonths));
    setEditPrincipal(String(installment.principal || 0));
    setEditInterestRate(String(installment.interestRate || 0));
    setEditing(true);
    setTimeout(() => nameRef.current?.focus(), 50);
  };

  const cancelEdit = () => setEditing(false);

  const saveEdit = async () => {
    const monthly = parseFloat(editMonthly.replace(',', '.'));
     const remaining = parseInt(editRemaining, 10);
    const total = parseInt(editTotalMonths, 10);
    const principal = parseFloat(editPrincipal.replace(',', '.'));
    const interest = parseFloat(editInterestRate.replace(',', '.'));

    if (!editName.trim() || isNaN(monthly) || isNaN(remaining)) return;
    setSaving(true);
    try {
      const finalTotal = isNaN(total) ? installment.totalMonths : total;
      const finalNextDate = new Date(editDate);
      const firstDate = new Date(finalNextDate);
      firstDate.setMonth(firstDate.getMonth() - (finalTotal - remaining));

      await onUpdate(installment.id, {
        lenderName: editName.trim(),
        monthlyPayment: monthly,
        remainingMonths: remaining,
        totalMonths: finalTotal,
        principal: isNaN(principal) ? installment.principal : principal,
        interestRate: isNaN(interest) ? installment.interestRate : interest,
        type: editType,
        accountId: editAccountId || undefined,
        nextPaymentDate: finalNextDate,
        firstPaymentDate: firstDate,
      });
      setEditing(false);
    } catch (err: any) {
      console.error('Update Error:', err);
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
      <div className="bg-neutral-50 dark:bg-neutral-900 border-2 border-dashed border-neutral-300 dark:border-neutral-800 rounded-xl p-4 flex items-center justify-between">
        <span className="text-sm text-neutral-400">Taksit silindi</span>
        <button onClick={handleUndo} className="text-xs font-medium text-primary-600 px-3 py-1.5 bg-primary-50 dark:bg-primary-900/30 rounded-lg hover:bg-primary-100 transition-colors">
          Geri Al (5sn)
        </button>
      </div>
    );
  }

  if (editing) {
    return (
      <div className="bg-white dark:bg-slate-900 border-2 border-primary-400 dark:border-primary-500 rounded-xl p-4 space-y-3 shadow-lg">
        <div>
          <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 block">Açıklama</label>
          <input
            ref={nameRef}
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') cancelEdit(); }}
            placeholder="Mağaza / Kart adı"
            className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 text-neutral-900 dark:text-white"
          />
        </div>
         <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 block">Borç Türü</label>
            <select
              value={editType}
              onChange={(e) => setEditType(e.target.value as InstallmentType)}
              className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 text-neutral-900 dark:text-white appearance-none"
            >
              {Object.entries(TYPE_LABELS).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 block">Ödeme Hesabı</label>
            <select
              value={editAccountId}
              onChange={(e) => setEditAccountId(e.target.value)}
              className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 text-neutral-900 dark:text-white appearance-none"
            >
              <option value="">Hesap Seçin</option>
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id}>{acc.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 block">Kalan Taksit</label>
            <input
              value={editRemaining}
              onChange={(e) => setEditRemaining(e.target.value)}
              type="number"
              min="1"
              className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 text-neutral-900 dark:text-white"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 block">Toplam Taksit</label>
            <input
              value={editTotalMonths}
              onChange={(e) => setEditTotalMonths(e.target.value)}
              type="number"
              min="1"
              className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 text-neutral-900 dark:text-white"
            />
          </div>
        </div>

        <div>
          <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 block">Aylık Ödeme (₺)</label>
          <input
            value={editMonthly}
            onChange={(e) => setEditMonthly(e.target.value)}
            className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary-400 text-primary-600 dark:text-primary-400"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 block">Anapara (₺)</label>
            <input
              value={editPrincipal}
              onChange={(e) => setEditPrincipal(e.target.value)}
              className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg px-3 py-2 text-[11px] focus:outline-none focus:ring-2 focus:ring-primary-400 text-neutral-700 dark:text-zinc-300"
            />
          </div>
          <div>
            <label className="text-[10px) font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 block">Faiz Oranı (%)</label>
            <input
              value={editInterestRate}
              onChange={(e) => setEditInterestRate(e.target.value)}
              className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg px-3 py-2 text-[11px] focus:outline-none focus:ring-2 focus:ring-primary-400 text-neutral-700 dark:text-zinc-300"
            />
          </div>
        </div>

        <div>
          <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 block">İlk Ödeme Tarihi</label>
          <input
            type="date"
            value={editDate}
            onChange={(e) => setEditDate(e.target.value)}
            className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 text-neutral-900 dark:text-white"
          />
        </div>
        <div className="flex gap-2 pt-1">
          <button
            onClick={saveEdit}
            disabled={saving}
            className="flex-1 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 font-semibold"
          >
            {saving ? 'Kaydediliyor...' : 'Güncelle'}
          </button>
          <button onClick={cancelEdit} className="px-4 py-2 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-sm rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors">
            İptal
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-[#000000] border border-zinc-800 rounded-3xl p-6 transition-all duration-500 group relative overflow-hidden ${shadowClass} hover:border-zinc-700`}>
      <div className={`absolute top-0 right-0 w-32 h-32 -mr-16 -mt-16 rounded-full opacity-[0.03] dark:opacity-[0.05] ${colors.bg}`} />

      <div className="flex items-start justify-between relative z-10">
        <div className="flex-1 min-w-0">
          <div className="flex flex-col gap-2 mb-3">
            <div className={`inline-flex items-center self-start px-2 py-0.5 rounded-md text-[9px] font-black border uppercase tracking-[0.15em] ${TYPE_BADGE_STYLE[installment.type || 'kredi_kartı_taksiti']}`}>
              {TYPE_LABELS[installment.type || 'kredi_kartı_taksiti']}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg opacity-80" title={TYPE_LABELS[installment.type || 'kredi_kartı_taksiti']}>
                {TYPE_ICONS[installment.type || 'kredi_kartı_taksiti'] || '💳'}
              </span>
              <div className="font-black text-neutral-900 dark:text-white text-lg truncate tracking-tight uppercase">{installment.lenderName}</div>
            </div>
          </div>
            <div className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border shadow-sm ${colors.badge}`}>
              <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${colors.dot}`} />
              {account?.name || 'Genel / Bilinmeyen'}
            </div>
            {account?.type === 'kredi_kartı' && (
              <div className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-zinc-900 border border-zinc-700 text-zinc-400 uppercase tracking-tighter">
                 Hesap Kesim: {account.statementDay}
              </div>
            )}
            <span className="text-[10px] text-slate-500 dark:text-zinc-400 font-bold uppercase tracking-wider">
              {installment.remainingMonths} / {installment.totalMonths} Taksit
            </span>
          </div>

        <div className="flex items-center gap-1">
          {delInfo.isCritical && (
            <div className="mr-2 px-2 py-1 bg-red-600 text-white text-[9px] font-black rounded-full shadow-lg animate-pulse whitespace-nowrap">
              ⚠️ KRİTİK GECİKME
            </div>
          )}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
            <button
              onClick={startEdit}
              className="p-2 text-neutral-400 dark:text-zinc-500 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/30 rounded-xl transition-all"
              title="Düzenle"
            >
              <svg className="w-4 h-4 text-slate-400 dark:text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              onClick={handleDeleteClick}
              className="p-2 text-neutral-400 dark:text-zinc-500 hover:text-error-600 hover:bg-error-50 dark:hover:bg-error-900/30 rounded-xl transition-all"
              title="Sil"
            >
              <svg className="w-4 h-4 text-slate-400 dark:text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 relative z-10">
        <div className="space-y-0.5">
          <div className="text-[10px] font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider">Aylık Ödeme</div>
          <div className="text-2xl font-black text-primary-600 dark:text-primary-500 select-none">{fmt(installment.monthlyPayment)}</div>
        </div>
        <div className="space-y-0.5 text-right">
          <div className="text-[10px] font-bold text-slate-500 dark:text-zinc-300 uppercase tracking-wider">Kalan Toplam</div>
          <div className="text-lg font-bold text-neutral-700 dark:text-zinc-100">{fmt(installment.monthlyPayment * installment.remainingMonths)}</div>
        </div>
      </div>

      <div className="mt-6 relative z-10">
        <div className="flex justify-between items-center text-[10px] font-bold text-neutral-500 dark:text-zinc-500 mb-2 uppercase tracking-tight">
          <div className="flex items-center gap-1.5">
            <span className="px-1.5 py-0.5 bg-neutral-100 dark:bg-zinc-900 rounded-md text-neutral-600 dark:text-zinc-400">
              {paidCount} Ödendi
            </span>
            <span className="text-neutral-300 dark:text-zinc-800">/</span>
            <span className="px-1.5 py-0.5 bg-neutral-100 dark:bg-zinc-900 rounded-md">
              {installment.totalMonths} Toplam
            </span>
          </div>
          <button 
            onClick={() => setShowPlan(!showPlan)}
            className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 flex items-center gap-0.5"
          >
            {showPlan ? 'Planı Gizle' : 'Ödeme Planı'}
            <svg className={`w-3 h-3 transition-transform ${showPlan ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
        <div className="h-2 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden shadow-inner flex p-[1px]">
          <div
            className={`h-full rounded-full transition-all duration-700 ease-out shadow-sm ${
              progressPct > 80 ? 'bg-gradient-to-r from-success-400 to-success-600' : 'bg-gradient-to-r from-primary-400 to-primary-600'
            }`}
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {showPlan && (
        <div className="mt-4 pt-4 border-t border-neutral-100 dark:border-neutral-800 space-y-1.5 max-h-48 overflow-y-auto pr-1 custom-scrollbar animate-in slide-in-from-top-2 duration-300">
          {[...Array(installment.totalMonths)].map((_, i) => {
            const date = new Date(installment.firstPaymentDate);
            date.setMonth(date.getMonth() + i);
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            const isPaid = installment.paymentHistory?.[key]?.status === 'paid';
            
            // Calculate actual payment date based on account settings (Task 45.83)
            const actualPaymentDate = new Date(date);
            const isCC = installment.type === 'kredi_kartı_taksiti';
            
            if (isCC && account?.paymentDay) {
              actualPaymentDate.setDate(account.paymentDay);
            } else {
              // Bank loans stick to the original day of firstPaymentDate
              actualPaymentDate.setDate(new Date(installment.firstPaymentDate).getDate());
            }
            
            const dayNum = actualPaymentDate.getDate();
            const monthNum = String(actualPaymentDate.getMonth() + 1).padStart(2, '0');
            const yearNum = actualPaymentDate.getFullYear();
            const label = `${dayNum}.${monthNum}.${yearNum}`;
            
            const isDelinquent = delInfo.delinquentMonths.includes(key);
            const rowStyle = isCC 
              ? 'bg-amber-50/30 dark:bg-amber-900/10 border-amber-200/20' 
              : 'bg-blue-50/30 dark:bg-blue-900/10 border-blue-200/20';
            
            return (
              <div key={i} className={`flex items-center justify-between py-1.5 px-2 rounded-lg text-[10px] font-bold border transition-all ${
                isDelinquent 
                  ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-900/40 text-red-700 dark:text-red-400' 
                  : `${rowStyle} text-neutral-700 dark:text-zinc-300`
              }`}>
                <div className="flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full ${
                    isPaid ? 'bg-success-500' : isDelinquent ? 'bg-red-500 animate-pulse' : (isCC ? 'bg-amber-500' : 'bg-blue-500')
                  }`} />
                  <span className={isPaid ? 'text-neutral-500 dark:text-zinc-500 line-through' : ''}>
                    {i + 1}. Taksit — {label} {isDelinquent && '!! GECİKMİŞ BORÇ !!'}
                  </span>
                  {!isPaid && account && (
                    <span className={`px-1 rounded text-[8px] uppercase tracking-tighter ${
                      isCC ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                    }`}>
                      {account.name.split(' ')[0]}
                    </span>
                  )}
                </div>
                {isPaid && <span className="text-success-600 dark:text-success-400">✓ ÖDENDİ</span>}
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-1.5">
          <svg className="w-3 h-3 text-neutral-400 dark:text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="text-[10px] font-semibold text-slate-600 dark:text-zinc-300 truncate">
            Başlangıç: {formatDate(installment.firstPaymentDate)}
          </span>
        </div>
        {installment.principal > 0 && (
          <div className="text-[10px] font-medium text-slate-500 dark:text-zinc-500">
            Açılış: {fmt(installment.principal)}
          </div>
        )}
      </div>
    </div>
  );
}
