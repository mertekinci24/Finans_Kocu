# Changelog.md
Tüm değişiklikler tarih/saat ile yazılır.

## 2026-04-12 15:15
- Görev No: 31 — WhatsApp Tarzı AI Asistan (Faz 2 Sprint 1)
- Modül: Natural Language / RAG Context / Chat UI / Transaction Auto-Parsing
- Yapılan İş:
  * supabase/migrations: chat_sessions + chat_messages + assistant_context_cache tabloları (RLS + indexes)
  * src/types/index.ts — ChatSession, ChatMessage, SuggestedTransaction, AssistantContextCache interfaces
  * src/services/supabase/repositories/ChatRepository.ts — createSession, getMessages, addMessage, getUserSessions
  * src/services/assistant/ragContextBuilder.ts — buildUserContext (accounts, trends, alerts, Findeks score caching)
  * src/services/assistant/assistantService.ts — Claude Sonnet 4.6 integration + transaction auto-parsing
  * src/components/assistant/ChatInterface.tsx — WhatsApp-style chat UI (messages, voice input, "yazıyor..." animation)
  * src/components/assistant/ChatBubble.tsx — Markdown-rendered message bubbles (user/assistant roles)
  * src/components/assistant/TransactionSuggestion.tsx — AI-suggested transaction card (accept/reject)
  * src/pages/Assistant.tsx — Session management + RAG context flow + transaction save
  * src/constants/index.ts — ASSISTANT route
  * src/components/layout/Sidebar.tsx — "AI Asistan" menüsü
  * src/App.tsx — /assistant route entegrasyonu
  * react-markdown v10 eklendi (message formatting)
  * Hata Düzeltmeleri: Unused variable cleanup, TypeScript strict mode compliance
- Asistan Yetenekleri:
  - Doğal dil sohbet (Türkçe, "koç" tonu)
  - Kullanıcı verilerine dayalı RAG context (hesaplar, Findeks, trend, alerts)
  - İşlem auto-parsing ("500 TL market harcadım" → JSON öneri)
  - Sesli mesaj altyapısı (speech-to-text hazır)
  - Sohbet geçmişi + context caching (5 min TTL)
- Build: Başarılı — 823 KB (239 KB gzip), 586+ modül, 0 hata (bundle +133 KB from Task 30)
- Faz 2 Status: Sprint 1 → 2/? DONE (30, 31)

## 2026-04-12 14:45
- Görev No: 30 — Findeks OCR & AI Analiz Motoru (Faz 2 Sprint 1)
- Modül: OCR / PDF Parsing / AI Analysis / Findeks Integration
- Yapılan İş:
  * tesseract.js v5 eklendi (Türkçe OCR desteği)
  * supabase/migrations: findeks_reports + findeks_score_history tabloları (RLS + indexes)
  * src/types/index.ts — FindeksReport, ActionStep, DelayRecord, BankAccount interfaces
  * src/services/findeks/findeksOcrParser.ts — extractTextFromPDF + parseRawFindeksText + determineRiskLevel
  * src/services/findeks/claudeAnalyzer.ts — Claude Sonnet 4.6 API entegrasyonu (Türkçe tavsiye + aksiyon planı)
  * src/services/supabase/repositories/FindeksRepository.ts — createReport, getLatestReport, getReportHistory, updateReportAnalysis
  * src/pages/Findeks.tsx — 4-adım upload flow (Upload → Preview → Analysis → Result)
  * src/components/findeks/FindeksScoreScale.tsx — 5-seviye risk gösterimi (Kritik→Prestijli) + interaktif bar
  * src/components/findeks/ActionPlanCard.tsx — 3-adımlı aksiyon planı kartları (timeline + expected impact)
  * src/constants/index.ts — FINDEKS route
  * src/components/layout/Sidebar.tsx — "Findeks Analizi" menüsü
  * src/App.tsx — /findeks route entegrasyonu
  * src/services/types.ts — IFindeksRepository interface + adapter update
  * Hata Düzeltmeleri: Tesseract.js File handling, TypeScript type mappings, Turkish character normalization
