# Changelog.md
Tüm değişiklikler tarih/saat ile yazılır.

## Şablon
## YYYY-MM-DD HH:MM
## 2026-04-12 04:15
- Görev No: 12 & 13
- Modül: Finansal Mantık Motoru
- Yapılan İş: Finansal Mantık Anayasası v2 Oluşturuldu.
- Dosyalar: logic_specs_v2.md, Tasks.md, Changelog.md, technical_debt.md
- Risk: Mimari Borç oluştu (SQLite matematiksel hesaplama yükü).
- Sonraki Adım: Skorlama motorunun koda dökülmesi.
- Görev No:
- Modül:
- Yapılan İş:
- Dosyalar:
- Risk:
- Sonraki Adım:

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
