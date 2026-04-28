import { supabase } from '@/services/supabase/adapter';

export interface SignUpPayload {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

export interface SignInPayload {
  email: string;
  password: string;
}

export const authService = {
  async signUp({ email, password, firstName, lastName }: SignUpPayload) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName || '',
          last_name: lastName || '',
        },
      },
    });

    if (error) throw error;
    return data;
  },

  async signIn({ email, password }: SignInPayload) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    return data;
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async getCurrentSession() {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) return null;
      return data.session;
    } catch {
      return null;
    }
  },

  async getCurrentUser() {
    try {
      const { data, error } = await supabase.auth.getUser();
      if (error) return null;
      return data.user;
    } catch {
      return null;
    }
  },

  onAuthStateChange(callback: (_event: string, _session: unknown) => void) {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, _session) => {
      callback(_event, _session);
    });

    return subscription;
  },
};
