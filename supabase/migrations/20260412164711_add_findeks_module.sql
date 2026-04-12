/*
  # Add Findeks PDF Analysis Module

  1. New Tables
    - `findeks_reports` - Stores extracted Findeks PDF data
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `file_name` (text) - Original PDF file name
      - `credit_score` (integer) - Findeks kredi skoru (1-1900)
      - `limit_usage_ratio` (numeric) - Limit kullanım oranı (%)
      - `delay_months` (integer) - Gecikmiş ay sayısı (0 = no delays)
      - `delay_history` (text) - JSON array of delay records: [{date, months_delayed}]
      - `bank_accounts` (integer) - Toplam banka hesap sayısı
      - `credit_cards` (integer) - Toplam kredi kartı sayısı
      - `active_debts` (integer) - Aktif borç sayısı
      - `banks_list` (text) - JSON array: [{name, type, status}]
      - `ai_analysis` (text) - Claude Sonnet 4.6 recommendation (Türkçe, koç tonu)
      - `action_plan` (text) - JSON: [step1, step2, step3] - Kullanıcıya özel aksiyon planı
      - `risk_level` (text) - Kategorize: 'kritik' | 'gelişim_açık' | 'dengeli' | 'güvenli' | 'prestijli'
      - `score_improvement_potential` (integer) - Tahmini puan artış potansiyeli (0-500)
      - `uploaded_at` (timestamp) - PDF yükleme zamanı
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    - `findeks_score_history` - Track score improvements over time
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `report_id` (uuid, foreign key to findeks_reports)
      - `score` (integer) - Findeks skoru bu tarihte
      - `recorded_at` (timestamp) - Ne zaman kaydedildi
      - `previous_score` (integer) - Önceki rapordaki skor (comparison için)
      - `score_change` (integer) - Skor değişim miktarı

  2. Security
    - Enable RLS on both tables
    - Users can ONLY view/insert their own Findeks reports
    - Financial score repository has update permission for automatic scoring

  3. Indexes
    - `idx_findeks_reports_user_created` on findeks_reports(user_id, created_at DESC)
    - `idx_findeks_score_history_user` on findeks_score_history(user_id, recorded_at DESC)

  4. Integration with Financial Scoring
    - When a Findeks report is uploaded, system updates:
      - Confidence Score (C) increases by +0.15 (from data completeness)
      - "Gecikme Geçmişi" (Delay History) component pulls from findeks_reports.delay_months
      - "Borç/Gelir" component gets historical context from banks_list and active_debts
*/

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

ALTER TABLE findeks_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE findeks_score_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own Findeks reports"
  ON findeks_reports FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own Findeks reports"
  ON findeks_reports FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own Findeks reports"
  ON findeks_reports FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own score history"
  ON findeks_score_history FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert score history"
  ON findeks_score_history FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_findeks_reports_user_created ON findeks_reports(user_id, created_at DESC);
CREATE INDEX idx_findeks_score_history_user ON findeks_score_history(user_id, recorded_at DESC);
