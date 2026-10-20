/*
# Fix RLS performance, missing FK indexes, and duplicate policies

## Plain-English summary
This migration resolves three classes of database advisor findings:

1. **Unindexed foreign keys (performance)**
   - `chat_messages.user_id` (FK `chat_messages_user_id_fkey`) had no covering index.
   - `findeks_score_history.report_id` (FK `findeks_score_history_report_id_fkey`) had no covering index.
   Two new indexes are added so joins/lookups on these FK columns are fast.

2. **Auth RLS initialization plan (performance)**
   Every row-level security policy on every table referenced `auth.uid()` directly.
   Postgres re-evaluates a bare `auth.uid()` call once per row. Wrapping it as
   `(select auth.uid())` turns it into an init-time scalar that is evaluated once
   per query and cached, which is the documented Supabase optimization.
   All policies are dropped and recreated with the `(select auth.uid())` form.
   Predicates, roles, and ownership checks are unchanged — only the call form changes.

3. **Multiple permissive policies (correctness/performance)**
   - `financial_scores` had two complete sets of CRUD policies (old "own scores" +
     newer "own financial score"). The older redundant set is dropped.
   - `transactions` had duplicate SELECT and INSERT policies. One of each is dropped.

## Important notes
- No tables, columns, or data are dropped or altered. Only indexes and policies.
- The "unused index" advisor findings are intentionally NOT addressed here: those
  indexes back the RLS `user_id` ownership predicates and the unused flag reflects
  a quiet development database. Dropping them would risk production performance.
- All policy re-creations are idempotent (DROP IF EXISTS before CREATE).
*/

-- ============================================================
-- 1. Missing covering indexes for foreign keys
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id
  ON chat_messages(user_id);

CREATE INDEX IF NOT EXISTS idx_findeks_score_history_report_id
  ON findeks_score_history(report_id);

-- ============================================================
-- 2. Drop duplicate permissive policies
-- ============================================================

-- financial_scores: keep "own financial score" set, drop older "own scores" set
DROP POLICY IF EXISTS "Users can create own scores" ON financial_scores;
DROP POLICY IF EXISTS "Users can view own scores"   ON financial_scores;
DROP POLICY IF EXISTS "Users can update own scores" ON financial_scores;

-- transactions: keep "own account" descriptive variants, drop generic duplicates
DROP POLICY IF EXISTS "Users can create transactions in own accounts" ON transactions;
DROP POLICY IF EXISTS "Users can view own transactions"               ON transactions;

-- ============================================================
-- 3. Recreate all policies with (select auth.uid()) cached form
-- ============================================================

-- ---------- accounts ----------
DROP POLICY IF EXISTS "Users can view own accounts"   ON accounts;
DROP POLICY IF EXISTS "Users can create own accounts" ON accounts;
DROP POLICY IF EXISTS "Users can update own accounts" ON accounts;
DROP POLICY IF EXISTS "Users can delete own accounts" ON accounts;

CREATE POLICY "Users can view own accounts" ON accounts
  FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can create own accounts" ON accounts
  FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own accounts" ON accounts
  FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own accounts" ON accounts
  FOR DELETE TO authenticated
  USING ((select auth.uid()) = user_id);

-- ---------- transactions ----------
DROP POLICY IF EXISTS "Users can view own account transactions" ON transactions;
DROP POLICY IF EXISTS "Users can create transactions"           ON transactions;
DROP POLICY IF EXISTS "Users can update own transactions"       ON transactions;
DROP POLICY IF EXISTS "Users can delete own transactions"       ON transactions;

CREATE POLICY "Users can view own account transactions" ON transactions
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM accounts
    WHERE accounts.id = transactions.account_id
      AND accounts.user_id = (select auth.uid())
  ));

CREATE POLICY "Users can create transactions" ON transactions
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM accounts
    WHERE accounts.id = transactions.account_id
      AND accounts.user_id = (select auth.uid())
  ));

CREATE POLICY "Users can update own transactions" ON transactions
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM accounts
    WHERE accounts.id = transactions.account_id
      AND accounts.user_id = (select auth.uid())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM accounts
    WHERE accounts.id = transactions.account_id
      AND accounts.user_id = (select auth.uid())
  ));

CREATE POLICY "Users can delete own transactions" ON transactions
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM accounts
    WHERE accounts.id = transactions.account_id
      AND accounts.user_id = (select auth.uid())
  ));

-- ---------- debts ----------
DROP POLICY IF EXISTS "Users can view own debts"   ON debts;
DROP POLICY IF EXISTS "Users can create own debts" ON debts;
DROP POLICY IF EXISTS "Users can update own debts" ON debts;
DROP POLICY IF EXISTS "Users can delete own debts" ON debts;

CREATE POLICY "Users can view own debts" ON debts
  FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can create own debts" ON debts
  FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own debts" ON debts
  FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own debts" ON debts
  FOR DELETE TO authenticated
  USING ((select auth.uid()) = user_id);

-- ---------- installments ----------
DROP POLICY IF EXISTS "Users can view own installments"   ON installments;
DROP POLICY IF EXISTS "Users can create own installments" ON installments;
DROP POLICY IF EXISTS "Users can update own installments" ON installments;
DROP POLICY IF EXISTS "Users can delete own installments" ON installments;

CREATE POLICY "Users can view own installments" ON installments
  FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can create own installments" ON installments
  FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own installments" ON installments
  FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own installments" ON installments
  FOR DELETE TO authenticated
  USING ((select auth.uid()) = user_id);

