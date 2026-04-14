-- ═══════════════════════════════════════════════════════════════════════════════
-- FinansKoçu — TAM VERİTABANI ŞEMASI (Birleştirilmiş)
-- Bu dosyayı Supabase SQL Editor'da TEK SEFERDE çalıştırın.
-- Tüm tablolar, RLS politikaları, indexler ve enum tipler dahildir.
-- ═══════════════════════════════════════════════════════════════════════════════


-- ╔════════════════════════════════════════════════════════════════════════════╗
-- ║ BÖLÜM 1: ANA TABLOLAR (accounts, transactions, debts, installments,     ║
-- ║           financial_scores)                                              ║
-- ╚════════════════════════════════════════════════════════════════════════════╝

-- 1.1 Accounts
CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('nakit', 'banka', 'kredi_kartı')),
  balance DECIMAL(12, 2) NOT NULL DEFAULT 0,
  currency CHAR(3) NOT NULL DEFAULT 'TRY',
  bank_name VARCHAR(100),
  card_limit DECIMAL(12, 2),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT account_name_per_user UNIQUE(user_id, name),
  CONSTRAINT positive_balance CHECK (balance >= 0),
  CONSTRAINT positive_limit CHECK (card_limit IS NULL OR card_limit > 0)
);

CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_accounts_type ON accounts(type);
CREATE INDEX IF NOT EXISTS idx_accounts_is_active ON accounts(is_active);

-- 1.2 Transactions
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  amount DECIMAL(12, 2) NOT NULL,
  description VARCHAR(255) NOT NULL,
  category VARCHAR(50) NOT NULL,
  date DATE NOT NULL,
  type VARCHAR(10) NOT NULL CHECK (type IN ('gelir', 'gider')),
  note TEXT,
  recurring text NOT NULL DEFAULT 'none' CHECK (recurring IN ('none', 'daily', 'weekly', 'monthly', 'yearly')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT positive_amount CHECK (amount > 0)
);

CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_recurring ON transactions(recurring) WHERE recurring != 'none';

-- 1.3 Debts
CREATE TABLE IF NOT EXISTS debts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  creditor_name VARCHAR(100) NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  remaining_amount DECIMAL(12, 2) NOT NULL,
  monthly_payment numeric(15,2) NOT NULL DEFAULT 0,
  interest_rate DECIMAL(5, 2) DEFAULT 0,
  due_date DATE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paid_off', 'overdue')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT positive_debt_amount CHECK (amount > 0),
  CONSTRAINT positive_remaining CHECK (remaining_amount >= 0),
  CONSTRAINT positive_interest CHECK (interest_rate >= 0)
);

CREATE INDEX IF NOT EXISTS idx_debts_user_id ON debts(user_id);
CREATE INDEX IF NOT EXISTS idx_debts_status ON debts(status);
CREATE INDEX IF NOT EXISTS idx_debts_due_date ON debts(due_date);

-- 1.4 Installments
CREATE TABLE IF NOT EXISTS installments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lender_name VARCHAR(100) NOT NULL,
  principal DECIMAL(12, 2) NOT NULL,
  monthly_payment DECIMAL(12, 2) NOT NULL,
  remaining_months INTEGER NOT NULL,
  total_months INTEGER NOT NULL,
  interest_rate DECIMAL(5, 2) DEFAULT 0,
  next_payment_date DATE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paid_off', 'overdue')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT positive_principal CHECK (principal > 0),
  CONSTRAINT positive_payment CHECK (monthly_payment > 0),
  CONSTRAINT positive_months CHECK (total_months > 0 AND remaining_months >= 0),
  CONSTRAINT positive_inst_interest CHECK (interest_rate >= 0)
);

CREATE INDEX IF NOT EXISTS idx_installments_user_id ON installments(user_id);
CREATE INDEX IF NOT EXISTS idx_installments_status ON installments(status);
CREATE INDEX IF NOT EXISTS idx_installments_next_date ON installments(next_payment_date);

-- 1.5 Financial Scores
CREATE TABLE IF NOT EXISTS financial_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  overall_score INTEGER NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),
  confidence_score DECIMAL(3, 2) NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
  debt_to_income_ratio DECIMAL(5, 2) NOT NULL,
  cash_buffer_months DECIMAL(5, 2) NOT NULL,
  savings_rate DECIMAL(5, 2) NOT NULL,
  installment_burden_ratio DECIMAL(5, 2) NOT NULL,
  last_calculated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_user_score UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_financial_scores_user_id ON financial_scores(user_id);


-- ╔════════════════════════════════════════════════════════════════════════════╗
-- ║ BÖLÜM 2: KATEGORİLER                                                   ║
-- ╚════════════════════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#6b7280',
  icon text,
  monthly_budget numeric(14,2),
  type text NOT NULL DEFAULT 'gider' CHECK (type IN ('gelir', 'gider', 'ikisi_de')),
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id);


