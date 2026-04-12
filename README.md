# FinansKoçu

Türkiye odaklı kişisel finans yönetim uygulaması. Entegre finansal sağlık skorlama, taksit takibi, borç yönetimi ve AI-destekli analizler.

## Stack

- **Frontend:** React 18 + TypeScript 5.3
- **Build:** Vite 5.0
- **Styling:** TailwindCSS 3.4 + shadcn/ui
- **State:** Zustand 4.5
- **Routing:** React Router 6.24
- **Forms:** React Hook Form 7.52 + Zod 3.23
- **Backend:** Supabase (PostgreSQL)
- **Future:** Tauri 2 (Desktop), SQLite (Offline)

## Kurulum

```bash
npm install
npm run dev      # Development server (port 5173)
npm run build    # Production build
npm run lint     # Lint check
npm run format   # Format code
npm run test     # Run tests
```

## Mimari

```
src/
├── components/       # React components
├── hooks/           # Custom hooks
├── layouts/         # Layout wrappers
├── pages/           # Page components
├── services/        # Business logic & data access
│   ├── types.ts     # Service interfaces
│   └── supabase/    # Supabase adapter
├── stores/          # Zustand stores (UI state only)
├── types/           # TypeScript type definitions
├── constants/       # App constants
├── utils/           # Utility functions
└── App.tsx         # Root component
```

## Özellikler (MVP)

- ✅ Multi-layer finansal sağlık skoru (0-100)
- ✅ Hesap, işlem, borç ve taksit yönetimi
- ✅ Türkçe UX + TRY para birimi
- ✅ Responsive design (Mobile-first)
- ✅ Theme sistemi (Light/Dark/AMOLED/High-contrast)

## Database-Agnostic Design

Service katmanı Interface-based abstraction kulllanır. PostgreSQL → SQLite geçişinde sadece adapter değişir, UI etkilenmez.

```typescript
// Kullanım
import { dataSourceAdapter } from '@services';
const users = await dataSourceAdapter.user.getById(userId);
```

## Sonraki Adımlar

1. Supabase schema + RLS setup
2. Account management CRUD
3. Transaction entry forms
4. Financial score engine
5. Database persistence layer

## Lisans

MIT
