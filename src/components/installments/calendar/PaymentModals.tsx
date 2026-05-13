import React from 'react';
import type { Installment, Account } from '@/types';
import { 
  INSTALLMENT_TYPE_LABELS as TYPE_LABELS, 
  INSTALLMENT_TYPE_BADGE_STYLE as TYPE_BADGE_STYLE 
} from '@/constants';

interface PaymentModalsProps {
  editingDetails: {
    instId: string;
    monthKey: string;
    amount: string;
    note: string;
  } | null;
  setEditingDetails: (data: any) => void;
  confirmModalData: {
    type: 'single' | 'bulk';
    installment?: Installment;
    month?: any;
    monthKey: string;
    accountId: string;
    isChangingAccount?: boolean;
    ccPaymentType?: 'full' | 'min';
  } | null;
  setConfirmModalData: (data: any) => void;
  accounts: Account[];
  fmt: (n: number) => string;
  applyToAll: boolean;
  setApplyToAll: (val: boolean) => void;
  isProcessing: boolean;
  handleUpdateDetails: (instId: string, monthKey: string, newAmount: number, newNote: string) => Promise<void>;
  handleFinalExecutePayment: () => Promise<void>;
}

export const PaymentModals: React.FC<PaymentModalsProps> = ({
  editingDetails,
  setEditingDetails,
  confirmModalData,
  setConfirmModalData,
  accounts,
  fmt,
  applyToAll,
  setApplyToAll,
  isProcessing,
  handleUpdateDetails,
  handleFinalExecutePayment
}) => {
  return (
    <>
      {/* Edit Details Modal */}
      {editingDetails && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[100]" onClick={() => setEditingDetails(null)}>
          <div className="bg-card rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-border" onClick={e => e.stopPropagation()}>
            <h4 className="text-lg font-bold text-foreground mb-4">Taksit Detaylarını Düzenle</h4>
            <div className="space-y-4">
              <div>
                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">Tutar (₺)</label>
                <input 
                  type="text"
                  value={editingDetails.amount}
                  onChange={e => setEditingDetails({ ...editingDetails, amount: e.target.value })}
                  className="w-full bg-muted border-2 border-primary/20 rounded-xl px-4 py-3 text-lg font-bold text-primary focus:outline-none focus:border-primary/50"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">Bu Ay İçin Not</label>
                <textarea 
                  value={editingDetails.note}
                  onChange={e => setEditingDetails({ ...editingDetails, note: e.target.value })}
                  placeholder="Örn: Ara ödeme yapıldı..."
                  rows={2}
                  className="w-full bg-muted border-2 border-border rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:border-primary/50 placeholder:text-muted-foreground/50"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button 
                  onClick={() => {
                    handleUpdateDetails(editingDetails.instId, editingDetails.monthKey, parseFloat(editingDetails.amount.replace(',', '.')), editingDetails.note);
                  }}
                  className="flex-1 py-3 bg-primary text-primary-foreground rounded-xl font-bold hover:opacity-90 transition-colors shadow-lg shadow-primary/20"
                >
                  Güncelle
                </button>
                <button 
                  onClick={() => setEditingDetails(null)}
                  className="px-6 py-3 bg-muted text-muted-foreground rounded-xl font-bold hover:bg-muted/80"
                >
                  İptal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Unified Confirmation & Account Selection Modal */}
      {confirmModalData && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-in scale-in fade-in duration-200">
            <div className="p-6 space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-black text-foreground">Ödeme Onayı</h3>
                  <p className="text-xs text-muted-foreground font-medium">Finansal işlem doğrulanıyor</p>
                </div>
              </div>

              {!confirmModalData.isChangingAccount && confirmModalData.accountId ? (
                <div className="space-y-4 py-2">
                  <div className="p-4 bg-muted border border-border rounded-2xl">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-xs font-bold text-muted-foreground">
                        <span>Borç Kimliği:</span>
                        <div className={`px-2 py-0.5 rounded text-[9px] font-black border uppercase tracking-wider ${TYPE_BADGE_STYLE[confirmModalData.installment?.type || 'kredi_kartı_taksiti']}`}>
                          {TYPE_LABELS[confirmModalData.installment?.type || 'kredi_kartı_taksiti']}
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-xs font-bold text-muted-foreground">
                        <span>Ödeme Kaynağı:</span>
                        <span className="text-primary">
                          {accounts.find(a => a.id === confirmModalData.accountId)?.name}
                        </span>
                      </div>
                      
                      {confirmModalData.installment?.type === 'kredi_kartı_taksiti' ? (() => {
                        const targetCcAccount = accounts.find(a => a.id === confirmModalData.installment?.accountId);
                        const limit = targetCcAccount?.cardLimit;
                        
                        const minPayRatio = (limit === undefined || limit === 0 || limit >= 50000) ? 0.4 : 0.2;
                        
                        const statementDebt = confirmModalData.installment?.monthlyPayment || 0;
                        const minPaymentAmount = statementDebt * minPayRatio;
                        
                        return (
                          <div className="space-y-2 pt-1">
                            <div className="text-[10px] font-bold text-score-warning uppercase text-center mb-1">Akıllı Ödeme: Ekstre Bazlı Seçenekler</div>
                            <button 
                              onClick={() => setConfirmModalData({ ...confirmModalData, ccPaymentType: 'full' })}
                              className={`w-full flex items-center justify-between p-3 rounded-2xl border transition-all ${
                                confirmModalData.ccPaymentType === 'full'
                                  ? 'bg-card border-primary/50 shadow-sm'
                                  : 'bg-muted border-transparent opacity-60'
                              }`}
                            >
                              <div className="flex flex-col text-left">
                                <span className={`text-[10px] uppercase font-black ${confirmModalData.ccPaymentType === 'full' ? 'text-primary' : 'text-muted-foreground'}`}>Dönem Borcu</span>
                                <span className={`text-sm font-black ${confirmModalData.ccPaymentType === 'full' ? 'text-foreground' : 'text-muted-foreground'}`}>
                                  {fmt(statementDebt)}
                                </span>
                              </div>
                              {confirmModalData.ccPaymentType === 'full' && (
                                <span className="text-[10px] font-bold px-2 py-0.5 bg-primary/10 text-primary rounded-full">SEÇİLDİ</span>
                              )}
                            </button>
                            
                            <button 
                              onClick={() => setConfirmModalData({ ...confirmModalData, ccPaymentType: 'min' })}
                              className={`w-full flex items-center justify-between p-3 rounded-2xl border transition-all ${
                                confirmModalData.ccPaymentType === 'min'
                                  ? 'bg-card border-primary/30 shadow-sm'
                                  : 'bg-muted border-transparent opacity-60'
                              }`}
                            >
                              <div className="flex flex-col text-left">
                                <span className={`text-[10px] uppercase font-black ${confirmModalData.ccPaymentType === 'min' ? 'text-primary' : 'text-muted-foreground'}`}>Asgari Ödeme (%{minPayRatio * 100})</span>
                                <span className={`text-sm font-black ${confirmModalData.ccPaymentType === 'min' ? 'text-foreground' : 'text-muted-foreground'}`}>
                                  {fmt(minPaymentAmount)}
                                </span>
                              </div>
                              {confirmModalData.ccPaymentType === 'min' && (
                                <span className="text-[10px] font-bold px-2 py-0.5 bg-primary/10 text-primary rounded-full">SEÇİLDİ</span>
                              )}
                            </button>
                          </div>
                        );
                      })() : (
                        <div className="space-y-3 pt-1">
                          <div className="text-[10px] font-bold text-primary uppercase text-center mb-1">Taksit Bazlı Ödeme</div>
                          <div className="p-3 bg-background border border-border rounded-2xl flex items-center justify-between">
                            <div className="flex flex-col">
                              <span className="text-[10px] font-bold text-muted-foreground uppercase">Ödenecek Tutar</span>
                              <span className="text-lg font-black text-foreground">
                                {fmt((confirmModalData.installment?.paymentHistory?.[confirmModalData.monthKey] as any)?.amount || confirmModalData.installment?.monthlyPayment || 0)}
                              </span>
                            </div>
                            <div className="text-[10px] font-black px-2 py-1 bg-muted rounded text-muted-foreground">SABİT</div>
                          </div>
                   
                          <p className="text-[11px] text-muted-foreground leading-relaxed text-center px-2">
                            Ödeme tutarı hesabınızdan düşülecektir. İşlemi onaylıyor musunuz?
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                  <button 
                    onClick={() => setConfirmModalData({ ...confirmModalData, isChangingAccount: true })}
                    className="w-full text-xs font-bold text-primary hover:underline flex items-center justify-center gap-1"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                    Farklı Bir Hesap Seç
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Ödeme Kaynağı Seçin</label>
                    {confirmModalData.accountId && (
                      <button 
                        onClick={() => setConfirmModalData({ ...confirmModalData, isChangingAccount: false })}
                        className="text-[10px] font-bold text-muted-foreground hover:text-foreground"
                      >
                        Vazgeç
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                    {(() => {
                      const validAccounts = confirmModalData.installment?.type === 'kredi_kartı_taksiti'
                        ? accounts.filter(acc => acc.type !== 'kredi_kartı')
                        : accounts;
                      
                      return validAccounts.map((acc) => (
                        <button
                          key={acc.id}
                          onClick={() => setConfirmModalData({ ...confirmModalData, accountId: acc.id, isChangingAccount: false })}
                          className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
                            confirmModalData.accountId === acc.id
                              ? 'bg-primary/10 border-primary/30'
                              : 'bg-muted border-border hover:border-border/80'
                          }`}
                        >
                          <div className="text-left">
                            <div className={`text-sm font-bold ${confirmModalData.accountId === acc.id ? 'text-primary' : 'text-foreground'}`}>{acc.name}</div>
                            <div className="text-[10px] text-muted-foreground">{acc.bankName || 'Banka'}</div>
                          </div>
                          <div className="text-sm font-black text-foreground">
                            {fmt(acc.balance)}
                          </div>
                        </button>
                      ));
                    })()}
                  </div>
                </div>
              )}

              {confirmModalData.type === 'bulk' && (
                <div className="flex items-center gap-3 p-3 bg-muted border border-border rounded-xl">
                  <div className="relative flex items-center">
                    <input
                      type="checkbox"
                      id="applyToAll"
                      checked={applyToAll}
                      onChange={(e) => setApplyToAll(e.target.checked)}
                      className="w-5 h-5 rounded-lg border-2 border-border text-primary focus:ring-primary/50 bg-background"
                    />
                  </div>
                  <label htmlFor="applyToAll" className="text-xs font-bold text-muted-foreground cursor-pointer select-none">
                    Bu hesabı ayın tüm boş taksitlerine uygula
                  </label>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setConfirmModalData(null)}
                  className="flex-1 px-4 py-3 rounded-2xl border border-border text-sm font-bold text-muted-foreground hover:bg-muted transition-all hover:text-foreground"
                >
                  İptal
                </button>
                <button
                  onClick={handleFinalExecutePayment}
                  disabled={!confirmModalData.accountId || isProcessing}
                  className="flex-[1.5] px-4 py-3 rounded-2xl bg-primary text-primary-foreground text-sm font-black hover:opacity-90 transition-all shadow-lg shadow-primary/30 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isProcessing ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>Ödemeyi Onayla</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
