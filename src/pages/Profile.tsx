import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { authService } from '@/services/authService';
import { useSubscription } from '@/hooks/useSubscription';

export default function Profile(): JSX.Element {
  const { user } = useAuth();
  const { isPro } = useSubscription();
  
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error'; id: number } | null>(null);

  useEffect(() => {
    if (user?.user_metadata) {
      setFirstName(user.user_metadata.first_name || '');
      setLastName(user.user_metadata.last_name || '');
    }
  }, [user]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now();
    setToast({ message, type, id });
    setTimeout(() => setToast(prev => prev?.id === id ? null : prev), 3000);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;

    setIsSaving(true);
    try {
      await authService.updateProfile({ firstName, lastName });
      showToast('Profil başarıyla güncellendi.', 'success');
    } catch (err) {
      console.error('Profile update error:', err);
      showToast('Profil güncellenirken bir hata oluştu.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const userInitial = firstName?.[0] || user?.email?.[0]?.toUpperCase() || 'U';

  return (
    <div className="max-w-2xl mx-auto space-y-8 relative pb-20">
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

      <div className="flex flex-col md:flex-row items-center gap-6 p-8 bg-card border border-border rounded-3xl shadow-xl overflow-hidden relative group">
        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
          <span className="text-9xl">👤</span>
        </div>
        
        <div className="w-24 h-24 rounded-full bg-primary/20 text-primary font-black flex items-center justify-center text-3xl border-4 border-primary/10 shadow-inner relative z-10">
          {userInitial}
          {isPro && (
            <div className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground text-[10px] px-2 py-0.5 rounded-full font-black uppercase tracking-tighter border-2 border-card">
              PRO
            </div>
          )}
        </div>
        
        <div className="flex-1 text-center md:text-left z-10">
          <h1 className="text-3xl font-black text-foreground tracking-tight">Profilim</h1>
          <p className="text-muted-foreground font-medium">{user?.email}</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="bg-card border border-border rounded-3xl shadow-xl overflow-hidden">
        <div className="p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">
                Ad
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-foreground"
                placeholder="Adınız"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">
                Soyad
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-foreground"
                placeholder="Soyadınız"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">
              E-posta
            </label>
            <div className="flex items-center gap-3 px-4 py-3 bg-muted/50 border border-border rounded-xl text-muted-foreground opacity-70">
              <span className="truncate">{user?.email}</span>
              <span className="text-[10px] font-black uppercase tracking-tighter bg-card px-2 py-0.5 rounded border border-border">
                YAKINDA DEĞİŞTİRİLEBİLİR
              </span>
            </div>
          </div>

          <div className="pt-4 flex flex-col md:flex-row items-center justify-between gap-4 border-t border-border mt-8">
            <div className="text-xs text-muted-foreground font-medium flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              Verileriniz Supabase üzerinde güvenle saklanır.
            </div>
            <button
              type="submit"
              disabled={isSaving}
              className="w-full md:w-auto px-8 py-3 bg-primary text-primary-foreground font-black uppercase tracking-widest text-xs rounded-xl shadow-lg hover:opacity-90 active:scale-95 transition-all disabled:opacity-50"
            >
              {isSaving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
            </button>
          </div>
        </div>
      </form>

      <div className="bg-muted/30 border border-border rounded-3xl p-8 flex items-center justify-between group">
        <div>
          <h3 className="font-black text-foreground uppercase tracking-tight">Üyelik Durumu</h3>
          <p className="text-sm text-muted-foreground font-medium">
            {isPro ? 'Pro plan avantajlarının tadını çıkarın.' : 'Ücretsiz plandasınız. Sınırları kaldırmak için yükseltin.'}
          </p>
        </div>
        <button
          onClick={() => window.location.href = '/upgrade'}
          className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
            isPro 
              ? 'bg-muted text-foreground border border-border hover:bg-muted/80' 
              : 'bg-foreground text-background shadow-lg hover:opacity-90 active:scale-95'
          }`}
        >
          {isPro ? 'Planı Yönet' : 'Pro\'ya Geç'}
        </button>
      </div>
    </div>
  );
}