- Findeks Puanlama Skalası: Kritik (🔴 1-969) → Gelişime Açık (🟠 970-1149) → Dengeli (🟡 1150-1469) → Güvenli (🔵 1470-1719) → Prestijli (🟢 1720-1900)
- Build: Başarılı — 690 KB (198 KB gzip), 586 modül, 0 hata
- MVP Status: Faz 1 → 100% (29/29), Faz 2 Sprint 1 başlatıldı

## 2026-04-12 13:30
- Görev No: 26-29 — Mükemmellik Sprinti (Sprint 3 Final)
- Modül: Tema Sistemi + Kategori + TransactionForm + PDF + CommandPalette + Micro-animations
- Yapılan İş:
  * framer-motion v11 eklendi (micro-animations)
  * supabase/migrations: categories tablosu + transactions.recurring kolonu
  * src/constants/index.ts — CATEGORIES route + DEFAULT_CATEGORIES seed data
  * src/types/index.ts — Category interface + Transaction.recurring field
  * src/stores/uiStore.ts — Theme persistence (localStorage) + commandPaletteOpen state
  * tailwind.config.js — darkMode selector + fade-in/slide-up/scale-in keyframes
  * src/index.css — CSS custom property tema sistemi (Light/Dark/AMOLED) + Tailwind override rules
  * src/layouts/MainLayout.tsx — data-theme attribute injection + system preference listener
  * src/components/layout/ThemeSelector.tsx — dropdown tema seçici (4 seçenek) + framer-motion
  * src/components/layout/CommandPalette.tsx — ⌘K paleti (navigasyon + tema değiştirme)
  * src/components/layout/TopBar.tsx — ThemeSelector + ⌘K search button
  * src/components/layout/Sidebar.tsx — Kategoriler menüsü + CSS variable theming
  * src/services/supabase/adapter.ts — supabase client export edildi
  * src/services/supabase/repositories/TransactionRepository.ts — recurring field + createMany
  * src/components/transactions/TransactionForm.tsx — tam CRUD modal (recurring, kategori, not, hesap)
  * src/pages/Categories.tsx — bütçe takipli kategori yönetim paneli + framer-motion
  * src/services/pdfExport.ts — print-window bazlı aylık özet raporu
  * src/pages/Dashboard.tsx — PDF raporu butonu
  * src/pages/Transactions.tsx — Yeni İşlem butonu + TransactionForm entegrasyonu
  * src/App.tsx — /categories route
- MVP Tamamlanma: 29/29 Faz-1 görevi DONE (100%)
- Build: Başarılı — 656 KB (186 KB gzip), 534 modül, 0 hata

## 2026-04-12 12:00
- Görev No: 25 — İşlem Import Preview Ekranı (Sprint 3 Part 2)
- Modül: Data Import / Transaction Automation
- Yapılan İş:
  * src/services/types.ts — ITransactionRepository: createMany() eklendi
  * src/services/supabase/repositories/TransactionRepository.ts — createMany() bulk insert
  * src/components/transactions/ImportPreview.tsx — 3-adım import modal
    - Drag & drop + file input (CSV/TXT)
    - Smart Mapping: otomatik kategori, tür değiştirme
    - Duplicate Check: aynı tarih + tutar + tür kontrolü
    - Bulk Insert: seçili işlemleri tek seferde Supabase'e yazma
  * src/pages/Transactions.tsx — "Ekstreyi İçe Aktar" butonu entegrasyonu
- Build: Başarılı — 487 KB, 130 modül, 0 hata

## 2026-04-12 11:15
- Görev No: 22-24 — Unit Tests + Bank Parser + Enflasyon Modu (Sprint 3 Part 1)
- Modül: Testing Framework + Data Import + Real Value Analysis
- Yapılan İş:
  * src/services/__tests__/ — Vitest test framework (scoringEngine, ruleEngine)
  * src/services/parsers/bankStatementParser.ts — CSV/TXT parser (auto-kategorize)
  * src/hooks/useInflationAdjustment.ts — Real value hook (monthly inflation)
  * src/pages/Dashboard.tsx — Inflation toggle UI
