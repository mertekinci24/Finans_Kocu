import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Installment, ScenarioType, Account, Transaction, Debt, RecurringFlow } from '@/types';
import { SCENARIO_LABELS, type ScenarioResult, scenarioSimulator, type Scenario } from '@/services/scenarioSimulator';

interface ScenarioNavigatorProps {
  installments: Installment[];
  onRunScenario: (type: ScenarioType, params: any) => void;
  onCommit: (installmentId: string, updates: Partial<Installment>) => void;
  scenarioResult: ScenarioResult | null;
  fmt: (n: number) => string;
  accounts: Account[];
  transactions: Transaction[];
  debts: Debt[];
  recurringFlows: RecurringFlow[];
}

export const ScenarioNavigator: React.FC<ScenarioNavigatorProps> = ({
  installments,
  onRunScenario,
  onCommit,
  scenarioResult,
  fmt,
  accounts,
  transactions,
  debts,
  recurringFlows
}) => {
  const [selectedId, setSelectedId] = useState<string>('');
  const [mode, setMode] = useState<'postpone' | 'restructure'>('postpone');
  
  // Postpone state
  const [monthsToPostpone, setMonthsToPostpone] = useState(3);
  
  // Restructure state
  const [newMonthlyPayment, setNewMonthlyPayment] = useState<number>(0);
  const [newTotalMonths, setNewTotalMonths] = useState<number>(0);
  const [newInterestRate, setNewInterestRate] = useState<number>(0);
  const [newFirstPaymentDate, setNewFirstPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // --- ACTION 1: REAL-TIME PREVIEW ENGINE ---
  const liveScenarioResult = useMemo(() => {
    if (!selectedId) return null;

    const scenario: Scenario = {
      type: 'debt_restructuring',
      label: SCENARIO_LABELS['debt_restructuring'].title,
      params: {
        installmentId: selectedId,
        mode,
        monthsToPostpone: mode === 'postpone' ? monthsToPostpone : undefined,
        newMonthlyPayment: mode === 'restructure' ? newMonthlyPayment : undefined,
        newTotalMonths: mode === 'restructure' ? newTotalMonths : undefined,
        newInterestRate: mode === 'restructure' ? newInterestRate : undefined,
      },
    };

    try {
      return scenarioSimulator.simulate(scenario, accounts, transactions, debts, installments, recurringFlows);
    } catch (err) {
      console.error('Live simulation failed:', err);
      return null;
    }
  }, [selectedId, mode, monthsToPostpone, newMonthlyPayment, newTotalMonths, newInterestRate, accounts, transactions, debts, installments, recurringFlows]);

  const activeInstallments = installments.filter(i => i.status === 'active');
  const selectedDebt = activeInstallments.find(i => i.id === selectedId);

  const handleTest = () => {
    if (!selectedId) return;

    onRunScenario('debt_restructuring', {
      installmentId: selectedId,
      mode,
      monthsToPostpone: mode === 'postpone' ? monthsToPostpone : undefined,
      newMonthlyPayment: mode === 'restructure' ? newMonthlyPayment : undefined,
      newTotalMonths: mode === 'restructure' ? newTotalMonths : undefined,
      newInterestRate: mode === 'restructure' ? newInterestRate : undefined,
    });
  };

  const handleCommit = () => {
    if (!selectedId || !selectedDebt) return;

    // CRITICAL: Do NOT include 'note' in updates to prevent Supabase PGRST204 Schema Error.
    const updates: Partial<Installment> = {};

    if (mode === 'postpone') {
      const targetDate = new Date(selectedDebt.firstPaymentDate);
      targetDate.setMonth(targetDate.getMonth() + monthsToPostpone);
      updates.firstPaymentDate = targetDate;
      
      const nextDate = new Date(selectedDebt.nextPaymentDate);
      nextDate.setMonth(nextDate.getMonth() + monthsToPostpone);
      updates.nextPaymentDate = nextDate;
      
      updates.lenderName = selectedDebt.lenderName.includes('(ÖTELENDİ)') 
        ? selectedDebt.lenderName 
        : `${selectedDebt.lenderName} (ÖTELENDİ)`;
    } 
    else if (mode === 'restructure') {
      if (newMonthlyPayment > 0) updates.monthlyPayment = newMonthlyPayment;
      if (newTotalMonths > 0) {
        updates.totalMonths = newTotalMonths;
        updates.remainingMonths = newTotalMonths;
      }
      
      // 🚨 DOUBLE-COUNT PREVENTION (Task 46.6)
      if (newInterestRate !== undefined) {
        updates.interestRate = newInterestRate;
        const interestMultiplier = 1 + (newInterestRate / 100);
        const newPrincipal = Math.round(selectedDebt.principal * interestMultiplier);
        updates.principal = newPrincipal;

        // Kredi kartı ise, yapılandırılan borç kadar hesabı borçlandır (bakiyeyi artır/limit düş)
        const account = accounts.find(a => a.id === selectedDebt.accountId);
        if (account && account.type === 'kredi_kartı') {
          (updates as any).targetAccountUpdate = {
            accountId: account.id,
            newBalance: Math.max(0, account.balance - selectedDebt.principal)
          };
        }
      }
      
      updates.lenderName = selectedDebt.lenderName.includes('(YAPILANDIRILDI)') 
        ? selectedDebt.lenderName 
        : `${selectedDebt.lenderName} (YAPILANDIRILDI)`;

      updates.firstPaymentDate = new Date(newFirstPaymentDate);
      updates.nextPaymentDate = new Date(newFirstPaymentDate);
      updates.paymentHistory = {}; // Clear ghost lags
    }

    // Trigger the parent callback to execute the Supabase update and refresh the global state.
    onCommit(selectedId, updates);
  };

  return (
    <div className="space-y-4">
      {/* 1. Borç Seçici */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block">
          YAPILANDIRILACAK BORÇ SEÇİN
        </label>
        <select
          value={selectedId}
          onChange={(e) => {
            const id = e.target.value;
            setSelectedId(id);
            const inst = activeInstallments.find(i => i.id === id);
            if (inst) {
              setNewMonthlyPayment(inst.monthlyPayment);
              setNewTotalMonths(inst.remainingMonths);
              setNewInterestRate(inst.interestRate);
            }
          }}
          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-white font-bold focus:ring-1 focus:ring-orange-500 outline-none transition-all cursor-pointer"
        >
          <option value="">Borç Seçimi Yapın...</option>
          {activeInstallments.map(inst => (
            <option key={inst.id} value={inst.id}>
              {inst.lenderName} ({fmt(inst.monthlyPayment)} / Ay)
            </option>
          ))}
        </select>
      </div>

      <AnimatePresence>
        {selectedId && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {/* ACTION 2: THE "BEFORE/AFTER" HUD UI */}
            {liveScenarioResult && (
              <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 blur-3xl pointer-events-none" />
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Canlı Simülasyon Kokpiti</h4>
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                    <span className="text-[8px] font-bold text-emerald-500/80 uppercase">Gerçek Zamanlı</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {/* Score HUD */}
                  <div className="bg-zinc-900/50 p-2 rounded-xl border border-zinc-800">
                    <p className="text-[8px] font-black text-zinc-600 uppercase mb-1">SKOR</p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-xs font-bold text-zinc-400">{liveScenarioResult.baselineScore}</span>
                      <span className="text-[10px] text-zinc-600">→</span>
                      <span className={`text-sm font-black ${
                        liveScenarioResult.scenarioScore >= 85 ? 'text-emerald-400' :
                        liveScenarioResult.scenarioScore >= 55 ? 'text-green-400' :
                        liveScenarioResult.scenarioScore >= 35 ? 'text-orange-400' : 'text-red-400'
                      }`}>
                        {liveScenarioResult.scenarioScore}
                      </span>
                    </div>
                  </div>

                  {/* DTI HUD */}
                  <div className="bg-zinc-900/50 p-2 rounded-xl border border-zinc-800">
                    <p className="text-[8px] font-black text-zinc-600 uppercase mb-1">DTI</p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-xs font-bold text-zinc-400">
                        {liveScenarioResult.fullScore?.baselineScoreData?.score?.debtToIncomeRatio?.toFixed(1) || '0.0'}x
                      </span>
                      <span className="text-[10px] text-zinc-600">→</span>
                      <span className={`text-sm font-black ${
                        (liveScenarioResult.fullScore?.score?.debtToIncomeRatio || 0) < 0.4 ? 'text-emerald-400' :
                        (liveScenarioResult.fullScore?.score?.debtToIncomeRatio || 0) < 0.7 ? 'text-green-400' : 'text-orange-400'
                      }`}>
                        {liveScenarioResult.fullScore?.score?.debtToIncomeRatio?.toFixed(1) || '0.0'}x
                      </span>
                    </div>
                  </div>

                  {/* Monthly Burden HUD */}
                  <div className="bg-zinc-900/50 p-2 rounded-xl border border-zinc-800">
                    <p className="text-[8px] font-black text-zinc-600 uppercase mb-1">MRE (AYLIK)</p>
                    <div className="flex items-baseline gap-1 truncate">
                      <span className={`text-[10px] font-black ${
                        liveScenarioResult.scenarioScore > liveScenarioResult.baselineScore ? 'text-emerald-400' : 'text-zinc-300'
                      }`}>
                        {fmt(liveScenarioResult.fullScore?.score?.totalMonthlyDebt || 0)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 2. Mode Toggle */}
            <div className="flex p-1 bg-zinc-950 rounded-xl border border-zinc-900">
              <button
                onClick={() => setMode('postpone')}
                className={`flex-1 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${
                  mode === 'postpone' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                Öteleme
              </button>
              <button
                onClick={() => setMode('restructure')}
                className={`flex-1 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${
                  mode === 'restructure' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                Yapılandırma
              </button>
            </div>

            {/* 3. Conditional Inputs */}
            <div className="grid grid-cols-2 gap-3">
              {mode === 'postpone' ? (
                <div className="col-span-2 space-y-1.5">
                  <label className="text-[9px] font-black text-zinc-600 uppercase tracking-wider">
                    ÖTELEME SÜRESİ (AY)
                  </label>
                  <input
                    type="number"
                    value={monthsToPostpone}
                    onChange={(e) => setMonthsToPostpone(Number(e.target.value))}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white font-bold focus:border-orange-500 outline-none"
                    min={1}
                    max={12}
                  />
                </div>
              ) : (
                <>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-zinc-600 uppercase tracking-wider">
                      YENİ AYLIK TAKSİT (₺)
                    </label>
                    <input
                      type="number"
                      value={newMonthlyPayment}
                      onChange={(e) => setNewMonthlyPayment(Number(e.target.value))}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white font-bold focus:border-orange-500 outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-zinc-600 uppercase tracking-wider">
                      YENİ TAKSİT SAYISI
                    </label>
                    <input
                      type="number"
                      value={newTotalMonths}
                      onChange={(e) => setNewTotalMonths(Number(e.target.value))}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white font-bold focus:border-orange-500 outline-none"
                    />
                  </div>
                  <div className="col-span-2 space-y-1.5">
                    <label className="text-[9px] font-black text-zinc-600 uppercase tracking-wider">
                      YENİ FAİZ ORANI (%)
                    </label>
                    <input
                      type="number"
                      value={newInterestRate}
                      onChange={(e) => setNewInterestRate(Number(e.target.value))}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white font-bold focus:border-orange-500 outline-none"
                    />
                  </div>
                  <div className="col-span-2 space-y-1.5">
                    <label className="text-[9px] font-black text-zinc-600 uppercase tracking-wider">
                      YENİ 1. TAKSİT TARİHİ
                    </label>
                    <input
                      type="date"
                      value={newFirstPaymentDate}
                      onChange={(e) => setNewFirstPaymentDate(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white font-bold focus:border-orange-500 outline-none [color-scheme:dark]"
                    />
                  </div>
                </>
              )}
            </div>

            {/* 4. Action Buttons */}
            <div className="flex gap-2 pt-2">
              <button
                onClick={handleTest}
                className="flex-1 py-2.5 text-[10px] font-black uppercase tracking-widest bg-zinc-800 text-white rounded-xl hover:bg-zinc-700 border border-zinc-700 transition-all shadow-sm"
              >
                Simüle Et
              </button>
              <button
                onClick={handleCommit}
                className="flex-1 py-2.5 text-[10px] font-black uppercase tracking-widest bg-gradient-to-r from-orange-600 to-rose-600 text-white rounded-xl hover:from-orange-500 hover:to-rose-500 transition-all shadow-lg shadow-orange-900/20"
              >
                Yapılandırmayı Onayla
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <p className="text-[9px] text-zinc-600 font-medium leading-relaxed italic">
        ⓘ {SCENARIO_LABELS['debt_restructuring'].description}
      </p>
    </div>
  );
};
