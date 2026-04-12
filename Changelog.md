# Changelog.md
Tüm değişiklikler tarih/saat ile yazılır.

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
