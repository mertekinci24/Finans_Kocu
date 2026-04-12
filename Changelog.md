# Changelog.md
Tüm değişiklikler tarih/saat ile yazılır.

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
