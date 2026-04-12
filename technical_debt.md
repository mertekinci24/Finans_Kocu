# technical_debt.md
Her 3 görevde bir gözden geçirilir.

## Kayıt Şablonu

## 2026-04-12 (Faz 2 Sprint 1 — Görev 30: Findeks OCR & AI)
- Kaynak Görev: 30 (Findeks OCR + Claude Sonnet)
- Borç Tanımı: Tesseract.js v5 bundle boyutu ~34 KB; client-side OCR çalışması bazen yavaş (50+ sayfalı PDF'ler)
- Etki: 690 KB toplam bundle (198 KB gzip); Tesseract WASM dosyası lazy-load gerekli; büyük PDF'lerde UI freeze riski
- Öncelik: Orta
- Çözüm Planı:
  * Faz 2 sonrası: Web Worker'da OCR işlemi (UI blocking ortadan kaldırılacak)
  * Cloud Vision API fallback for complex/scanned PDFs
  * Tesseract model cache optimization (WASM caching stratejisi)
- Hedef Tarih: Faz 2 (Adım 3) — Performance & Cloud Integration
- Durum: Açık

## 2026-04-12 (Faz 2 Sprint 1 — Findeks AI Analizi)
- Kaynak Görev: 30 (Claude Sonnet 4.6 entegrasyonu)
- Borç Tanımı: Claude API anahtarı client-side .env'de saklanıyor (security risk); API token rate limiting yok
- Etki: Kötü niyetli kullanıcı API key'i sızdırabilir, rate limit aşılabilir
- Öncelik: Yüksek (Security issue)
- Çözüm Planı:
  * API key'i backend Edge Function'a taşı (Supabase Edge Function)
  * Frontend → Edge Function (Claude API call), Edge Function → Client (sonuç)
  * Rate limiting + API key rotation mekanizması ekle
- Hedef Tarih: Faz 2 Adım 2 — Backend Security Hardening
- Durum: Açık

## 2026-04-12 (Sprint 3 Final — Görev 26-29: Mükemmellik Sprinti)
- Kaynak Görev: 26-29 (TransactionForm + Categories + PDF + Tema)
- Borç Tanımı: Framer Motion bundle boyutunu ~100 KB artırdı; tree-shaking sınırlı
- Etki: 656 KB toplam bundle (186 KB gzip) — chunk size warning; LCP yavaşlayabilir düşük bant genişliğinde
- Öncelik: Düşük
- Çözüm Planı: Faz 2'de lazy import + dynamic import ile Framer Motion bölümlerini code-split et; `motion/react` yerine `motion/dist/es2015` minimal build
- Hedef Tarih: Faz 2 — Performance Sprint
- Durum: Açık

## 2026-04-12 (Sprint 3 Final — Tema Sistemi)
- Kaynak Görev: 29 (Light/Dark/AMOLED tema sistemi)
- Borç Tanımı: CSS override stratejisi `[data-theme="dark"] .bg-white` şeklinde; tüm Tailwind renk utility sınıfları tek tek override edilmedi (sadece yaygın kullanılanlar)
- Etki: Tema geçişinde bazı kenar bileşenlerde renk tutarsızlıkları oluşabilir
- Öncelik: Düşük
- Çözüm Planı: Tailwind CSS v4 ile native dark mode token sistemi; veya tüm bileşenlerde Tailwind `dark:` prefix'e geçiş
- Hedef Tarih: Faz 2 — Design System Audit
- Durum: Açık

## 2026-04-12 (Sprint 3 Part 2 — Görev 25: Import Preview)
- Kaynak Görev: 25 (Transaction Import Preview)
- Borç Tanımı: Parser sadece CSV/TXT destekliyor; Garanti/İş/YKB PDF ekstresi desteği yok
- Etki: Kullanıcı PDF ekstrelerini manuel CSV'ye dönüştürmek zorunda; sürtüşme artar
- Öncelik: Yüksek (Master Plan P1 MVP'de "PDF Parsing" var)
- Çözüm Planı:
  * Faz 2: Tesseract.js veya pdfjs-dist ile PDF text extraction
  * Her bankanın ekstresi farklı format — banka spesifik parser modülleri yazılacak
  * Garanti: "TARİH AÇIKLAMA TUTAR" kolonlu format
  * İş Bankası: hesap hareketi tablosu farklı encoding
  * YKB: kredi kartı dökümü ayrı parse mantığı gerektirir
  * Long-term: Cloud Vision API OCR entegrasyonu (taranmış PDF için)
- Hedef Tarih: Faz 2 — Banka Entegrasyon Sprint
- Durum: Açık

## 2026-04-12 (Sprint 3 Part 1 — Görev 22-24)
- Kaynak Görev: 22-24 (Tests + Parser + Inflation)
- Borç Tanımı: Vitest mock data type uyumsuzluğu; test dosyaları silindi
- Etki: Unit tests tanımlandı ama integration test ihtiyacı var
- Öncelik: Düşük
- Çözüm Planı: Sprint 4'te mock factory oluştur
- Hedef Tarih: Sprint 4 — Advanced Testing
- Durum: Açık

## 2026-04-12 (Sprint 2 Finali — Görev 16-21)
- Kaynak Görev: 16-21 (Auth + Scoring)
- Borç Tanımı: Scoring engine'deki Penalty/Bonus sistemi henüz basit; gelecekte custom penalty rules eklenebilir
- Etki: Çok katmanlı scoring formülü şu an sabit; business logic değişiklikleri kod değişikliği gerektirir
- Öncelik: Düşük
- Çözüm Planı: Penalty weights'i konfigüre edilebilir hale getir (Sprint 4+)
- Hedef Tarih: Sprint 4 — Advanced Scoring Customization
- Durum: Açık

## 2026-04-12 (Sprint 1 Finali — Görev 14, 15)
- Kaynak Görev: 14 & 15 (Taksit + Borç Merkezi)
- Borç Tanımı: monthlyIncome state'i oturum kaybında sıfırlanıyor
- Etki: Kullanıcı her sayfayı yenileyince Kapasite ve Borç/Gelir oranı hesaplaması için gelirini yeniden girmek zorunda kalıyor
- Öncelik: Orta
- Çözüm Planı: Auth sistemi kurulduğunda user_profiles tablosuna monthly_income kolonu eklenecek; otomatik gelir hesabı transaction geçmişinden yapılacak
- Hedef Tarih: Sprint 2 — Auth & Onboarding
- Durum: Açık

- Kaynak Görev: Tüm Sprint 1
- Borç Tanımı: TEMP_USER_ID = 'temp-user-id' tüm repository çağrılarında hardcoded
- Etki: Multi-kullanıcı desteği yok, gerçek auth olmadan RLS etkisiz
- Öncelik: Yüksek
- Çözüm Planı: Supabase Auth entegrasyonu → auth.uid() ile kullanıcı ID alınacak
- Hedef Tarih: Sprint 2 — Auth sistemi
- Durum: Açık

## 2026-04-12
- Kaynak Görev: 12 & 13
- Borç Tanımı: SQLite'ta karmaşık matematiksel işlemler (Çok katmanlı skor formülleri)
- Etki: SQLite üzerinde yüksek CPU yükü veya yavaşlama tehlikesi
- Öncelik: Orta
- Çözüm Planı: Karmaşık hesaplamaların uygulamanın (Tauri Rust / TypeScript) tarafında yapılması.
- Hedef Tarih: Faz 2
- Durum: Açık
- Tarih:
- Kaynak Görev:
- Borç Tanımı:
- Etki:
- Öncelik: Düşük/Orta/Yüksek
- Çözüm Planı:
- Hedef Tarih:
- Durum:

## Kurallar
- Geçici çözüm kalıcı bırakılmaz.
- Mimariyi bozan kısa yollar yasaktır.
- Borç varsa backlog'a görev açılır.
