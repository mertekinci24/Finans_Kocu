# debugging.md
Hata günlüğü ve öğrenimler.

## Kayıt Şablonu

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