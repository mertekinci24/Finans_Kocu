/*
  # Phase 7.2F — attachment_parse_results: Constraint & RLS Hardening
  
  Bu migration, attachment_parse_results tablosunun zaten mevcut olduğunu varsayar.
  Tablo Supabase Dashboard üzerinden oluşturulmuştur.
  
  Bu dosya aşağıdaki eksikleri tamamlar:
  1. UNIQUE(user_id, path) constraint — Edge Function upsert onConflict için zorunlu
  2. RLS etkinleştirme
  3. SELECT policy — kullanıcı sadece kendi sonuçlarını görebilir
  4. INSERT policy — Edge Function service_role ile yazar, ama güvenlik katmanı olarak eklenir
  5. Performans indeksleri
*/

-- 1. Unique constraint for upsert onConflict: 'user_id,path'
CREATE UNIQUE INDEX IF NOT EXISTS attachment_parse_results_user_path_uidx
  ON attachment_parse_results(user_id, path);

-- 2. Enable RLS
ALTER TABLE attachment_parse_results ENABLE ROW LEVEL SECURITY;

-- 3. SELECT policy — kullanıcı sadece kendi parse sonuçlarını görebilir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'attachment_parse_results' 
    AND policyname = 'Users can view own parse results'
  ) THEN
    CREATE POLICY "Users can view own parse results"
      ON attachment_parse_results
      FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- 4. INSERT policy — authenticated kullanıcılar kendi user_id'leri ile insert yapabilir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'attachment_parse_results' 
    AND policyname = 'Users can insert own parse results'
  ) THEN
    CREATE POLICY "Users can insert own parse results"
      ON attachment_parse_results
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- 5. UPDATE policy — kullanıcı kendi sonuçlarını güncelleyebilir (status polling için gerekli değil ama savunma katmanı)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'attachment_parse_results' 
    AND policyname = 'Users can update own parse results'
  ) THEN
    CREATE POLICY "Users can update own parse results"
      ON attachment_parse_results
      FOR UPDATE
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- 6. Performance indexes for polling queries
CREATE INDEX IF NOT EXISTS idx_attachment_parse_user_status
  ON attachment_parse_results(user_id, status);

CREATE INDEX IF NOT EXISTS idx_attachment_parse_user_filename_created
  ON attachment_parse_results(user_id, file_name, created_at DESC);
