-- Saving Goals tablosu
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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_saving_goals_user_id ON saving_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_saving_goals_status ON saving_goals(status);
CREATE INDEX IF NOT EXISTS idx_saving_goals_priority ON saving_goals(priority);

-- RLS
ALTER TABLE saving_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own goals"
  ON saving_goals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own goals"
  ON saving_goals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own goals"
  ON saving_goals FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own goals"
  ON saving_goals FOR DELETE
  USING (auth.uid() = user_id);
