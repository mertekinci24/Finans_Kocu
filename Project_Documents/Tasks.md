# Tasks.md

## Kural

Bu dosyakdaki tüm görevler tamamlandığında MVP ve planlanan kapsam tamamlandığında MVP ve planlanan kapsam tamamlanmış kabul edilir.

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
11. [DONE] Gelir/Gider İşlem Formu — detaylı (recurring, note, hesap seçimi, tam CRUD)
12. [DONE] Hızlı işlem kutusu (QuickInput — Enter ile kayıt + otomatik kategori önerisi)
13. [DONE] Kategori sistemi (Category CRUD + bütçe takibi)
14. [DONE] Taksit merkezi — temel (Envanter + Kapasite Hesaplayıcı + 12 Aylık Taksit Takvimi + %30 uyarı)
15. [DONE] Borç merkezi — temel (Borç listesi + Borç/Gelir risk analizi + renk kodlama + tahmini kapanış)

## Faz 1 — MVP (Sprint 2: Zeka & Güvenlik Katmanı)

16. [DONE] Supabase Auth entegrasyonu (Sign-up, Sign-in, Session management, Protected routes)
17. [DONE] RLS politikaları auth.uid() ile güncelleme
18. [DONE] Finansal Sağlık Skoru motorası (7 sub-scores + Confidence Score C + Penalty/Bonus)
19. [DONE] Kural Motoru (8 deterministik kural + Insights prioritization)
20. [DONE] Koç Önerileri paneli (Dashboard'a FinancialScoreCard + CoachInsights entegrasyonu)
21. [DONE] TEMP_USER_ID → auth.uid() migration (Accounts, Transactions, Debts, Installments)

## Faz 1 — MVP (Sprint 3: Otomasyon & Doğrulama)

22. [DONE] Unit test framework (Vitest — scoringEngine, ruleEngine)
23. [DONE] Banka ekstresi parser (CSV/TXT, auto-kategorize)
24. [DONE] Enflasyon modu (Nominal vs Reel değer toggle + hook)
25. [DONE] İşlem import preview ekranı
26. [DONE] Detaylı İşlem CRUD formu (recurring, kategori tagging, not)
27. [DONE] Kategori sistemi (Category CRUD + bütçe takibi)
28. [DONE] PDF rapor export (Monthly financial summary)
29. [DONE] Light/Dark/AMOLED tema sistemi

## Faz 2 (MVP Sonrası — Sprint 1-2: Derinlik & UI)

30. [DONE] Findeks OCR + AI analizi
31. [DONE] WhatsApp tarzı AI asistan
32. [DONE] SGK/Vergi hatırlatıcı sistemi + AI Gateway
33. [DONE] Widget altyapısı (drag-drop + Supabase persistence + Reset)

## Faz 3 (Öngörü & Senaryo — Sprint 1: Cash Flow Prediction)

34. [DONE] Nakit Akışı Tahmin Motoru (30 gün forecast + risk alerts)
35. [DONE] Senaryo Simülatörü (What-if analysis)
36. [DONE] Hedef Sistemi (Saving goals + timeline)

## Faz 4 (Monetizasyon & Ödeme)

67. [DONE] Ödeme sistemi (İyzico adapter + checkout flow)
68. [DONE] Pro plan yetkilendirme (Paywall + subscriptionGuard + Upgrade sayfası)

## Faz 5+ (UI/UX Refinement & Task 44)

72. [DONE] Transaction Transparency & Filtering Engine
    - [DONE] UI Güncellemesi: Hesap Rozetleri ve İkonlar
    - [DONE] Global Renk Anayasası: Banka (Blue), Kart (Orange), Nakit (Green) standardizasyonu
    - [DONE] Dark Mode Kontrast İyileştirmeleri (Deep Slate/Zinc)
    - [DONE] Filtreleme Mantığı (Hesap, Kategori, Arama)
    - [DONE] Dinamik Özet Barı (Filtreye duyarlı Toplam Gelir/Gider)

## Faz 5+ (Future Scope)

81. [TODO] React Native mobil uygulama
82. [TODO] Open Banking entegrasyonu (BKM)
83. [TODO] B2B danışman paneli
84. [TODO] API marketplace

## 41. Taksit Yönetimi & Görselleştirme (System Hardening)

- [DONE] 45.1: Form Şema ve Kontrast Güncellemesi (AccountId, DebtType, Dark Mode)
- [DONE] 45.2: Taksit Listesi Görselleştirme (Progress Bar, Account Badges, Manuel Edits)
- [DONE] 45.3: Taksit & Dashboard Senkronizasyonu (Cash Flow Forecast)
- [DONE] 45.4: Bireysel Taksit Durum Yönetimi (Calendar Actions, Paid/Edit logic)
- [DONE] 45.10: Dinamik Ödeme Kaynağı ve Bakiye Senkronizasyonu (Atomic Rollback)
- [DONE] 45.11: Reverse Atomic Undo (Financial Integrity)
- [DONE] 45.12: Detail List Sync & UI Refinement (Individual Logic + AMOLED)
- [DONE] 45.13: Transparent Payment Confirmation & Account Override (Ghost Payment Fix)
- [DONE] 45.14: Comprehensive Installment Editing (Full Field Support)
- [DONE] 45.15: Bi-directional Transaction Sync (Reverse Atomic)
- [DONE] 45.16: Rectify Debt Calculation & Sync Logic (Nominal Erosion Fix)
- [DONE] 45.17: Fixed Payment Schedule & Anchored Timeline
- [DONE] 45.18: Fix Installment Creation Failure (Enhanced Diagnostics)
- [DONE] 45.19: First Payment Anchor & Inclusive Logic (Timezone Robust)
- [DONE] 45.20: Smart "Ending" Labels & Detail Context (Granular Alert)
- [DONE] 45.21: Extended Calendar Perspective (Navigable Years)
- [DONE] 45.22: High-Resolution Chronological Sorting (Timestamp Precision)
- [DONE] 45.23: Repairing Projection Data Bridge (Anchored Analytics)
- [DONE] 45.24: Risk Thresholds & Visual Polish (Risk Radar Active)
- [DONE] 45.25: UI Refinement & Phase 3 Income Line (Strategic Vision)
- [DONE] 45.26: UI Visibility & Overlay Fix (Crystal Clarity)
- [DONE] 45.27: Financial Logic Repair (Accuracy & Calibration)
- [DONE] TASK 45.34 — CORE MRE CALCULATOR (Logic & UI)
- [DONE] TASK 45.34.1 — FIX REACT HOOK VIOLATION (Dashboard Recovery)
- [DONE] TASK 45.34.2 — MRE LOGIC & DATA ENTRY FIX (3-Mo Fallback)
- [DONE] TASK 45.34.4 — CONSTITUTIONAL REFORM OF MRE DEFINITION (Hybrid Model)
- [DONE] TASK 45.35 — LAYER 1: OVERRIDE ENGINE (LIQUIDITY STRESS DETECTION) ✅
- [DONE] TASK 45.39 — IMPLEMENTING CRISIS SHIELDS (LAYER 0 & 1) ✅
- [DONE] TASK 45.39.1 — TRIGGER C & UI LABEL ALIGNMENT ✅
- [DONE] TASK 45.39.2 — TRIGGER C (DELINQUENCY) DEEP AUDIT & REPAIR ✅
- [DONE] TASK 45.39.3 — FINAL SEALING OF TRIGGER C (CRITICAL INTEGRATION) ✅
- [DONE] TASK 45.39.4 — EMERGENCY LOGIC TRACING & UI INTEGRATION ✅
- [DONE] TASK 45.40 — HOTFIX FOR TDZ ERROR IN DASHBOARD ✅
- [DONE] TASK 45.41 — IMPLICIT DELINQUENCY ENGINE (THE FINAL SEAL) ✅
- [DONE] TASK 45.42 — DELINQUENCY VISIBILITY & UX ALIGNMENT ✅
- [DONE] TASK 45.42.1 — FIX JSX SYNTAX ERROR IN PAYMENTCALENDAR ✅
- [DONE] TASK 45.42.2 — REFINING DELINQUENCY VISUALS & CALENDAR LOGIC ✅
- [DONE] TASK 45.42.3 — FIX JSX SYNTAX ERROR IN INSTALLMENTCARD ✅
- [DONE] TASK 45.42.4 — FINAL JSX REPAIR FOR INSTALLMENTCARD ✅
- [DONE] TASK 45.37 — IMPLEMENTATION OF SCORING ENGINE V6 (HYBRID SYNTHESIS) ✅
- [DONE] TASK 45.37.1 — DETERMINISTIC SCORING REFACTOR (v6.1 HEYE REFINEMENT) ✅
- [DONE] TASK 45.37.2 — DOCUMENTATION ALIGNMENT (SCORING v6.1 REFORM) ✅
- [DONE] TASK 45.37.3 — SCORING REFINEMENT (v6.1 SAFETY & CONTINUITY) ✅
- [DONE] TASK 45.37.4 — SCORING REFINEMENT (v6.1 PRECISION & SCALING) ✅
- [DONE] TASK 45.38 — REFINING THE DATA CORE (WNW & HYBRID MRE) ✅
- [DONE] TASK 45.38.1 — MRE DATA CATEGORY MAPPING FIX ✅
- [DONE] TASK 45.38.2 — MRE CATEGORY & AGGREGATION FIX ✅
- [DONE] TASK 45.38.3 — MRE PRECISION & LOGIC HYBRIDIZATION ✅

## Maintenance / Bug Fixes

43. [DONE] QuickInput onarımı (Görünürlük, Gelir '+' Desteği, Kaydet Butonu)

# ==================================================

# RESTRUCTURING SYSTEM — PRODUCT HARDENING EPIC

# ==================================================

- [x] 46.1: Restructuring Commit Transaction Engine (DONE)
      Amaç:
      Yapılandırma onayında tüm sistem tek işlem gibi güvenli güncellensin.

Kapsam:

- installment update
- related debt sync
- related account sync (if credit card)
- audit transaction insert
- rollback on failure

Hariç:
UI redesign

Teknik Gereksinimler:

- atomic async flow
- no partial state
- typed payload
- retry safe

UX Gereksinimleri:

- loading state
- success toast
- fail toast

Kabul Kriterleri:
Hiçbir durumda yarım veri oluşmaz.

Test:
1 success
1 db fail
1 timeout
1 duplicate click

Bağımlılık:
Dashboard.tsx
InstallmentCenter.tsx
supabaseService.ts

- [x] 46.2: Global Reactive State Propagation (DONE)
      Amaç:
      Tek güncelleme ile tüm widgetlar otomatik yenilensin.

Kapsam:

- installments store update
- memo recalculation
- derived selectors
- stale state cleanup

Teknik:

- Zustand selectors
- rerender minimization
- no manual refresh dependency

Kabul:
15 widget anında güncellenir.

- [x] 46.3: Financial Score Recalculation Integrity (DONE)
      Amaç:
      Yapılandırma sonrası skor motoru doğru yeniden hesaplansın.

Kapsam:

- scoringEngine rerun
- scenario flag cleanup
- no cached stale score
- confidence preserve

Kabul:
Yeni taksit düşerse skor yükselir.
Artarsa düşer.

- [x] 46.4: Cash Flow Navigator Regeneration (DONE)

Amaç:
Yeni ödeme planına göre 30g/6ay/12ay projeksiyon yeniden üretilsin.

Kabul:
Grafik eski veriyi göstermez.

- [x] ## TASK 46.5 — Audit Trail & Recent Transactions Ledger (DONE)
- [x] ## TASK 46.6 — Credit Card Restructuring Balance Sync (DONE)
- [x] ## TASK 46.8 — Goals Engine Rebinding (DONE)
- [x] ## TASK 46.9 — Smart Goal UI & Capacity Banner (DONE)
- [x] ## TASK 46.10 — Payment Calendar Refactoring (DONE)

## 🔄 TASK 46 EPİK - [IN-PROGRESS]

"Ürün Sağlamlaştırma" (Product Hardening) fazı devam ediyor.

- [x] ## TASK 46.11 — Production Graduation (Removing Sandbox Locks) (DONE)
- [x] ## TASK 46.12 — UI Hallucination & Color Sync (DONE)
- [x] ## TASK 46.13 — Unified Math Engine & Navigator Sync (DONE)
- [x] ## TASK 46.14 — Live Dashboard Truth Enforcement & Coach Sync (DONE)
- [x] ## TASK 46.15 — Waterfall Allocation Engine (DONE)
  Amaç: Tasarruf kapasitesinin (Nefes Payı) hedefler arasında öncelik sırasına göre (High > Medium > Low) reel zamanlı dağıtılması.
- [x] ## TASK 46.16 — Performance & Render Budget (DONE)
  Amaç: Yapılandırma sonrası 300ms altı commit süresi ve render optimizasyonu.
- [x] ## TASK 46.17 — Restructuring Test Suite (DONE)
  Amaç: Yapılandırma senaryoları için Unit ve Integration testlerinin yazılması.

## 🏁 TASK 46 EPİK TAMAMLANDI

Tüm "Ürün Sağlamlaştırma" ve "Mimari Sağlamlaştırma" görevleri başarıyla finalize edildi. Sistem artık test güvencesi altındadır.

## 💳 FAZ 6 — KREDI KARTI VE EKSTRE DÖNGÜSÜ (REVOLVING CREDIT ENGINE)

Kredi kartlarının BDDK regülasyonları ve bankacılık standartlarına (Ekstre Döngüsü, Dönem Borcu) uyumlu hale getirilmesi.

- [x] ## TASK 47.1 — BDDK Asgari Ödeme & UI Ayrışması (DONE)

  Amaç: Asgari ödeme oranının BDDK kurallarına göre dinamik hesaplanması ve varlık/borçların UI'da görsel olarak ayrıştırılması.
  Kapsam:
  - `PaymentModals.tsx` içindeki hardcode %20 hesabının silinmesi.
  - Kart limiti (cardLimit) >= 50.000 ₺ ise %40, değilse %20 kuralının eklenmesi.
  - `Accounts.tsx` sayfasının "Finansal Varlıklar" ve "Kredi Kartları" olarak 2 bölüme ayrılması.

- [x] ## TASK 47.2 — Ekstre Döngüsü (Virtual Statement Logic) (DONE)
- [x] ## TASK 47.3 — Zaman Makinesi (Simulation Date Override) (DONE)
- [x] ## TASK 47.4 — Backdated Transactions (Geçmiş Tarihli İşlem Girişi) (DONE)
- [x] ## TASK 47.5 — Quick Input Backdating (Hızlı Giriş İçin Geçmiş Tarih) (DONE)
- [x] ## TASK 47.6 — AccountCard UI Structural Adaptation (DONE)
  Amaç: AccountCard bileşeninin arayüz mimarisi refaktör edildi. Kredi kartları için Sanal Ekstre verileri (Ekstre Borcu ve Dönem İçi) yapısal olarak arayüze entegre edildi.
- [x] ## TASK 47.7 — Unified Payment Calendar (Kredi Kartı Takvim Entegrasyonu) (DONE)
  Amaç: Kredi kartı ekstreleri Taksit Takvimi'ne sanal ödemeler (Virtual Installments) olarak entegre edildi. Takvim artık tüm aylık yükümlülükleri tek ekranda sunuyor.
- [x] ## TASK 47.8 — Virtual Statement Math & Data Pipeline Fix (DONE)
  Amaç: cashFlowEngine'in ekstre hesaplama mantığı 'Toplam Bakiye - Dönem İçi' olarak güncellenerek geçmiş ana bakiyelerin kaybolması engellendi. Taksit takvimine işlem okuma yeteneği eklendi.
- [x] ## TASK 47.9 — CC Engine Polish (Zaman Sapması & Takvim Hataları) (DONE)
  Amaç: Kredi kartlarındaki 'Taksit Bitimi' hatası, takvimdeki kopyalanma sorunu ve AccountCard tarihlerindeki fiziksel zaman sapması Zaman Makinesi (systemDate) ile senkronize edilerek çözüldü.
- [x] ## TASK 47.10 — Ghost Debt Elimination (Takvim Klonlarının Temizlenmesi) (DONE)
  Amaç: Kredi kartı ekstrelerinin takvimde gelecek aylara kopyalanması (Hayalet Borç) hatası, calculateCCDates kullanılarak kesin (absolute) tarih filtrelemesi ile çözüldü.
- [x] ## TASK 47.11 — Weekend Adjustment Removal (Türkiye CC Regülasyonu) (DONE)
  Amaç: Türkiye bankacılık standartlarına uyum sağlamak amacıyla, kredi kartı son ödeme tarihlerindeki hafta sonu (Pazartesi'ye kaydırma) mantığı iptal edilerek takvime saf günler yansıtıldı.
- [x] ## TASK 47.12 — CC Cycle Offset Fix (Kayma Problemi) (DONE)
  Amaç: Kredi kartı ekstrelerinin takvimde 1 ay ileri kayması hatası, döngü sıfırlama kuralı 'Hesap Kesim' gününden 'Son Ödeme' gününe alınarak kökten çözüldü. Takvim ve Bakiye motorları tam senkronize edildi.
- [x] ## TASK 47.13 — CC Payment Validation & Debt Reduction Fix (DONE)
  Amaç: Kredi kartı ekstre ödemelerinde kaynak olarak başka bir kredi kartının seçilmesi engellendi. Ödeme yapıldığında hedef kartın borcunun ana bakiyeden düşülmesi sağlandı.
- [x] ## TASK 47.14 — Supabase Constraint Fix & Overpayment Logic (DONE)
  Amaç: Kredi kartlarındaki Fazla Ödeme (Artı Bakiye) durumlarını desteklemek için veritabanındaki positive_balance kısıtlaması esnetildi. AccountCard arayüzüne Artı Bakiye görünümü eklendi.
- [x] ## TASK 47.15 — Payment Modal Target Reference Fix (DONE)
  Amaç: Kredi kartı ekstre ödeme modalında, borç ve asgari ödeme hesaplamalarının ödeme kaynağına (cüzdan/banka) göre yapılması hatası giderildi. Hesaplamalar doğru kredi kartı objesine (targetCcAccount) ve dönem borcuna bağlandı.
- [x] ## TASK 47.16 — CC Payment Persistence & Undo Symmetry Fix (DONE)
  Amaç: Ödenen kredi kartı ekstrelerinin takvimde görünmeye devam etmesi sağlandı. Ödeme geri alma (Undo) işlemine kredi kartı borç senkronizasyonu eklendi.
- [x] ## TASK 47.17 — CC Undo Target Reference Fix (DONE)
  Amaç: Kredi kartı ödemeleri geri alındığında, borç artırımının kaynak hesaba değil doğru hedef kredi kartına (inst.accountId) yapılması sağlandı.
- [x] ## TASK 47.18 — CC Visual Anchor & Persistence Fix (DONE)
  Amaç: Kredi kartı ekstrelerinin ödeme yapıldıktan sonra listeden silinmesi hatası giderildi; ödenmiş ekstrelerin o ayın takvim kutusunda yeşil ve üstü çizili olarak kalması zorunlu hale getirildi.
- [x] ## TASK 47.19 — CC Undo Symmetry & Hard Refresh Fix (DONE)
  Amaç: Kredi kartı ödemeleri geri alındığında borç senkronizasyonunun başarısız olması hatası, hedef kart bakiyesi manuel tetiklenerek ve sayfa yenileme eklenerek çözüldü.
- [x] ## TASK 47.20 — Atomic CC Transaction & Metadata Sync (DONE)
  Amaç: Kredi kartı ödemeleri için [CC_PAYMENT] etiketi getirildi. Undo ve Takvim motorları bu etiket üzerinden %100 doğrulukla çalışacak şekilde senkronize edildi.
- [x] ## TASK 47.21 — CC Payment Cross-Account Tracking Fix (DONE)
  Amaç: Kredi kartı ödemelerinin takvimden kaybolması hatası giderildi. İşlemler artık kaynak hesabın ID'sinden bağımsız olarak, açıklama satırındaki [CC_ID] damgası ile takip ediliyor.
- [x] ## TASK 47.22 — Global Transaction Fetch for Calendar (DONE)
  Amaç: Takvimin [CC_PAYMENT] etiketli işlemleri (Cüzdan/Banka dahil) görebilmesi için sadece KK değil tüm işlemlerin çekilmesi sağlandı.
- [x] ## TASK 47.24 — RCA Implementation: Async Sync, Adapter Fix & Date Hardening (DONE)
  Amaç: Race Condition için buffer reload, Adapter için eksik list() metodu ve Timezone kaymaları için Date.setHours(0,0,0,0) cerrahisi uygulandı.
- [x] ## TASK 47.25 — Global Undo Interceptor, UI Reload & Trace Logs (DONE)
- [x] ## TASK 47.26 — Double-Sided Refund Sync on Global Delete (DONE)
- [x] ## TASK 47.27 — Debt Module Payment Engine, Global Undo Sync & Widget Income Fix (DONE)
- [x] ## TASK 47.28 — Hybrid Findeks Parser (PDF.js + Tesseract Fallback) (DONE)
- [x] ## TASK 47.29 — Tesseract Removal & Digital PDF Hardening (DONE)
  Amaç: Findeks modülünden Tesseract.js (OCR) tamamen kaldırıldı. Sadece yüksek doğruluklu Dijital PDF desteği bırakıldı. Paket boyutu optimize edildi ve veri güvenliği artırıldı.
  Amaç: Kredi kartı ödemeleri sonrası UI güncellenmemesi sorunu çözüldü. Global silme işlemlerine (Bulldozer) kredi kartı borç senkronizasyonu öğretildi. Trace logları eklendi.

## FAZ 7: FINDEKS INTELLIGENCE & AI ECOSYSTEM

- [x] ## TASK 48.01 — Findeks Intelligence Refactoring (Parser Fix) (DONE)
- [x] ## TASK 48.02 — Dynamic Coaching UI & Visual Insights (DONE)
- [x] ## TASK 48.03 — AI Assistant Bridge & Data Migration (DONE)
- [x] ## TASK 48.1 — Real Report Compatibility & Bridge Hardening (DONE)
- [x] ## TASK 48.10 — Enterprise Data Pipeline & AI Initialization (DONE)
- [x] ## TASK 48.20 — Deterministic Parsing & UI Resilience (DONE)
- [x] ## TASK 48.21 — Precision Data Capture & UI Flow Fix (DONE)
- [x] ## TASK 48.22 — Precision Alignment & UI Flow Recovery (DONE)
- [x] ## TASK 48.30 — Findeks Data Pipeline & UI Recovery (DONE)
- [x] ## TASK 48.31 — Type Safety & Data Recovery - HOTFIX (DONE)