- Build: Başarılı — 473 KB, 128 modül

## 2026-04-12 10:30
- Görev No: 16-21 — Supabase Auth + Finansal Sağlık Skoru + Kural Motoru (Sprint 2 Finali)
- Modül: Auth Layer + Scoring Engine + Rules Engine + Dashboard
- Yapılan İş:
  * src/stores/authStore.ts — Zustand auth state store
  * src/services/authService.ts — Supabase auth servis (signUp, signIn, signOut, session management)
  * src/hooks/useAuth.ts — useAuth hook (protected route integration)
  * src/pages/SignUp.tsx, SignIn.tsx — Auth ekranları (Türkçe tema uyumlu)
  * src/App.tsx — Protected route wrapper + /signin, /signup rotaları
  * supabase/migrations/update_rls_policies_for_auth.sql — RLS migration (auth.uid() ile)
  * src/services/scoringEngine.ts — 7 sub-skor + Confidence Score C + Risk flags
  * src/services/ruleEngine.ts — 8 deterministik kural + insights motor
  * src/components/insights/FinancialScoreCard.tsx — Sağlık skoru kartı
  * src/components/insights/CoachInsights.tsx — Koç önerileri paneli
  * src/pages/Dashboard.tsx — Tamamen yeniden yazıldı (scoring + rules entegrasyonu)
  * Tüm sayfalar (Accounts, Transactions, Installments, Debts) — useAuth() + auth.uid()
- Uygulanmış Standartlar: logic_specs_v2, Master Plan, Talimat.md
- Build: Başarılı — 472 KB, 127 modül, 0 hata
- Risk: TEMP_USER_ID teknik borcu kapatıldı ✓

## 2026-04-12 09:00
- Görev No: 14, 15 — Taksit Merkezi + Borç Merkezi (Sprint 1 Finali)
- Modül: Frontend / UI Layer — Installment, Debt modules + DB migration
- Yapılan İş:
  * supabase/migrations/add_monthly_payment_to_debts.sql — monthly_payment kolonu eklendi (non-destructive)
  * src/types/index.ts — Debt interface'e monthlyPayment: number alanı eklendi
  * src/services/supabase/repositories/DebtRepository.ts — create/update/map metodları güncellendi
  * src/components/installments/InstallmentCard.tsx — inline düzenleme, ilerleme çubuğu, 5sn undo, bitiş tarihi
  * src/components/installments/InstallmentForm.tsx — taksit ekleme formu (lenderName, monthly, total/remaining months, principal, faiz, sonraki tarih)
  * src/components/installments/PaymentCalendar.tsx — 12 aylık görsel takvim, bar chart, biten taksitler vurgulu
  * src/pages/Installments.tsx — Kapasite Hesaplayıcı (aylık yük / gelir), %30 taksit yükü uyarısı (Koç tonu), toplam kalan ödeme özeti, inline gelir girişi
  * src/components/debts/DebtCard.tsx — inline düzenleme, Borç/Gelir risk rozeti, tahmini kapanış tarihi, 5sn undo
  * src/components/debts/DebtForm.tsx — borç formu (alacaklı, tutar, kalan, aylık ödeme, faiz, vade), tahmini kapanış önizleme
  * src/pages/Debts.tsx — risk analizi (Borç/Gelir > %35 → kırmızı/yeşil), Koç uyarı banner, durum filtresi (aktif/gecikmiş/kapandı)
  * src/App.tsx — /installments ve /debts rotaları eklendi
