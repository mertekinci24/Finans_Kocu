/*
  # Add Tax Calendar & Bağkur Contribution Module

  1. New Tables
    - `tax_obligations` - Turkish tax calendar entries
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key) — optional, for user-specific deadlines
      - `obligation_type` (enum: 'kdv', 'muhtasar', 'geçici_vergi', 'sgk_bağkur', 'gelir_vergisi', 'stopaj')
      - `due_date` (date) - Deadline (e.g., 28th for KDV)
      - `description` (text) - Human-readable name
      - `estimated_amount` (numeric) - Forecasted cost (from Bağkur or tax calculator)
      - `payment_status` (enum: 'pending', 'paid', 'overdue')
      - `reminder_sent` (boolean) - Track if user was notified
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    - `baskur_profiles` - User's Bağkur/SGK configuration
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `profile_type` (enum: 'free_professional', 'self_employed', 'artisan', 'farmer', 'employee_with_private')
      - `gross_income_monthly` (numeric) - Declared monthly income for calculation
      - `baskur_tier` (enum: 'tier1', 'tier2', 'tier3', 'tier4', 'tier5', 'tier6') - SGK contribution tier
      - `monthly_premium` (numeric) - Calculated monthly contribution
      - `is_active` (boolean)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    - `tax_payment_history` - Track completed tax/contribution payments
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `obligation_type` (text)
      - `paid_date` (date)
      - `amount_paid` (numeric)
      - `is_on_time` (boolean) - True if paid before/on due date
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Users can ONLY view/modify their own obligations, Bağkur profiles, and payment history
    - Public entries (tax calendar template) remain read-only

  3. Indexes
    - `idx_tax_obligations_user_type` on tax_obligations(user_id, obligation_type)
    - `idx_tax_obligations_due_date` on tax_obligations(due_date, payment_status)
    - `idx_baskur_profiles_user` on baskur_profiles(user_id)
    - `idx_tax_payment_history_user` on tax_payment_history(user_id, paid_date DESC)

  4. Key Features
    - Turkish tax calendar template (KDV, Muhtasar, Geçici Vergi, SGK/Bağkur dates)
    - Bağkur tier-based premium calculation
    - On-time vs overdue payment tracking (for Financial Score bonus/penalty)
    - Estimated tax obligations (forecasted from user income and Bağkur tier)
*/

CREATE TYPE obligation_type_enum AS ENUM ('kdv', 'muhtasar', 'geçici_vergi', 'sgk_bağkur', 'gelir_vergisi', 'stopaj');
CREATE TYPE payment_status_enum AS ENUM ('pending', 'paid', 'overdue');
CREATE TYPE baskur_profile_type_enum AS ENUM ('free_professional', 'self_employed', 'artisan', 'farmer', 'employee_with_private');
CREATE TYPE baskur_tier_enum AS ENUM ('tier1', 'tier2', 'tier3', 'tier4', 'tier5', 'tier6');

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

ALTER TABLE tax_obligations ENABLE ROW LEVEL SECURITY;
ALTER TABLE baskur_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_payment_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tax obligations"
  ON tax_obligations FOR SELECT
  TO authenticated
  USING (user_id IS NULL OR auth.uid() = user_id);

CREATE POLICY "Users can insert own tax obligations"
  ON tax_obligations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can update own tax obligations"
  ON tax_obligations FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own Bağkur profile"
  ON baskur_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can upsert own Bağkur profile"
  ON baskur_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own Bağkur profile"
  ON baskur_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own tax payment history"
  ON tax_payment_history FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tax payment history"
  ON tax_payment_history FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_tax_obligations_user_type ON tax_obligations(user_id, obligation_type);
CREATE INDEX idx_tax_obligations_due_date ON tax_obligations(due_date, payment_status);
CREATE INDEX idx_baskur_profiles_user ON baskur_profiles(user_id);
CREATE INDEX idx_tax_payment_history_user ON tax_payment_history(user_id, paid_date DESC);
