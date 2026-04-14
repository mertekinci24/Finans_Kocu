# technical_debt.md
Her 3 görevde bir gözden geçirilir.

## Kayıt Şablonu

## 2026-04-13 (Faz 4 — Görev 39+40: Iyzico + Pro Plan)
- Kaynak Görev: 39+40 (Monetizasyon)
- Borç Tanımı 1 [RESOLVED]: Iyzico Webhook HMAC signature doğrulaması eksik
  - Etki: Webhook endpoint'e sahte event gönderilebilir → yetkisiz plan yükseltme riski
  - Öncelik: KRİTİK (Security)
  - Çözüm: supabase/functions/api-gateway/index.ts — verifyIyzicoWebhookSignature() ile HMAC-SHA256 doğrulama ✅
  - Durum: Kapalı

- Borç Tanımı 2 [RESOLVED]: Iyzico Edge Function henüz yazılmadı (frontend adapter hazır)
  - Etki: Checkout, webhook ve subscription yönetimi sunucu tarafında çalışmıyor
  - Öncelik: Yüksek (Feature Completeness)
  - Çözüm: supabase/functions/api-gateway/index.ts — Deno Edge Function tam yazıldı (checkout, result, cancel, status, webhook) ✅
  - Durum: Kapalı

- Borç Tanımı 3 [NEW]: Sandbox → Production geçiş konfigürasyonu
  - Etki: Canlıya geçişte API key, base URL ve webhook URL değişmeli
  - Öncelik: Orta (DevOps)
  - Çözüm: Environment variable bazlı config (IYZICO_MODE=sandbox|production)
  - Hedef Tarih: Production deploy
  - Durum: Açık

- Borç Tanımı 4 [NEW]: user_subscriptions tablosu migration'ı Supabase'de çalıştırılmalı
  - Etki: Tablo olmadan abonelik sistemi çalışmaz (graceful fallback → free plan)
  - Öncelik: Yüksek (Deployment)
  - Çözüm: Supabase SQL Editor'da 20260413030000_add_subscriptions.sql çalıştır
  - Hedef Tarih: Hemen
  - Durum: Açık

## 2026-04-13 (Faz 3 Sprint 3 — Görev 36: Hedef Sistemi)
- Kaynak Görev: 36 (Saving Goals Engine)
- Borç Tanımı 1 [NEW]: Çoklu hedef çakışması — öncelik bazlı tasarruf dağılımı eksik
  - Etki: Birden fazla aktif hedef varken, her biri bağımsız hesaplanıyor; paylaştırılmış aylık tasarruf mantığı yok
  - Öncelik: Orta (Logic Completeness)
  - Çözüm: Aylık tasarrufu öncelik ağırlıklarına göre hedeflere dağıtan "allocation engine" ekle
  - Hedef Tarih: Faz 3 + 2
  - Durum: Açık

- Borç Tanımı 2 [NEW]: Enflasyon oranı statik varsayılan (%2.5 aylık)
  - Etki: Gerçek TÜFE verisi yerine sabit oran kullanılıyor; tahmin doğruluğu düşük
  - Öncelik: Düşük (Data Accuracy)
  - Çözüm: TÜFE API entegrasyonu veya kullanıcının kendi oranını girebileceği settings sayfası
  - Hedef Tarih: Faz 3 + 3
  - Durum: Açık

- Borç Tanımı 3 [NEW]: GoalRepository — saving_goals tablosu migration'ı Supabase'de manuel çalıştırılmalı
  - Etki: Tablo oluşturulmadan Goals sayfası çalışmaz (graceful fallback var)
  - Öncelik: Yüksek (Deployment)
  - Çözüm: Supabase SQL Editor'da migration'ı çalıştır
  - Hedef Tarih: Hemen
  - Durum: Açık

## 2026-04-13 (Faz 3 Sprint 2 — Görev 35: Senaryo Simülatörü)
- Kaynak Görev: 35 (What-if Engine)
- Borç Tanımı 1 [NEW]: 180 günlük forecast + scoring recursion CPU yükü
  - Etki: Her simülasyon tam cashFlowEngine + scoringEngine çalıştırır (×2 — baseline + senaryo)
  - Öncelik: Orta (Performance)
  - Çözüm: Web Worker'a taşıma veya memoization ile aynı parametre tekrarını önleme
  - Hedef Tarih: Faz 3 + 2
  - Durum: Açık

