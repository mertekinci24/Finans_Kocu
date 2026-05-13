import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUIStore, type Theme } from '@/stores/uiStore';
import { useAuth } from '@/hooks/useAuth';
import { authService } from '@/services/authService';
import { useSubscription } from '@/hooks/useSubscription';
import { APP_NAME, APP_VERSION } from '@/constants';
import { dataManager, type BackupData } from '@/services/dataManager';

export default function Settings(): JSX.Element {
  const { theme, setTheme } = useUIStore();
  const { user } = useAuth();
  const { isPro } = useSubscription();

  // State Management
  const [isProcessing, setIsProcessing] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error'; id: number } | null>(null);
  const [modal, setModal] = useState<'reset' | 'restore' | null>(null);
  const [resetConfirm, setResetConfirm] = useState('');
  const [pendingRestoreData, setPendingRestoreData] = useState<BackupData | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now();
    setToast({ message, type, id });
    setTimeout(() => setToast(prev => prev?.id === id ? null : prev), 4000);
  };

  const handleLogout = async () => {
    try {
      await authService.signOut();
      window.location.href = '/signin';
    } catch (err) {
      console.error('Logout error:', err);
      showToast('Çıkış yapılırken bir hata oluştu.', 'error');
    }
  };

  // Actions
  const handleExport = async () => {
    if (!user) return;
    setIsProcessing(true);
    try {
      const data = await dataManager.exportData(user.id);
      dataManager.downloadAsFile(data);
      showToast('Veriler başarıyla JSON olarak dışa aktarıldı.');
    } catch (err) {
      showToast('Dışa aktarma sırasında hata oluştu.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (json.app !== 'FinansKoçu' || !json.data) {
          throw new Error('Geçersiz yedek dosyası.');
        }
        setPendingRestoreData(json);
        setModal('restore');
      } catch (err) {
        showToast('Geçersiz veya bozuk JSON dosyası.', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input
  };

  const handleRestore = async () => {
    if (!user || !pendingRestoreData) return;
    setIsProcessing(true);
    setModal(null);
    try {
      await dataManager.importData(user.id, pendingRestoreData);
      showToast('Veriler başarıyla geri yüklendi. Sayfa yenileniyor...');
      setTimeout(() => window.location.reload(), 2000);
    } catch (err: any) {
      console.error('[SETTINGS_RESTORE_FAILED]', err);
      showToast(err.message || 'Geri yükleme sırasında hata oluştu.', 'error');
    } finally {
      setIsProcessing(false);
      setPendingRestoreData(null);
    }
  };

  const isResetConfirmed = resetConfirm.trim().toLocaleUpperCase('tr-TR') === 'SIFIRLA';

  const handleReset = async () => {
    if (!user || !isResetConfirmed) return;
    setIsProcessing(true);
    setModal(null);
    try {
      await dataManager.resetData(user.id);
      showToast('Tüm finansal verileriniz sıfırlandı. Sayfa yenileniyor...');
      setResetConfirm('');
      setTimeout(() => window.location.reload(), 2000);
    } catch (err: any) {
      console.error('[SETTINGS_RESET_FAILED]', err);
      showToast(err.message || 'Sıfırlama sırasında hata oluştu.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const themeOptions: { label: string; value: Theme; icon: string }[] = [
    { label: 'Sistem', value: 'system', icon: '💻' },
    { label: 'Açık', value: 'light', icon: '☀️' },
    { label: 'Koyu', value: 'dark', icon: '🌙' },
    { label: 'AMOLED', value: 'amoled', icon: '🌑' },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-8 pb-20 relative">
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`fixed top-6 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-2xl shadow-2xl border flex items-center gap-3 backdrop-blur-md ${
              toast.type === 'success' 
                ? 'bg-emerald-500/90 border-emerald-400 text-white' 
                : 'bg-rose-500/90 border-rose-400 text-white'
            }`}
          >
            <span className="text-lg">{toast.type === 'success' ? '✅' : '❌'}</span>
            <span className="font-bold text-sm tracking-tight">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reset Modal */}
      <AnimatePresence>
        {modal === 'reset' && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 backdrop-blur-sm bg-background/80">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-card border border-border rounded-3xl p-8 shadow-2xl max-w-sm w-full space-y-6"
            >
              <div className="text-center space-y-2">
                <span className="text-4xl">⚠️</span>
                <h3 className="text-xl font-black text-foreground">Verileri Sıfırla?</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Tüm hesaplar, işlemler, borçlar ve hedefler silinecektir. Bu işlem geri alınamaz.
                </p>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase text-center text-muted-foreground">Onaylamak için SIFIRLA yazın</p>
                  <input
                    type="text"
                    value={resetConfirm}
                    onChange={(e) => setResetConfirm(e.target.value)}
                    placeholder="SIFIRLA"
                    className="w-full px-4 py-2 bg-muted border border-border rounded-xl text-center font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-destructive/50"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => { setModal(null); setResetConfirm(''); }}
                    className="flex-1 px-4 py-3 bg-muted text-foreground font-bold rounded-xl hover:bg-muted/80 transition-colors"
                  >
                    Vazgeç
                  </button>
                  <button
                    onClick={handleReset}
                    disabled={!isResetConfirmed || isProcessing}
                    className="flex-1 px-4 py-3 bg-destructive text-destructive-foreground font-black uppercase tracking-widest text-xs rounded-xl disabled:opacity-30 transition-all"
                  >
                    {isProcessing ? 'Sıfırlanıyor...' : 'Sıfırla'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {modal === 'restore' && pendingRestoreData && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 backdrop-blur-sm bg-background/80">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-card border border-border rounded-3xl p-8 shadow-2xl max-w-md w-full space-y-6"
            >
              <div className="text-center space-y-2">
                <span className="text-4xl">📥</span>
                <h3 className="text-xl font-black text-foreground">Yedekten Yükle?</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {new Date(pendingRestoreData.exportedAt).toLocaleString('tr-TR')} tarihli yedek dosyası bulundu.
                  Mevcut tüm verileriniz silinecek ve bu yedeğin üzerine yazılacaktır.
                </p>
              </div>

              <div className="bg-muted/50 p-4 rounded-2xl grid grid-cols-2 gap-4 text-xs font-bold uppercase tracking-tighter">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Hesaplar:</span>
                  <span className="text-primary">{pendingRestoreData.data.accounts.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">İşlemler:</span>
                  <span className="text-primary">{pendingRestoreData.data.transactions.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Borçlar:</span>
                  <span className="text-primary">{pendingRestoreData.data.debts.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Hedefler:</span>
                  <span className="text-primary">{pendingRestoreData.data.savingGoals.length}</span>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => { setModal(null); setPendingRestoreData(null); }}
                  className="flex-1 px-4 py-3 bg-muted text-foreground font-bold rounded-xl hover:bg-muted/80 transition-colors"
                >
                  Vazgeç
                </button>
                <button
                  onClick={handleRestore}
                  disabled={isProcessing}
                  className="flex-1 px-4 py-3 bg-primary text-primary-foreground font-black uppercase tracking-widest text-xs rounded-xl shadow-lg hover:opacity-90 transition-all disabled:opacity-50"
                >
                  {isProcessing ? 'Yükleniyor...' : 'Geri Yükle'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div>
        <h1 className="text-3xl font-black text-foreground tracking-tight">Ayarlar</h1>
        <p className="text-muted-foreground font-medium">Uygulama tercihlerinizi buradan yönetin.</p>
      </div>

      {/* Görünüm Ayarları */}
      <section className="bg-card border border-border rounded-3xl shadow-xl overflow-hidden">
        <div className="p-6 border-b border-border bg-muted/20">
          <h2 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
            <span>🎨</span> Görünüm
          </h2>
        </div>
        <div className="p-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {themeOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setTheme(opt.value)}
                className={`flex flex-col items-center gap-3 p-4 rounded-2xl border-2 transition-all ${
                  theme === opt.value
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-border bg-background text-muted-foreground hover:border-muted-foreground/30'
                }`}
              >
                <span className="text-2xl">{opt.icon}</span>
                <span className="text-xs font-bold uppercase tracking-widest">{opt.label}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Veri Yönetimi */}
      <section className="bg-card border border-border rounded-3xl shadow-xl overflow-hidden">
        <div className="p-6 border-b border-border bg-muted/20">
          <h2 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
            <span>💾</span> Veri Yönetimi
          </h2>
        </div>
        <div className="p-8 space-y-4">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".json"
            className="hidden"
          />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => showToast('Bulut yedekleme altyapısı aktif değil. Lütfen JSON dışa aktarma kullanın.', 'error')}
              className="p-4 rounded-2xl border border-border flex items-start gap-4 text-left group transition-all hover:bg-muted/10 opacity-75"
            >
              <span className="text-xl p-2 bg-muted rounded-xl">☁️</span>
              <div className="flex flex-col">
                <span className="text-xs font-black uppercase tracking-widest text-foreground">Bulut Yedekleme</span>
                <span className="text-[10px] text-muted-foreground font-medium italic">Henüz aktif değil</span>
              </div>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              className="p-4 rounded-2xl border border-border flex items-start gap-4 text-left group transition-all hover:bg-muted/10 disabled:opacity-50"
            >
              <span className="text-xl p-2 bg-muted rounded-xl">📥</span>
              <div className="flex flex-col">
                <span className="text-xs font-black uppercase tracking-widest text-foreground">Yedekten Yükle</span>
                <span className="text-[10px] text-muted-foreground font-medium">JSON dosyasından geri yükle</span>
              </div>
            </button>

            <button
              onClick={handleExport}
              disabled={isProcessing}
              className="p-4 rounded-2xl border border-border flex items-start gap-4 text-left group transition-all hover:bg-muted/10 disabled:opacity-50"
            >
              <span className="text-xl p-2 bg-muted rounded-xl">📄</span>
              <div className="flex flex-col">
                <span className="text-xs font-black uppercase tracking-widest text-foreground">Dışa Aktar (JSON)</span>
                <span className="text-[10px] text-muted-foreground font-medium">Tüm finansal verileri indir</span>
              </div>
            </button>

            <button
              onClick={() => {
                setResetConfirm('');
                setModal('reset');
              }}
              disabled={isProcessing}
              className="p-4 rounded-2xl border border-destructive/20 flex items-start gap-4 text-left group transition-all hover:bg-destructive/5 disabled:opacity-50"
            >
              <span className="text-xl p-2 bg-destructive/10 rounded-xl">⚠️</span>
              <div className="flex flex-col">
                <span className="text-xs font-black uppercase tracking-widest text-destructive">Verileri Sıfırla</span>
                <span className="text-[10px] text-muted-foreground font-medium">Tüm kayıtları kalıcı olarak sil</span>
              </div>
            </button>
          </div>
        </div>
      </section>

      {/* Hesap & Uygulama */}
      <section className="bg-card border border-border rounded-3xl shadow-xl overflow-hidden">
        <div className="p-6 border-b border-border bg-muted/20 flex items-center justify-between">
          <h2 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
            <span>⚙️</span> Sistem
          </h2>
          <span className="text-[10px] font-bold text-muted-foreground opacity-50 uppercase tracking-widest">
            {APP_NAME} v{APP_VERSION}
          </span>
        </div>
        <div className="p-0">
          <div className="divide-y divide-border">
            <div className="p-6 flex items-center justify-between hover:bg-muted/10 transition-colors">
              <div className="flex flex-col">
                <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">Oturum</span>
                <span className="text-sm font-medium text-foreground">{user?.email}</span>
              </div>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-xs font-black uppercase tracking-widest text-destructive hover:bg-destructive/10 rounded-lg transition-colors border border-destructive/20"
              >
                Çıkış Yap
              </button>
            </div>
            
            <div className="p-6 flex items-center justify-between hover:bg-muted/10 transition-colors">
              <div className="flex flex-col">
                <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">Abonelik</span>
                <span className="text-sm font-medium text-foreground flex items-center gap-2">
                  {isPro ? 'Pro Üye' : 'Ücretsiz Plan'}
                  {isPro && <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">AKTİF</span>}
                </span>
              </div>
              <button
                onClick={() => window.location.href = '/upgrade'}
                className="px-4 py-2 text-xs font-black uppercase tracking-widest text-foreground hover:bg-muted border border-border rounded-lg transition-colors"
              >
                Yönet
              </button>
            </div>

            <div className="p-6 bg-muted/10">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">Uygulama Bilgisi</span>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  FinansKoçu, bireysel finans yönetimini kolaylaştırmak için tasarlanmış modern bir asistandır. 
                  Token tabanlı tema sistemi ve şifreleme ile verileriniz güvendedir.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
