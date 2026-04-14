import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

// Environment Guard: Semantic Validation
if (!supabaseKey.startsWith('eyJ')) {
  throw new Error(
    "Geçersiz Supabase Anon Key. Lütfen .env dosyasındaki VITE_SUPABASE_ANON_KEY değerine " +
    "Supabase Dashboard'dan aldığınız gerçek anahtarı (JWT formatında, 'eyJ' ile başlayan) girin."
  );
}

const supabase = createClient(supabaseUrl, supabaseKey);

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
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return data.session;
  },

  async getCurrentUser() {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    return data.user;
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
