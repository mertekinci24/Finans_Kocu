import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { authService } from '@/services/authService';

export function useAuth() {
  const { session, user, loading, error, setSession, setUser, setLoading, setError } = useAuthStore();

  useEffect(() => {
    let unsubscribe: ReturnType<typeof authService.onAuthStateChange> | null = null;

    (async () => {
      try {
        setLoading(true);
        const currentSession = await authService.getCurrentSession();
        const currentUser = await authService.getCurrentUser();
        setSession(currentSession);
        setUser(currentUser);

        unsubscribe = authService.onAuthStateChange((_event: string, newSession: any) => {
          setSession(newSession);
          if (newSession) {
            setUser(newSession.user);
          } else {
            setUser(null);
          }
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Authentication error';
        setError(message);
      } finally {
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