-- ╔════════════════════════════════════════════════════════════════════════════╗
-- ║ BÖLÜM 3: FİNDEKS MODÜLÜ                                                ║
-- ╚════════════════════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS findeks_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  credit_score integer NOT NULL,
  limit_usage_ratio numeric NOT NULL,
  delay_months integer NOT NULL DEFAULT 0,
  delay_history text NOT NULL DEFAULT '[]',
  bank_accounts integer NOT NULL DEFAULT 0,
  credit_cards integer NOT NULL DEFAULT 0,
  active_debts integer NOT NULL DEFAULT 0,
  banks_list text NOT NULL DEFAULT '[]',
  ai_analysis text,
  action_plan text,
  risk_level text CHECK (risk_level IN ('kritik', 'gelişim_açık', 'dengeli', 'güvenli', 'prestijli')),
  score_improvement_potential integer DEFAULT 0,
  uploaded_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS findeks_score_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  report_id uuid NOT NULL REFERENCES findeks_reports(id) ON DELETE CASCADE,
  score integer NOT NULL,
  recorded_at timestamptz DEFAULT now(),
  previous_score integer,
  score_change integer
);

CREATE INDEX IF NOT EXISTS idx_findeks_reports_user_created ON findeks_reports(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_findeks_score_history_user ON findeks_score_history(user_id, recorded_at DESC);


-- ╔════════════════════════════════════════════════════════════════════════════╗
-- ║ BÖLÜM 4: AI ASİSTAN MODÜLÜ                                             ║
-- ╚════════════════════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS chat_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Yeni Sohbet',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,
  suggested_transaction text,
  tokens_used integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS assistant_context_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  context_hash text NOT NULL,
  cached_data text NOT NULL,
  cached_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '5 minutes')
);

CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_created ON chat_sessions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages(session_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_assistant_context_user ON assistant_context_cache(user_id);


-- ╔════════════════════════════════════════════════════════════════════════════╗
-- ║ BÖLÜM 5: VERGİ TAKVİMİ & BAĞKUR MODÜLÜ                                ║
-- ╚════════════════════════════════════════════════════════════════════════════╝

-- Enum types (sadece yoksa oluştur)
DO $$ BEGIN
  CREATE TYPE obligation_type_enum AS ENUM ('kdv', 'muhtasar', 'geçici_vergi', 'sgk_bağkur', 'gelir_vergisi', 'stopaj');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE payment_status_enum AS ENUM ('pending', 'paid', 'overdue');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE baskur_profile_type_enum AS ENUM ('free_professional', 'self_employed', 'artisan', 'farmer', 'employee_with_private');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE baskur_tier_enum AS ENUM ('tier1', 'tier2', 'tier3', 'tier4', 'tier5', 'tier6');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS tax_obligations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  obligation_type obligation_type_enum NOT NULL,
  due_date date NOT NULL,
  description text NOT NULL,
  estimated_amount numeric(12, 2) DEFAULT 0,
  payment_status payment_status_enum DEFAULT 'pending',
  reminder_sent boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS baskur_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  profile_type baskur_profile_type_enum NOT NULL,
  gross_income_monthly numeric(12, 2) NOT NULL DEFAULT 0,
  baskur_tier baskur_tier_enum NOT NULL DEFAULT 'tier3',
  monthly_premium numeric(12, 2) NOT NULL DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tax_payment_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  obligation_type text NOT NULL,
  paid_date date NOT NULL,
  amount_paid numeric(12, 2) NOT NULL,
  is_on_time boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tax_obligations_user_type ON tax_obligations(user_id, obligation_type);
CREATE INDEX IF NOT EXISTS idx_tax_obligations_due_date ON tax_obligations(due_date, payment_status);
CREATE INDEX IF NOT EXISTS idx_baskur_profiles_user ON baskur_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_tax_payment_history_user ON tax_payment_history(user_id, paid_date DESC);


-- ╔════════════════════════════════════════════════════════════════════════════╗
-- ║ BÖLÜM 6: DASHBOARD LAYOUTS                                             ║
-- ╚════════════════════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS dashboard_layouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  widgets jsonb NOT NULL DEFAULT '[]'::jsonb,
  grid_columns integer NOT NULL DEFAULT 4,
  last_updated timestamptz DEFAULT now(),
  version integer DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_dashboard_layouts_user_id ON dashboard_layouts(user_id);


-- ╔════════════════════════════════════════════════════════════════════════════╗
-- ║ BÖLÜM 7: SAVING GOALS (HEDEF SİSTEMİ)                                 ║
-- ╚════════════════════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS saving_goals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'diğer',
  target_amount NUMERIC NOT NULL DEFAULT 0,
  current_amount NUMERIC NOT NULL DEFAULT 0,
  monthly_saving NUMERIC NOT NULL DEFAULT 0,
  target_date TIMESTAMPTZ,
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'active',
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_saving_goals_user_id ON saving_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_saving_goals_status ON saving_goals(status);
CREATE INDEX IF NOT EXISTS idx_saving_goals_priority ON saving_goals(priority);


-- ╔════════════════════════════════════════════════════════════════════════════╗
-- ║ BÖLÜM 8: ROW LEVEL SECURITY (RLS) — TÜM TABLOLAR                      ║
-- ╚════════════════════════════════════════════════════════════════════════════╝

-- Enable RLS on all tables
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE installments ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE findeks_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE findeks_score_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE assistant_context_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_obligations ENABLE ROW LEVEL SECURITY;
ALTER TABLE baskur_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_payment_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_layouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE saving_goals ENABLE ROW LEVEL SECURITY;


-- ╔════════════════════════════════════════════════════════════════════════════╗
-- ║ BÖLÜM 9: RLS POLİTİKALARI                                              ║
-- ╚════════════════════════════════════════════════════════════════════════════╝

-- ── Accounts ────────────────────────────────────────────────────────
CREATE POLICY "Users can view own accounts"
  ON accounts FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own accounts"
  ON accounts FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own accounts"
  ON accounts FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own accounts"
  ON accounts FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- ── Transactions (via account owner) ────────────────────────────────
CREATE POLICY "Users can view own transactions"
  ON transactions FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM accounts WHERE accounts.id = transactions.account_id AND accounts.user_id = auth.uid()
  ));