- Uygulanmış Master Plan & Logic Specs Özellikleri:
  * Taksit Envanteri: kart, mağaza, tutar, kalan taksit sayısı, aylık yük (2.1)
  * Kapasite Hesaplayıcı: aylık yük / gelir oranı inline (2.1)
  * Taksit Yükü Uyarısı: %30 aşınca Koç tonunda mesaj (3.2 + 2.1)
  * 12 Aylık Taksit Takvimi: bar chart, biten taksitler yeşil rozet (2.1)
  * Borç/Gelir Oranı: logic_specs_v2 'Borç/Gelir > %35' kuralı — Yeşil/Kırmızı (3.3)
  * Tahmini Kapanış Tarihi: kalan / aylık ödeme hesaplaması (2.2)
  * 5sn Undo: Tüm sil işlemlerinde (6.2)
  * Database-agnostic: Tüm veri katmanı IRepository interface üzerinden (7.1)
- QuickInput Doğrulaması:
  * '3500 market' → type:gider, category:Market ✓
  * '12500 maaş' → type:gelir, category:Gelir ✓
  * Enter tuşu → handleSave() tetiklenir ✓
  * 'Kaydet ↵' butonu çalışıyor ✓
- Risk: Minimal — Build passed (451.44 KB, 118 modules)
- Sonraki Adım: Sprint 2 — Finansal Sağlık Skoru detaylı + Kural Motoru

## 2026-04-12 07:30
- Görev No: 9, 10, 12 — Hesap Yönetimi + İşlem Listesi + Hızlı Giriş (Sprint 1)
- Modül: Frontend / UI Layer — Account, Transaction, Utility modules
- Yapılan İş:
  * src/utils/categoryPredictor.ts — 13 kategori kuralı, geçmiş işlemlerden öğrenme, parseQuickInput
  * src/utils/bankLogos.ts — 13 Türk bankası tanıma (Garanti, İş, YKB, Akbank, Ziraat vb.), renk kodları
  * src/components/accounts/BankLogo.tsx — banka renkli logo badge bileşeni (sm/md/lg boyut)
  * src/components/accounts/AccountCard.tsx — inline düzenleme (tıkla → edit mode), 5sn undo mekanizması, kredi kartı limit göstergesi
  * src/components/accounts/AccountForm.tsx — yeni hesap formu (3 tip: nakit/banka/kredi kartı), kart limiti desteği, validasyon
  * src/pages/Accounts.tsx — toplam varlık + borç özet kartları, hesap listesi, soft delete (is_active)
  * src/components/transactions/QuickInput.tsx — Enter ile kayıt, anlık tutar parse, kategori öneri butonları, geçmişten öğrenme
  * src/components/transactions/TransactionRow.tsx — inline düzenleme, 5sn undo, hover'da delete butonu
  * src/pages/Transactions.tsx — aylık görünüm, önceki/sonraki ay navigasyonu, tip + kategori filtresi, gelir/gider/net özet
  * src/components/layout/Sidebar.tsx — SVG ikonlar eklendi (6 menü öğesi)
  * src/App.tsx — /accounts ve /transactions rotaları eklendi
- Uygulanmış Master Plan Hız & Konfor Özellikleri:
  * Hızlı İşlem Kutusu: '3500 market' → Enter → 2 saniyede kayıt (6.2)
  * Akıllı Kategori: Kural motoru + geçmişten öğrenme, 13 kategori (6.2)
  * Inline Düzenleme: Tıkla → modal yok, yerinde düzenleme (6.2)
  * Geri Al (Undo): Silme sonrası 5sn içinde geri alınabilir (6.2)
  * Skeleton Screens: Tüm sayfalar yüklenirken iskelet gösterir (6.2)
  * Banka Logoları: 13 TR bankası tanınıyor, renk kodlu badge
  * Soft Delete: Hesaplar is_active=false ile silinir, veri korunur
- Risk: Minimal — Build passed (414.55 KB, 111 modules)
- Sonraki Adım: Taksit Merkezi + Borç Merkezi (Sprint 1 finale)

## 2026-04-12 06:15
- Görev No: 9 (Partial) — Dashboard Component (Sprint 1)
- Modül: Frontend / UI Layer
- Yapılan İş:
  * Dashboard component fully implemented with real data loading from Supabase
  * Financial score calculation engine (65/100 base score with proper color coding)
  * Monthly income/expense summary with TL formatting
  * Total balance, installment burden, and total debt cards
  * Recent transactions list (5 items, sorted by date, color-coded income/expense)
  * Upcoming payments section (3 items, urgent payments highlighted in red)
  * Proper loading skeleton screens with animate-pulse
  * Color-coded status indicators (green/blue/yellow/red based on score ranges)
  * Responsive grid layout (1 col mobile, 2 cols tablet, 3 cols desktop)
  * Hover effects and transitions for better UX
