import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { authService } from '@/services/authService';

let isAuthListenerMounted = false;

export function useAuth() {
  const { session, user, loading, error, setSession, setUser, setLoading, setError } = useAuthStore();

  useEffect(() => {
    if (isAuthListenerMounted) return;
    isAuthListenerMounted = true;

    let unsubscribe: ReturnType<typeof authService.onAuthStateChange> | null = null;

    (async () => {
      try {
        setLoading(true);
        const currentSession = await authService.getCurrentSession();
        const currentUser = await authService.getCurrentUser();
        setSession(currentSession);
        setUser(currentUser);

        unsubscribe = authService.onAuthStateChange(async (_event: string, newSession: ReturnType<typeof authService.getCurrentSession> extends Promise<infer T> ? T : unknown) => {
          console.log('[Trace] authService.onAuthStateChange event:', _event);
          setSession(newSession);
          if (newSession) {
            console.log('[Trace] Session bulundu, user:', newSession.user.id);
            setUser(newSession.user);
            // Profile Sync on auth change
            try {
               console.log('[Trace] Profil aranıyor (auth change)...');
               const { dataSourceAdapter } = await import('@/services/supabase/adapter');
               const existingProfile = await dataSourceAdapter.user.getById(newSession.user.id);
               if (!existingProfile) {
                 console.log('[Trace] Profil bulunamadı, oluşturuluyor...');
                 await dataSourceAdapter.user.create({
                   id: newSession.user.id,
                   email: newSession.user.email || '',
                   firstName: newSession.user.user_metadata?.first_name || newSession.user.email?.split('@')[0] || 'User',
                   lastName: newSession.user.user_metadata?.last_name || '',
                 } as any);
                 console.log('[Trace] Profil oluşturuldu.');
               } else {
                 console.log('[Trace] Profil mevcut.');
               }
            } catch (syncErr: any) {
               console.error('[Trace] Profile sync failed on auth change:', syncErr);
               // Zorunlu Fallback: Profil yoksa/hata varsa login'e düşür
               if (syncErr?.code === 'PGRST205') {
                 console.error('[Trace] FATAL: public.users tablosu bulunamadı (PGRST205).');
                 setError('Veritabanı tablosu eksik: public.users bulunamadı.');
                 setUser(null);
                 setSession(null); // Kritik: Session'ı null yap ki ProtectedRoute engellesin
               }
            }
          } else {
            console.log('[Trace] Oturum yok, user=null yapılıyor.');
            setUser(null);
            setSession(null);
          }
        });

        // Profile Sync on initial load
        if (currentUser) {
          console.log('[Trace] Initial load: currentUser bulundu:', currentUser.id);
          try {
            console.log('[Trace] Initial load: Profil aranıyor...');
            const { dataSourceAdapter } = await import('@/services/supabase/adapter');
            const existingProfile = await dataSourceAdapter.user.getById(currentUser.id);
            if (!existingProfile) {
              console.log('[Trace] Initial load: Profil bulunamadı, oluşturuluyor...');
              await dataSourceAdapter.user.create({
                id: currentUser.id,
                email: currentUser.email || '',
                firstName: currentUser.user_metadata?.first_name || currentUser.email?.split('@')[0] || 'User',
                lastName: currentUser.user_metadata?.last_name || '',
              } as any);
              console.log('[Trace] Initial load: Profil oluşturuldu.');
            } else {
              console.log('[Trace] Initial load: Profil mevcut.');
            }
          } catch (syncErr: any) {
            console.error('[Trace] Initial profile sync failed:', syncErr);
            if (syncErr?.code === 'PGRST205') {
               console.error('[Trace] FATAL: public.users tablosu bulunamadı (PGRST205).');
               setError("Sunucu Hatası: 'users' tablosu yok.");
               setUser(null); // Zorunlu Fallback
               setSession(null);
            }
          }
        } else {
          console.log('[Trace] Initial load: currentUser yok.');
        }
      } catch (err) {
        console.warn('[Trace] useAuth initialization warning (graceful fallback):', err);
        // We do NOT set error state here to avoid blocking the Login page
        setUser(null);
        setSession(null);
      } finally {
        console.log('[Trace] useAuth loading tamamlandı (false).');
        setLoading(false);
      }
    })();

    return () => {
      if (unsubscribe) {
        unsubscribe.unsubscribe();
      }
    };
  }, [setSession, setUser, setLoading, setError]);

  return {
    session,
    user,
    loading,
    error,
    isAuthenticated: !!session && !!user,
  };
}
