import { useState, useRef, useMemo, useEffect } from 'react';
import { CURRENCY_SYMBOL, ACCOUNT_COLORS } from '@/constants';
import { getAccountTypeLabel } from '@/utils/bankLogos';
import BankLogo from './BankLogo';
import type { Account } from '@/types';
import { calculateCCDates, formatFullDate } from '@/utils/dateUtils';
import { useTimeStore } from '@/stores/timeStore';
import { cashFlowEngine } from '@/services/cashFlowEngine';
import { dataSourceAdapter } from '@/services/supabase/adapter';
import type { Transaction } from '@/types';

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
  const [editCardLimit, setEditCardLimit] = useState(String(account.cardLimit || ''));
  const [editStatementDay, setEditStatementDay] = useState(String(account.statementDay || ''));
  const [editPaymentDay, setEditPaymentDay] = useState(String(account.paymentDay || ''));
  const [saving, setSaving] = useState(false);
  const [undo, setUndo] = useState<UndoState>({ visible: false, timer: null });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const nameRef = useRef<HTMLInputElement>(null);
  
  const { systemDate } = useTimeStore();

  const nextStatement = useMemo(() => {
    if (account.type !== 'kredi_kartı' || !editStatementDay || !editPaymentDay) return null;
    const sDay = parseInt(editStatementDay, 10);
    const pDay = parseInt(editPaymentDay, 10);
    if (isNaN(sDay) || isNaN(pDay)) return null;
    try {
      return calculateCCDates(sDay, pDay, systemDate);
    } catch {
      return null;
    }
  }, [account.type, editStatementDay, editPaymentDay, systemDate]);

  useEffect(() => {
    const loadTx = async () => {
      const sDate = new Date(systemDate);
      const start = new Date(sDate.getFullYear(), sDate.getMonth() - 1, 1);
      const end = new Date(sDate.getFullYear(), sDate.getMonth() + 1, 0);
      const txs = await dataSourceAdapter.transaction.getByDateRange(account.id, start, end);
      setTransactions(txs);
    };
    loadTx();
  }, [account.id, systemDate]);

  const statementData = cashFlowEngine.calculateStatementBalance(account, transactions, systemDate);

  const colors = ACCOUNT_COLORS[account.type] || ACCOUNT_COLORS.default;

  const getBankShadow = (bankName?: string) => {
    if (!bankName) return 'shadow-xl';
    const name = bankName.toLowerCase();
    for (const [key, shadow] of Object.entries(BANK_COLORS)) {
      if (name.includes(key)) return `shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)] ${shadow}`;
    }
    return 'shadow-xl';
  };

  const shadowClass = getBankShadow(account.bankName);

  const formatCurrency = (amount: number) =>
    `${CURRENCY_SYMBOL}${amount.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  const startEdit = () => {
    setEditName(account.name);
    setEditBalance(String(account.balance));
    setEditBankName(account.bankName || '');
    setEditCardLimit(String(account.cardLimit || ''));
    setEditStatementDay(String(account.statementDay || ''));
    setEditPaymentDay(String(account.paymentDay || ''));
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
      const lim = parseFloat(editCardLimit.replace(',', '.'));
      const sDay = parseInt(editStatementDay, 10);
      const pDay = parseInt(editPaymentDay, 10);

      await onUpdate(account.id, {
        name: editName.trim(),
        balance: newBalance,
        bankName: editBankName.trim() || undefined,
        cardLimit: isNaN(lim) ? undefined : lim,
        statementDay: isNaN(sDay) ? undefined : sDay,
        paymentDay: isNaN(pDay) ? undefined : pDay,
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

  if (undo.visible) {
    return (
      <div className="bg-neutral-100 dark:bg-neutral-800 rounded-xl border-2 border-dashed border-neutral-300 dark:border-neutral-700 p-4 flex items-center justify-between">
        <span className="text-neutral-500 dark:text-neutral-400 text-sm">Hesap silindi</span>
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
      <div className="bg-white dark:bg-neutral-900 rounded-xl border-2 border-primary-400 p-4 shadow-sm space-y-3">
        <div className="flex items-center gap-3 mb-1">
          <BankLogo account={{ ...account, bankName: editBankName || account.bankName }} size="md" />
          <span className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">{getAccountTypeLabel(account.type)}</span>
        </div>
        <input
          ref={nameRef}
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') cancelEdit(); }}
          placeholder="Hesap adı"
          className="w-full border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
        />
        {account.type !== 'nakit' && (
          <input
            value={editBankName}
            onChange={(e) => setEditBankName(e.target.value)}
            placeholder="Banka adı (ör. Garanti, Akbank)"
            className="w-full border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
          />
        )}
        <div className="space-y-1">
          <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest pl-1">Bakiye / Borç</label>
          <input
            value={editBalance}
            onChange={(e) => setEditBalance(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') cancelEdit(); }}
            placeholder="Bakiye"
            type="text"
            className="w-full border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
          />
        </div>

        {account.type === 'kredi_kartı' && (
          <div className="space-y-3 pt-2 border-t border-neutral-100 dark:border-neutral-800">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest pl-1">Kart Limiti</label>
              <input
                value={editCardLimit}
                onChange={(e) => setEditCardLimit(e.target.value)}
                placeholder="Limit"
                type="text"
                className="w-full border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 font-bold"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest pl-1">Kesim Günü</label>
                <input
                  value={editStatementDay}
                  onChange={(e) => setEditStatementDay(e.target.value)}
                  placeholder="1-31"
                  type="number"
                  min="1"
                  max="31"
                  className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 ${
                    errors.statementDay ? 'border-error-400' : 'border-neutral-300'
                  }`}
                />
                {errors.statementDay && <p className="text-xs text-error-600 mt-1">{errors.statementDay}</p>}
                {nextStatement && (
                  <p className="text-[9px] text-zinc-500 mt-1.5 font-medium">
                    Hedef ekstre: {formatFullDate(nextStatement.statementDate)}
                  </p>
                )}
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest pl-1">Ödeme Günü</label>
                <input
                  value={editPaymentDay}
                  onChange={(e) => setEditPaymentDay(e.target.value)}
                  placeholder="1-31"
                  type="number"
                  min="1"
                  max="31"
                  className="w-full border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                />
              </div>
            </div>
          </div>
        )}
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
            className="px-4 py-2 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-sm rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
          >
            İptal
          </button>
        </div>
      </div>
    );
  }

  const ccDates = account.type === 'kredi_kartı' && account.statementDay && account.paymentDay
    ? calculateCCDates(account.statementDay, account.paymentDay, systemDate)
    : null;

  return (
    <div
      className={`bg-[#000000] border border-zinc-900 rounded-[2.5rem] p-7 transition-all duration-700 group cursor-pointer relative overflow-hidden ${shadowClass} hover:border-zinc-800 shadow-2xl`}
      onClick={startEdit}
      title="Düzenlemek için tıkla"
    >
      {/* Premium Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-tr from-zinc-900/10 via-transparent to-zinc-900/10 opacity-50" />
      <div className="absolute -right-20 -top-20 w-64 h-64 bg-zinc-900/20 rounded-full blur-[80px] pointer-events-none group-hover:bg-zinc-800/30 transition-all duration-1000" />
      
      <div className="flex flex-col h-full relative z-10">
        {/* Header Section */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-5">
            <div className="p-3.5 rounded-2xl bg-[#0a0a0a] border border-zinc-800 shadow-2xl group-hover:border-zinc-700 transition-colors duration-500">
              <BankLogo account={account} size="md" />
            </div>
            <div className="space-y-1.5">
              <div className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.4em] leading-none">
                {getAccountTypeLabel(account.type)}
              </div>
              <div className="font-bold text-white text-lg tracking-tight flex items-center gap-3">
                {account.name}
                {ccDates?.isTodayPayment && (
                  <span className="bg-red-500 text-white text-[8px] px-2 py-0.5 rounded-full font-black animate-pulse shadow-[0_0_12px_rgba(239,68,68,0.4)]">
                    BUGÜN ÖDEME
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={(e) => { e.stopPropagation(); handleDeleteClick(); }}
            className="opacity-0 group-hover:opacity-100 p-2 text-zinc-700 hover:text-red-400 hover:bg-red-400/5 rounded-xl transition-all duration-300"
            title="Hesabı sil"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>

        {/* Dynamic Dates Section - Center Focus for Credit Cards */}
        {account.type === 'kredi_kartı' && ccDates && (
          <div className="mt-8 grid grid-cols-2 gap-3">
            <div className="bg-[#050505] border border-zinc-900/50 rounded-2xl p-4 transition-all hover:border-zinc-800 group/date">
              <div className="text-[8px] font-black text-zinc-500 uppercase tracking-widest mb-2 flex items-center justify-between">
                <span>Hesap Kesim</span>
                {ccDates.isTodayStatement && (
                  <span className="text-primary-500 animate-pulse">●</span>
                )}
              </div>
              <div className="text-sm font-bold text-zinc-100 tracking-tight flex items-center gap-2">
                {formatFullDate(ccDates.statementDate)}
                {ccDates.isTodayStatement && <span className="text-[8px] bg-primary-500/10 text-primary-500 px-1.5 py-0.5 rounded uppercase">Bugün</span>}
              </div>
            </div>
            <div className="bg-[#050505] border border-zinc-900/50 rounded-2xl p-4 transition-all hover:border-zinc-800 group/date">
              <div className="text-[8px] font-black text-zinc-500 uppercase tracking-widest mb-2 flex items-center justify-between">
                <span>Son Ödeme</span>
                {ccDates.isTodayPayment && (
                  <span className="text-red-500 animate-pulse">●</span>
                )}
              </div>
              <div className="text-sm font-bold text-zinc-100 tracking-tight flex items-center gap-2">
                {formatFullDate(ccDates.paymentDate)}
                {ccDates.isTodayPayment && <span className="text-[8px] bg-red-500/10 text-red-500 px-1.5 py-0.5 rounded uppercase font-black">Bugün</span>}
              </div>
            </div>
          </div>
        )}

        {/* Balance Section */}
        <div className="mt-auto pt-8 flex items-end justify-between">
          <div className="flex-1">
            {account.type === 'kredi_kartı' ? (
              <div className="space-y-1">
                <div className={`text-[10px] font-black uppercase tracking-[0.2em] mb-1 ${account.balance < 0 ? 'text-emerald-500' : 'text-zinc-500'}`}>
                  {account.balance < 0 ? 'ARTI BAKİYE (FAZLA ÖDEME)' : 'EKSTRE BORCU (ÖDENECEK)'}
                </div>
                <div className="text-5xl font-black text-white tracking-tighter transition-all duration-500 group-hover:scale-[1.02] origin-left">
                  {formatCurrency(account.balance < 0 ? Math.abs(account.balance) : statementData.statementBalance)}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <div className="text-[10px] text-zinc-600 font-bold uppercase tracking-wider">
                    Dönem İçi Harcama:
                  </div>
                  <div className="text-sm font-black text-zinc-400">
                    {formatCurrency(statementData.pendingBalance)}
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <div className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.2em] mb-2 pr-6">
                  MEVCUT VARLIK
                </div>
                <div className="text-5xl font-black text-white tracking-tighter transition-all duration-500 group-hover:scale-[1.02] origin-left">
                  {formatCurrency(account.balance)}
                </div>
              </div>
            )}
          </div>
          
          {account.type === 'kredi_kartı' && account.cardLimit && (
            <div className="text-right pb-1 ml-4">
              <div className="text-[9px] text-zinc-600 font-black uppercase tracking-wider mb-1 pr-1">Kalan Limit</div>
              <div className="text-xl font-bold text-zinc-300 tracking-tight">
                {formatCurrency(account.cardLimit - account.balance)}
              </div>
            </div>
          )}
        </div>

        {/* High Contrast Progress Section */}
        {account.type === 'kredi_kartı' && account.cardLimit && (
          <div className="mt-8">
            <div className="flex justify-between items-center mb-2.5">
              <div className="flex items-center gap-2">
                <span className="text-[9px] text-zinc-500 font-black uppercase tracking-[0.3em]">LİMİT DURUMU</span>
                <span className="w-1 h-1 bg-zinc-800 rounded-full" />
                <span className="text-[9px] text-zinc-400 font-black">
                  {formatCurrency(account.cardLimit)} TOTAL
                </span>
              </div>
              <span className="text-[10px] font-black text-white bg-zinc-900 px-2.5 py-1 rounded-lg border border-zinc-800 shadow-inner">
                {((account.balance / account.cardLimit) * 100).toFixed(0)}%
              </span>
            </div>
            <div className="h-1.5 bg-[#0a0a0a] rounded-full overflow-hidden border border-zinc-900/50">
              <div
                className={`h-full rounded-full transition-all duration-[1500ms] ease-out ${
                  (account.balance / account.cardLimit) > 0.8 
                    ? 'bg-gradient-to-r from-red-600 to-red-400 shadow-[0_0_15px_rgba(239,68,68,0.3)]' 
                    : 'bg-gradient-to-r from-zinc-100 to-zinc-400 select-none'
                }`}
                style={{ width: `${Math.min(100, (account.balance / account.cardLimit) * 100)}%` }}
              />
            </div>
          </div>
        )}

        <div className="mt-6 flex items-center justify-between">
          <div className="text-[9px] text-zinc-700 uppercase tracking-widest font-black group-hover:text-zinc-500 transition-colors">
            Tap to customize
          </div>
          <div className="flex -space-x-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="w-6 h-6 rounded-full border-2 border-[#000000] bg-zinc-900 flex items-center justify-center overflow-hidden">
                <div className="w-full h-full bg-gradient-to-br from-zinc-800 to-transparent opacity-50" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