CREATE POLICY "Users can create transactions"
  ON transactions FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM accounts WHERE accounts.id = account_id AND accounts.user_id = auth.uid()
  ));

CREATE POLICY "Users can update own transactions"
  ON transactions FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM accounts WHERE accounts.id = account_id AND accounts.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM accounts WHERE accounts.id = account_id AND accounts.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete own transactions"
  ON transactions FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM accounts WHERE accounts.id = account_id AND accounts.user_id = auth.uid()
  ));

-- ── Debts ────────────────────────────────────────────────────────────
CREATE POLICY "Users can view own debts"
  ON debts FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users can create own debts"
  ON debts FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own debts"
  ON debts FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own debts"
  ON debts FOR DELETE TO authenticated USING (user_id = auth.uid());

-- ── Installments ────────────────────────────────────────────────────
CREATE POLICY "Users can view own installments"
  ON installments FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users can create own installments"
  ON installments FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own installments"
  ON installments FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own installments"
  ON installments FOR DELETE TO authenticated USING (user_id = auth.uid());

-- ── Financial Scores ────────────────────────────────────────────────
CREATE POLICY "Users can view own scores"
  ON financial_scores FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users can create own scores"
  ON financial_scores FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own scores"
  ON financial_scores FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ── Categories ──────────────────────────────────────────────────────
CREATE POLICY "Users can view own categories"
  ON categories FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own categories"
  ON categories FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own categories"
  ON categories FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own categories"
  ON categories FOR DELETE TO authenticated
  USING (auth.uid() = user_id AND is_default = false);

-- ── Findeks Reports ─────────────────────────────────────────────────
CREATE POLICY "Users can view own Findeks reports"
  ON findeks_reports FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own Findeks reports"
  ON findeks_reports FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own Findeks reports"
  ON findeks_reports FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── Findeks Score History ───────────────────────────────────────────
CREATE POLICY "Users can view own score history"
  ON findeks_score_history FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "System can insert score history"
  ON findeks_score_history FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- ── Chat Sessions ───────────────────────────────────────────────────
CREATE POLICY "Users can view own chat sessions"
  ON chat_sessions FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can create own chat sessions"
  ON chat_sessions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own chat sessions"
  ON chat_sessions FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── Chat Messages ───────────────────────────────────────────────────
CREATE POLICY "Users can view own chat messages"
  ON chat_messages FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own chat messages"
  ON chat_messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- ── Assistant Context Cache ─────────────────────────────────────────
CREATE POLICY "Users can view own context cache"
  ON assistant_context_cache FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can upsert own context cache"
  ON assistant_context_cache FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own context cache"
  ON assistant_context_cache FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── Tax Obligations ─────────────────────────────────────────────────
CREATE POLICY "Users can view own tax obligations"
  ON tax_obligations FOR SELECT TO authenticated
  USING (user_id IS NULL OR auth.uid() = user_id);

CREATE POLICY "Users can insert own tax obligations"
  ON tax_obligations FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can update own tax obligations"
  ON tax_obligations FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── Bağkur Profiles ─────────────────────────────────────────────────
CREATE POLICY "Users can view own Bağkur profile"
  ON baskur_profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can upsert own Bağkur profile"
  ON baskur_profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own Bağkur profile"
  ON baskur_profiles FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── Tax Payment History ─────────────────────────────────────────────
CREATE POLICY "Users can view own tax payment history"
  ON tax_payment_history FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tax payment history"
  ON tax_payment_history FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- ── Dashboard Layouts ───────────────────────────────────────────────
CREATE POLICY "Users can view own dashboard layout"
  ON dashboard_layouts FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can upsert own dashboard layout"
  ON dashboard_layouts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own dashboard layout"
  ON dashboard_layouts FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── Saving Goals ────────────────────────────────────────────────────
CREATE POLICY "Users can view own goals"
  ON saving_goals FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own goals"
  ON saving_goals FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own goals"
  ON saving_goals FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own goals"
  ON saving_goals FOR DELETE USING (auth.uid() = user_id);


-- ═══════════════════════════════════════════════════════════════════════════════
-- ✅ TAMAMLANDI — 16 tablo, 4 enum tip, 50+ RLS politikası, 20+ index
-- ═══════════════════════════════════════════════════════════════════════════════
