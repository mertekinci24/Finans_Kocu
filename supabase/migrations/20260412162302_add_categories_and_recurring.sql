/*
  # Categories System + Recurring Transactions

  ## Summary
  Adds two features required for Sprint 3 "Mükemmellik" tasks:

  1. **categories table** — User-defined spending categories with budget tracking
     - Each user can create custom categories (seeded with 11 defaults on first load)
     - `monthly_budget`: optional spending cap per category
     - `type`: gelir / gider / ikisi_de
     - `color`: hex color for UI display
     - `is_default`: system defaults cannot be deleted

  2. **transactions.recurring** — Marks a transaction as recurring
     - Values: none | daily | weekly | monthly | yearly
     - Default: none (no change to existing data)

  ## Security
  - RLS enabled on categories with per-user isolation
  - transactions table already has RLS; no new policies needed for the new column
*/

CREATE TABLE IF NOT EXISTS categories (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name        text        NOT NULL,
  color       text        NOT NULL DEFAULT '#6b7280',
  icon        text,
  monthly_budget numeric(14,2),
  type        text        NOT NULL DEFAULT 'gider'
                          CHECK (type IN ('gelir', 'gider', 'ikisi_de')),
  is_default  boolean     NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own categories"
  ON categories FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own categories"
  ON categories FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own categories"
  ON categories FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own categories"
  ON categories FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id AND is_default = false);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transactions' AND column_name = 'recurring'
  ) THEN
    ALTER TABLE transactions
      ADD COLUMN recurring text NOT NULL DEFAULT 'none'
        CHECK (recurring IN ('none', 'daily', 'weekly', 'monthly', 'yearly'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_recurring ON transactions(recurring) WHERE recurring != 'none';
