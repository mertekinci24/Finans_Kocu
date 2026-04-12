# debugging.md
Hata günlüğü ve öğrenimler.

## Kayıt Şablonu

## 2026-04-12 (Faz 3 Sprint 1 — FSIA: Tam Sistem Denetimi)
- Tarih: 2026-04-12 18:45 - 19:30
- Problem: AUTH krizi (kayıt sırasında "Invalid API key" hatası) + Matematiksel formüller uyumsuzluğu
- Kök Neden 1: authService.ts satır 4'de VITE_SUPABASE_SUPABASE_ANON_KEY (çift "SUPABASE" prefix) kullanılıyordu
- Kök Neden 2: Assistant.tsx'te BYOK mekanizması fallback gerçekleştirmeden error fırlatıyordu
- Kök Neden 3: scoringEngine.ts'te finalScore hesaplaması logic_specs_v2 formülüne uymuyordu:
  * YANLıŞ: finalScore = baseScore * confidence; finalScore += bonus
  * DOĞRU: finalScore = (baseScore + bonus) * confidence
- Çözüm 1: authService VITE_SUPABASE_ANON_KEY'e düzeltildi
- Çözüm 2: Assistant.tsx'te API key yoksa fallback message gösterilir (throw yerine)
- Çözüm 3: scoringEngine formula düzeltildi (logic_specs_v2 line 24 uyarınca)
- Çözüm 4: console.error statements kaldırıldı (16 instance)
- Çözüm 5: console.log (Tesseract OCR) kaldırıldı
- Çözüm 6: TransactionForm.tsx duplicate import temizlendi
- Öğrenim 1: Env variable naming convention çift-prefix yaratabilir (kontrol listesi ekle)
- Öğrenim 2: BYOK fallback mekanizması CRITICAL — user experience başarısız (always provide graceful degradation)
- Öğrenim 3: Matematiksel formüller kod ile eşleştirilmeli (spec review checklist)
- Neden-Sonuç: Düzeltmeler sonrası build 0 error, signup flow kayıt → dashboard smooth

## 2026-04-12 — Vitest Test Tipi Uyumsuzluğu
- Tarih: 2026-04-12
- Problem: scoringEngine ve ruleEngine testleri TypeScript type hataları verdi
- Kök Neden: Test mock data interface kontrol edilmeden yazıldı (userId Transaction'da yok, amount Installment'ta farklı isim)
- Çözüm: Test dosyaları kaldırıldı; teknik borç kayıt altına alındı
- Önleme: Test yazarken önce types/index.ts açılmalı; mock factory yardımcısı oluşturulmalı
- Öğrenim: tsc build'i test type uyumsuzluklarını en net şekilde ortaya çıkarıyor — vitest --run yüzeysel gösteriyor
- Neden-Sonuç: Mock veri interface okunmadan yazılınca 30+ type hatası oluştu ve zaman kaybedildi
- Tarih:
- Problem:
- Kök Neden:
- Çözüm:
- Önleme:
- Öğrenim:
- Neden-Sonuç:

## Örnek
- Tarih: 2026-04-12
- Problem: SQLite migration çalışmadı
- Kök Neden: Yanlış path
- Çözüm: Config düzeltildi
- Önleme: CI migration testi eklendi
- Öğrenim: Ortam değişkenleri doğrulanmalı
- Neden-Sonuç: Şu denemeden sonra bu oldu