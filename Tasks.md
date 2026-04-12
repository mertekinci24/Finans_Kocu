# Tasks.md
## Kural
Bu dosyadaki tüm görevler tamamlandığında MVP ve planlanan kapsam tamamlanmış kabul edilir.

## Durum Kodları
- TODO
- IN_PROGRESS
- BLOCKED
- DONE

## Faz 1 — MVP (Sprint 1: Görsel Temel)
1. [DONE] Repo kurulumu, klasör yapısı, lint, formatter
2. [DONE] React + TypeScript setup (web done, Tauri pending)
3. [DONE] Tasarım sistemi (renkler, typography, spacing)
4. [DONE] Supabase + Service Layer (Database-agnostic)
5. [DONE] Zustand Store (UI state management)
6. [DONE] React Router + Layout Shell
7. [DONE] Dashboard component (fully functional with Supabase integration)
8. [DONE] Supabase schema + RLS (users, accounts, transactions, debts, installments, scores)
9. [DONE] Hesap yönetimi modülü (Account list + CRUD + BankLogo + soft delete + undo 5sn)
10. [DONE] İşlem Listesi sayfası (Transaction list + month nav + gelir/gider/kategori filtresi)
11. [TODO] Gelir/Gider İşlem Formu — detaylı (recurring, note, hesap seçimi, tam CRUD)
12. [DONE] Hızlı işlem kutusu (QuickInput — Enter ile kayıt + otomatik kategori önerisi)
13. [TODO] Kategori sistemi (Category CRUD + bütçe takibi)
14. [DONE] Taksit merkezi — temel (Envanter + Kapasite Hesaplayıcı + 12 Aylık Taksit Takvimi + %30 uyarı)
15. [DONE] Borç merkezi — temel (Borç listesi + Borç/Gelir risk analizi + renk kodlama + tahmini kapanış)

## Faz 1 — MVP (Sprint 2: Zeka & Güvenlik Katmanı)
16. [DONE] Supabase Auth entegrasyonu (Sign-up, Sign-in, Session management, Protected routes)
17. [DONE] RLS politikaları auth.uid() ile güncelleme
18. [DONE] Finansal Sağlık Skoru motorası (7 sub-scores + Confidence Score C + Penalty/Bonus)
19. [DONE] Kural Motoru (8 deterministik kural + Insights prioritization)
20. [DONE] Koç Önerileri paneli (Dashboard'a FinancialScoreCard + CoachInsights entegrasyonu)
21. [DONE] TEMP_USER_ID → auth.uid() migration (Accounts, Transactions, Debts, Installments)

## Faz 1 — MVP (Sprint 3: Finansal Derinleştirme)
22. [TODO] Detaylı İşlem CRUD formu (recurring, kategori tagging, not)
23. [TODO] Kategori sistemi (Category CRUD + bütçe takibi)
24. [TODO] PDF rapor export (Monthly financial summary)
25. [TODO] Enflasyon modu (Real vs nominal comparison with TCMB API)
26. [TODO] Light/Dark/AMOLED tema sistemi
27. [TODO] Onboarding akışı (4-step wizard with confetti)
28. [TODO] Testler
29. [TODO] Release build

## Faz 2 (MVP Sonrası)
30. [TODO] Findeks OCR + AI analizi
31. [TODO] WhatsApp tarzı AI asistan
32. [TODO] SGK/Vergi hatırlatıcı sistemi
33. [TODO] Widget altyapısı (drag-drop)
34. [TODO] Gelişmiş temalar (custom color schemes)
35. [TODO] Bütçe tahmini (ML-based)
36. [TODO] Aile bütçesi modu

## Faz 3+
37. [TODO] React Native mobil uygulama
38. [TODO] Open Banking entegrasyonu (BKM)
39. [TODO] Ödeme sistemi (İyzico)
40. [TODO] Pro plan yetkilendirme
41. [TODO] B2B danışman paneli
42. [TODO] API marketplace