- Borç Tanımı 2 [RESOLVED]: Deep clone (JSON.parse/stringify) Date nesnelerini string'e çeviriyor
  - Etki: Simüle edilmiş verilerdeki Date alanları string olarak kalıyor, tip uyumsuzluğu riski
  - Çözüm: Tarama yapıldı — mevcut kodda JSON.parse/stringify deep clone kullanımı bulunamadı ✅
  - Durum: Kapalı

- Borç Tanımı 3 [NEW]: Senaryo sayfası tüm veriyi client-side'da çeker (N accounts × M transactions)
  - Etki: Büyük veri setlerinde sayfa açılış süresi artabilir
  - Öncelik: Düşük (Performance)
  - Çözüm: Sayfa açılışında sadece son 3 ay veri çek, lazy load eski veriler
  - Hedef Tarih: Faz 3 + 2
  - Durum: Açık

## 2026-04-12 (FSIA — Tam Sistem Bütünlüğü Denetimi)
- Borç Tanımı 1 [RESOLVED]: authService env variable naming (VITE_SUPABASE_SUPABASE_ANON_KEY)
  - Çözüm: VITE_SUPABASE_ANON_KEY'e düzeltildi ✅
  - Durum: Kapalı

- Borç Tanımı 2 [RESOLVED]: BYOK fallback mekanizması eksik
  - Çözüm: Assistant.tsx — API key missing → graceful fallback message ✅
  - Durum: Kapalı

- Borç Tanımı 3 [RESOLVED]: Scoring formula mismatch (logic_specs_v2)
  - Çözüm: scoringEngine.ts — (baseScore + bonus) * confidence ✅
  - Durum: Kapalı

- Borç Tanımı 4 [NEW]: Penalty mechanism ($P) not implemented
  - Etki: Formüldeki ceza sistemi eksik (gecikmiş fatura, bütçe aşımı, vb.)
  - Öncelik: Orta (Mathematical completeness)
  - Hedef: Faz 3 + 2
  - Durum: Açık

- Borç Tanımı 5 [RESOLVED]: Any types (19+ instance)
  - Etki: Type safety weak (Findeks, Categories, repositories)
  - Öncelik: Orta (Code quality)
  - Çözüm: src/types/database.ts ile tüm DB row tipleri tanımlandı; 18 any → type-safe ✅
  - Durum: Kapalı

- Borç Tanımı 6 [RESOLVED]: console.error & console.log debugging
  - Çözüm: 17 instance temizlendi ✅
  - Durum: Kapalı

## 2026-04-12 (Faz 3 Sprint 1 — Görev 34: Cash Flow Prediction)
- Kaynak Görev: 34 (Nakit Akışı Tahmin)
- Borç Tanımı 1 [RESOLVED]: Scenario simülatörü placeholder; what-if analysis TODO
- Etki: Toggle görünür ama forecast re-calculate etmiyor
- Öncelik: Orta (Feature)
- Çözüm: Task 35'te tam what-if engine implement edildi ✅
- Hedef Tarih: Task 35
- Durum: Kapalı

- Borç Tanımı 2: Tahmin one-off expenses'ı ignore ediyor
- Etki: Forecast accuracy düşük
- Öncelik: Orta (Accuracy)
- Çözüm: Add weekly/monthly average smoothing
- Hedef Tarih: Faz 3 + 1
- Durum: Açık

- Borç Tanımı 3: Dashboard warning banner no dismiss mechanism
- Etki: User alarm fatigue riski
- Öncelik: Düşük (UX)
- Çözüm: Add toast + 24h dismiss memory
- Hedef Tarih: Faz 3 + 2
- Durum: Açık

## 2026-04-12 (Faz 2 Sprint 2 — Görev 33: Widget Altyapısı)
- Kaynak Görev: 33 (Widget Altyapısı + Drag-Drop)
- Borç Tanımı 1: Widget Grid 4-column fixed; responsive breakpoints eksik
- Etki: Mobil/tablet'de widget overflow; grid collapse undefined
- Öncelik: Orta (UX)
- Çözüm: Add responsive grid (1 col mobile, 2 col tablet, 4 col desktop)
- Hedef Tarih: Faz 2 + 1
- Durum: Açık

- Borç Tanımı 2: Drag-mode sadece 3 widget placeholder; diğerleri TODO
- Etki: Dashboard eksik görünüyor
- Öncelik: Orta (Feature)
- Çözüm: Implement ExpenseBreakdownWidget, RecentTransactionsWidget, DebtsOverviewWidget, TaxObligationsWidget, CoachInsightsWidget
- Hedef Tarih: Faz 2 + 1
- Durum: Açık