-- ---------- financial_scores ----------
DROP POLICY IF EXISTS "Users can view own financial score"   ON financial_scores;
DROP POLICY IF EXISTS "Users can create own financial score" ON financial_scores;
DROP POLICY IF EXISTS "Users can update own financial score" ON financial_scores;

CREATE POLICY "Users can view own financial score" ON financial_scores
  FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can create own financial score" ON financial_scores
  FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own financial score" ON financial_scores
  FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- ---------- categories ----------
DROP POLICY IF EXISTS "Users can view own categories"   ON categories;
DROP POLICY IF EXISTS "Users can insert own categories" ON categories;
DROP POLICY IF EXISTS "Users can update own categories" ON categories;
DROP POLICY IF EXISTS "Users can delete own categories" ON categories;

CREATE POLICY "Users can view own categories" ON categories
  FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own categories" ON categories
  FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own categories" ON categories
  FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own categories" ON categories
  FOR DELETE TO authenticated
  USING (((select auth.uid()) = user_id) AND (is_default = false));

-- ---------- findeks_reports ----------
DROP POLICY IF EXISTS "Users can view own Findeks reports"   ON findeks_reports;
DROP POLICY IF EXISTS "Users can insert own Findeks reports" ON findeks_reports;
DROP POLICY IF EXISTS "Users can update own Findeks reports" ON findeks_reports;

CREATE POLICY "Users can view own Findeks reports" ON findeks_reports
  FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own Findeks reports" ON findeks_reports
  FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own Findeks reports" ON findeks_reports
  FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- ---------- findeks_score_history ----------
DROP POLICY IF EXISTS "Users can view own score history"   ON findeks_score_history;
DROP POLICY IF EXISTS "System can insert score history"    ON findeks_score_history;

CREATE POLICY "Users can view own score history" ON findeks_score_history
  FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "System can insert score history" ON findeks_score_history
  FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

-- ---------- chat_sessions ----------
DROP POLICY IF EXISTS "Users can view own chat sessions"   ON chat_sessions;
DROP POLICY IF EXISTS "Users can create own chat sessions" ON chat_sessions;
DROP POLICY IF EXISTS "Users can update own chat sessions" ON chat_sessions;

CREATE POLICY "Users can view own chat sessions" ON chat_sessions
  FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can create own chat sessions" ON chat_sessions
  FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own chat sessions" ON chat_sessions
  FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- ---------- chat_messages ----------
DROP POLICY IF EXISTS "Users can view own chat messages"   ON chat_messages;
DROP POLICY IF EXISTS "Users can insert own chat messages" ON chat_messages;

CREATE POLICY "Users can view own chat messages" ON chat_messages
  FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own chat messages" ON chat_messages
  FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

-- ---------- assistant_context_cache ----------
DROP POLICY IF EXISTS "Users can view own context cache"   ON assistant_context_cache;
DROP POLICY IF EXISTS "Users can upsert own context cache" ON assistant_context_cache;
DROP POLICY IF EXISTS "Users can update own context cache" ON assistant_context_cache;

CREATE POLICY "Users can view own context cache" ON assistant_context_cache
  FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can upsert own context cache" ON assistant_context_cache
  FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own context cache" ON assistant_context_cache
  FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- ---------- tax_obligations ----------
DROP POLICY IF EXISTS "Users can view own tax obligations"   ON tax_obligations;
DROP POLICY IF EXISTS "Users can insert own tax obligations" ON tax_obligations;
DROP POLICY IF EXISTS "Users can update own tax obligations" ON tax_obligations;

CREATE POLICY "Users can view own tax obligations" ON tax_obligations
  FOR SELECT TO authenticated
  USING ((user_id IS NULL) OR ((select auth.uid()) = user_id));

CREATE POLICY "Users can insert own tax obligations" ON tax_obligations
  FOR INSERT TO authenticated
  WITH CHECK (((select auth.uid()) = user_id) OR (user_id IS NULL));

CREATE POLICY "Users can update own tax obligations" ON tax_obligations
  FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- ---------- baskur_profiles ----------
DROP POLICY IF EXISTS "Users can view own Bağkur profile"   ON baskur_profiles;
DROP POLICY IF EXISTS "Users can upsert own Bağkur profile" ON baskur_profiles;
DROP POLICY IF EXISTS "Users can update own Bağkur profile" ON baskur_profiles;

CREATE POLICY "Users can view own Bağkur profile" ON baskur_profiles
  FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can upsert own Bağkur profile" ON baskur_profiles
  FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own Bağkur profile" ON baskur_profiles
  FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- ---------- tax_payment_history ----------
DROP POLICY IF EXISTS "Users can view own tax payment history"   ON tax_payment_history;
DROP POLICY IF EXISTS "Users can insert own tax payment history" ON tax_payment_history;

CREATE POLICY "Users can view own tax payment history" ON tax_payment_history
  FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own tax payment history" ON tax_payment_history
  FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

-- ---------- dashboard_layouts ----------
DROP POLICY IF EXISTS "Users can view own dashboard layout"   ON dashboard_layouts;
DROP POLICY IF EXISTS "Users can upsert own dashboard layout" ON dashboard_layouts;
DROP POLICY IF EXISTS "Users can update own dashboard layout" ON dashboard_layouts;

CREATE POLICY "Users can view own dashboard layout" ON dashboard_layouts
  FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can upsert own dashboard layout" ON dashboard_layouts
  FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own dashboard layout" ON dashboard_layouts
  FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);