- Dosyalar:
  * src/pages/Dashboard.tsx (270 lines, fully typed)
- Uygulanmış Master Plan Özelikleri:
  * Hızlı Yükleme: Skeleton screens (animate-pulse)
  * Bağlamsal Bilgi: Her kart altında açıklayıcı metin
  * Renk Kodlaması: Sağlık skoru renklere göre değişiyor
  * Responsive Design: Mobile-first approach
- Risk: Minimal — Build passed (382.71 KB gzip)
- Sonraki Adım: Account List & Account CRUD forms (Sprint 1)

## Şablon
## YYYY-MM-DD HH:MM
## 2026-04-12 04:15
- Görev No: 12 & 13
- Modül: Finansal Mantık Motoru
- Yapılan İş: Finansal Mantık Anayasası v2 Oluşturuldu.
- Dosyalar: logic_specs_v2.md, Tasks.md, Changelog.md, technical_debt.md
- Risk: Mimari Borç oluştu (SQLite matematiksel hesaplama yükü).
- Sonraki Adım: Skorlama motorunun koda dökülmesi.

## 2026-04-12 05:00
- Görev No: 8 (Supabase Schema + RLS)
- Modül: Database Layer & Repositories
- Yapılan İş:
  * Supabase migration applied (5 tables: accounts, transactions, debts, installments, financial_scores)
  * Row-Level Security (RLS) policies configured for all tables
  * All Repository classes updated with proper Supabase mapping (snake_case ↔ camelCase)
  * Data mappers implemented (Supabase row → TypeScript type)
  * Soft delete pattern for accounts (is_active column)
  * Account types: nakit, banka, kredi_kartı
  * Transaction types: gelir, gider (Turkish)
  * All business logic queries support filtering, ordering, date ranges
- Dosyalar:
  * supabase migration SQL (5 tables + RLS policies + indexes)
  * 6 Repository classes with proper data mapping
  * src/types/index.ts (Account, Transaction updated)
- Risk: Minimal — RLS enforced, no data leakage possible
- Sonraki Adım: Account CRUD UI forms + Account list component

## 2026-04-12 04:30
- Görev No: 1-7 (Faz 1 Foundation)
- Modül: Altyapı & Architecture
- Yapılan İş:
  * Vite + React 18 + TypeScript 5.3 kuruldu
  * ESLint + Prettier + TailwindCSS config
  * Path aliases (@components, @stores, @services, @types vb.)
  * Database-agnostic Service Layer (Interface-based abstraction)
  * Supabase Repository Pattern (6 entities: User, Account, Transaction, Debt, Installment, FinancialScore)
  * Zustand store (UI state only: theme, sidebar, loading)
  * React Router setup (v6.24)
  * MainLayout shell + Sidebar + TopBar components
  * Dashboard skeleton screen
- Dosyalar:
  * package.json, tsconfig.json, vite.config.ts, tailwind.config.js
  * .eslintrc.cjs, .prettierrc, postcss.config.js
  * src/services/types.ts, src/services/supabase/adapter.ts, 6 repositories
  * src/stores/uiStore.ts
  * src/layouts/MainLayout.tsx
  * src/components/layout/Sidebar.tsx, TopBar.tsx
  * src/pages/Dashboard.tsx
- Risk: Minimal — Build passed, type safety enforced
- Sonraki Adım: Supabase schema + RLS setup, Account management CRUD

## Örnek
## 2026-04-12 10:00
- Görev No: 1
- Modül: Altyapı
- Yapılan İş: Vite + React + TS kuruldu.
- Dosyalar: package.json, src/*
- Risk: Yok
- Sonraki Adım: Tauri kurulumu