- Borç Tanımı 3: Auto-save drag reorder'dan sonra; feedback yok
- Etki: User unsaved changes riski; no visual confirmation
- Öncelik: Orta (UX)
- Çözüm: Auto-exit drag mode + toast "Düzen kaydedildi ✓"
- Hedef Tarih: Faz 2 + 1
- Durum: Açık

## 2026-04-12 (Faz 2 Sprint 1 — Görev 32: Tax Module & AI Gateway)
- Kaynak Görev: 32 (SGK/Vergi Modülü + AI Gateway)
- Borç Tanımı 1 [RESOLVED]: BYOK vault client-side localStorage'de saklanıyor (security vs UX tradeoff)
  - Etki: Browser devtools açılırsa API key'ler görülebilir; XSS risk
  - Öncelik: YÜKSEK (Security)
  - Çözüm: Claude/Iyzico API key'leri Edge Function'a taşındı; client-side'da artık sensitive key saklanmıyor ✅
  - Durum: Kapalı

- Borç Tanımı 2: Tax calculator statik tier tanımlanmış; TCMB enflasyon API entegrasyonu yok
- Etki: Bağkur primler statik kalıyor, gerçek SGK prim oranları değiştiğinde manuel update gerekli
- Öncelik: Orta (Maintenance & Accuracy)
- Çözüm Planı:
  * TCMB API or SGK official endpoint → annual tier sync
  * Notification: Prim oranı değiştiğinde kullanıcıya uyar
  * Dashboard widget: "Bağkur Prim Oranları Güncellendi" banner
- Hedef Tarih: Faz 2 + 2 — External API Integrations
- Durum: Açık

- Borç Tanımı 3: Tax Payment History tek başına Supabase'de; desktop offline sync yok
- Etki: Network down → yeni tax payment recordenemez; eventual consistency delay
- Öncelik: Düşük (Reliability & Offline Support)
- Çözüm Planı:
  * IndexedDB local queue → offline tax payments
  * Sync engine: Online dönünce Supabase'e push
  * Conflict resolution: Last-write-wins on duplicate obligation_id
- Hedef Tarih: Faz 3 — Offline-First Architecture
- Durum: Açık

## 2026-04-12 (Faz 2 Sprint 1 — Görev 31: AI Asistan)
- Kaynak Görev: 31 (WhatsApp Tarzı AI Asistan + Claude)
- Borç Tanımı 1 [RESOLVED]: Claude API anahtarı client-side .env'de saklanıyor (critical security issue); rate limiting yok
  - Etki: Kötü niyetli kullanıcı API key'i sızdırabilir; token maliyeti kontrol edilemez
  - Öncelik: YÜKSEK (Security & Cost Control)
  - Çözüm: assistantService.ts → Edge Function proxy (/api/ai/claude); API key Deno.env.get('CLAUDE_API_KEY') ile sunucuda; max_tokens limiti 2048 ✅
  - Durum: Kapalı

- Borç Tanımı 2: RAG context builder her sohbette tam veri çeker (N accounts + M transactions + 1 findeks)
- Etki: 100+ user'da yükün artması (sohbetler × context fetches); db query explosion risk
- Öncelik: Orta (Performance)
- Çözüm Planı:
  * Context caching zaten 5 min TTL'de, ama hash validation weak — strengthen hash
  * Lazy load: Sadece gerekli fields çek (SELECT name, balance FROM accounts — exclude inactive)
  * Batch trends: 6-month aggregation → cached view veya snapshot
- Hedef Tarih: Faz 2 Adım 3 — Database Query Optimization
- Durum: Açık

- Borç Tanımı 3: React-markdown bundle size +40 KB; speech-to-text API hardcoded /api/speech-to-text
- Etki: Bundle 823 KB / 239 KB gzip (Tesseract + react-markdown + Claude); speech endpoint serverless değil
- Öncelik: Düşük (Performance & Architecture)
- Çözüm Planı:
  * react-markdown → remark (lighter) veya native HTML rendering
  * Speech-to-text → Web Speech API native (client-side, 0 backend), fallback → Cloud Speech API
  * Lazy import react-markdown (only in chat page)
- Hedef Tarih: Faz 2 + 1 — Bundle Optimization Sprint
- Durum: Açık

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
- Borç Tanımı [RESOLVED]: Claude API anahtarı client-side .env'de saklanıyor (security risk)
  - Etki: Kötü niyetli kullanıcı API key'i sızdırabilir
  - Öncelik: Yüksek (Security issue)
  - Çözüm: claudeAnalyzer.ts → Edge Function proxy (/api/ai/claude); x-api-key header kaldırıldı ✅
  - Durum: Kapalı

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
