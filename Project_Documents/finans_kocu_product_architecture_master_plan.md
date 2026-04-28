# FinansKoçu — Yapılandırma Onayı Sonrası Kurumsal Ürün Mimarisi ve Nihai Sistem Anayasası

## Yönetim Kurulu Sunum Sürümü
Bu belge, FinansKoçu ürününde “Yapılandırmayı Onayla” aksiyonu sonrası tüm platform davranışının eksiksiz, denetlenebilir, ölçeklenebilir ve psikolojik olarak güven veren şekilde tasarlanması için hazırlanmış nihai referans dokümandır. Amaç yalnızca kod yazmak değil; karar veren, tepki veren, tutarlı çalışan ve büyüyebilen bir finansal ürün işletim sistemi kurmaktır.

---

# 1. Stratejik Amaç
Bir kullanıcının borç yapılandırması; veri tabanında satır güncelleme, arayüzde rakam değiştirme veya tekil bir özellik değildir. Bu olay:
- Risk profilini değiştirir
- Nakit akışını değiştirir
- Gelecek projeksiyonunu değiştirir
- Finansal psikolojiyi etkiler
- Ürüne olan güveni etkiler
- Tavsiye motorunu etkiler
- Hedef gerçekleşebilirliğini etkiler
- Analitik olay üretir
- Denetim izi oluşturur

Bu nedenle sistem yaklaşımı ekran bazlı değil, olay bazlı olmak zorundadır.

---

# 2. Kurucu İlkeler
## 2.1 Tek Doğru Kaynak
Tüm ekranlar aynı veri çekirdeğinden beslenir.
- accounts
- installments
- debts
- transactions
- recurring_flows
- goals
- financial_events

## 2.2 Deterministik Davranış
Aynı veri aynı sonucu üretmelidir.

## 2.3 Açıklanabilirlik
Her skor, öneri ve uyarı neden üretildiğiyle birlikte sunulmalıdır.

## 2.4 Geri Alınabilirlik
Kullanıcı hataları geri döndürülebilir olmalıdır.

## 2.5 Denetlenebilirlik
Kritik finansal aksiyonlar sonradan izlenebilir olmalıdır.

## 2.6 Algısal Güven
Kullanıcı sistemin kararını gördüğünü hissetmelidir.

---

# 3. Problem Tanımı
Yapılandırma sonrası şu riskler oluşur:
- Widget’ların bir kısmı eski veride kalır
- Skor güncellenir, banner güncellenmez
- Borç toplamı ile taksit yükü tutarsız olur
- Çift fetch nedeniyle flicker oluşur
- Başarısız DB yazımında sahte başarı görünür
- Aynı olay iki kez işlenir
- Kullanıcı neyin değiştiğini anlamaz
- Performans düşer
- İleride yeni modül eklemek zorlaşır

Bu belge bu riskleri sistematik olarak ortadan kaldırır.

---

# 4. Olay Tabanlı Mimari
## Ana Event
DEBT_RESTRUCTURED

## Event Payload
- eventId
- userId
- installmentId
- oldState
- newState
- reason
- createdAt
- source(screen/api/system)
- correlationId

## Kural
UI doğrudan widget güncellemez. Event üretir. Sistem tepki verir.

---

# 5. Veri Akışı Kanunu
1. Kullanıcı onay verir
2. Input validation çalışır
3. Yetki kontrolü yapılır
4. DB transaction başlar
5. Installment kaydı güncellenir
6. financial_events kaydı yazılır
7. Commit tamamlanır
8. Local state patch edilir
9. Derived engines recompute edilir
10. UI batch refresh olur
11. Delta summary gösterilir
12. Silent reconciliation fetch çalışır
13. Undo penceresi açılır
14. Analytics event gönderilir

---

# 6. Veri Katmanı Tasarımı
## installments
- id
- lender_name
- monthly_payment
- principal
- remaining_months
- total_months
- status
- first_payment_date
- updated_at

## financial_events
- id
- user_id
- type
- entity_id
- payload(json)
- correlation_id
- created_at

## transactions (audit-visible user feed)
- id
- type
- description
- amount
- created_at

---

# 7. State Management Standardı
Önerilen yapı: Zustand veya eşdeğer merkezi store.

## Raw State
- accounts
n- installments
- debts
- transactions
- recurringFlows
- goals

## Computed State
- score
- wnw
- monthlyBurden
- totalDebt
- projection
- recommendations
- performanceSummary

## UI State
- loading
- lastAction
- toastQueue
- undoState
- syncStatus

## Actions
- commitRestructure()
- recomputeAll()
- rollback()
- hydrateFromServer()
- clearToast()

---

# 8. Hesaplama Motorları
## 8.1 Scoring Engine
Input değişince yeniden hesaplanır.
Çıktılar:
- overall score
- ratios
- warnings
- recommendations

## 8.2 Cash Flow Engine
- monthly required expense
- projected end balance
- min balance
- buffer months

## 8.3 Projection Engine
12 aylık taksit ve nakit görünümü üretir.

## 8.4 Coach Engine
Skor + risk + davranış sinyallerinden öneri üretir.

## 8.5 Goal Engine
Yeni borç yüküne göre hedef gerçekleşebilirliğini günceller.

---

# 9. Dependency Graph
## Direct Dependencies
MonthlyBurden <- installments
TotalDebt <- installments + debts
ActiveInstallments <- installments

## Composite Dependencies
Score <- accounts + installments + debts + transactions + flows
WNW <- accounts + debts + installments
Projection <- accounts + installments + flows + transactions
Recommendations <- score + projection + risks
Banner <- score + risks
Goals <- score + disposableCash

## Kural
Sadece etkilenen node yeniden hesaplanır.

---

# 10. Performans Mimarisi
## Batch Updates
Tek olayda çoklu render yasaktır.

## Memoized Selectors
Her component sadece kullandığı alanı dinler.

## Lazy Recompute
Ekranda görünmeyen ağır bileşen ertelenebilir.

## Background Sync
UI bloklamadan server doğrulaması yapılır.

## Ölçüm KPI
- perceived update < 300ms
- full consistency < 2s
- redundant rerender minimum

---

# 11. UX ve Davranışsal Psikoloji
## Kullanıcı Ne İster?
Sayı değil, kontrol hissi.

## Zorunlu Görsel Tepki
- başarı durumu
- ne değişti
- ne kadar iyileşti/kötüleşti
- şimdi ne yapmalı

## Delta Card
Önce: 45.000 TL
Sonra: 10.500 TL
Aylık Rahatlama: +34.500 TL
Tahmini Etki: Skor +X

## Güven Ritüeli
Tüm ana widget’lar eşzamanlı değişmelidir.

---

# 12. Hata Yönetimi
## DB Failure
- local kalıcı state yazılmaz
- hata mesajı gösterilir
- retry opsiyonu sunulur

## Partial Failure
Event yazıldı update yazılmadı veya tersi durum kabul edilmez.
DB transaction zorunlu.

## Network Timeout
Durum belirsizse “işleniyor” statüsü gösterilir, çift gönderim engellenir.

---

# 13. Idempotency ve Yarış Durumları
## Riskler
- kullanıcı çift tıklar
- iki sekme açık
- zayıf internet tekrar gönderir

## Çözüm
- correlationId
- request lock
- unique event constraint
- last-write policy veya version check

---

# 14. Undo Sistemi
## Amaç
Yanlış karar korkusunu azaltmak.

## Kural
30 saniye içinde geri al.

## Teknik
oldState memory’de tutulur.
rollback event üretilir.

---

# 15. Güvenlik
- Row Level Security aktif
- user_id scope zorunlu
- server-side validation
- numeric bounds check
- malicious payload sanitize
- audit retention policy

---

# 16. Analitik ve Ürün Öğrenimi
Takip edilecek metrikler:
- restructure_started
- restructure_completed
- restructure_undone
- score_delta
- burden_delta
- widget_view_after_action
- retention_after_relief

Amaç: hangi aksiyon gerçekten fayda üretiyor görmek.

---

# 17. Widget Güncelleme Matrisi
## Anında Güncellenecek
1 Banner
2 Score Widget
3 Cash Navigator
4 Coach Suggestions
5 Performance Summary
6 WNW
7 Monthly Burden
8 Total Debt
9 Recent Activity
10 Active Installments
11 Projection
12 Installment Center
13 Goals

## Koşullu
14 Accounts (kart borcu bağlıysa)

---

# 18. Test Stratejisi
## Unit Tests
- score recompute
- burden math
- rollback logic

## Integration Tests
- DB update + store sync
- widget propagation
- event creation

## E2E Tests
- kullanıcı onaylar tüm ekran değişir
- hata alırsa geri döner
- undo çalışır

## Regression Tests
Eski çalışan akışlar bozulmaz.

## Load Tests
Yüksek veri hacminde performans korunur.

---

# 19. Kod Standartları
- pure functions
- typed contracts
- no hidden side effects
- feature flags for rollout
- structured logging
- reusable selectors

---

# 20. Rollout Planı
## Faz 1
Store ve event altyapısı

## Faz 2
Restructure service + transaction flow

## Faz 3
Derived engine bağlantıları

## Faz 4
Widget migration

## Faz 5
Undo + analytics

## Faz 6
Stress / QA / launch

---

# 21. Kabul Kriterleri (Release Gate)
Sistem yayına alınamaz eğer:
- herhangi widget stale data gösteriyorsa
- skor yanlış yönde değişiyorsa
- toplam borç tutarsızsa
- rollback bozuksa
- çift kayıt oluşuyorsa
- render performansı kabul dışıysa
- güvenlik scope ihlali varsa

---

# 22. Nihai Sonuç
Yapılandırma onayı bir buton işlemi değildir; finansal gerçekliği değiştiren bir olaydır. Doğru ürün mimarisi, bu olayı tek noktada işler ve tüm sistemi senkron şekilde yeniden üretir. Böyle kurulan yapı sadece bugünkü problemi çözmez; gelecekte kredi, yatırım, vergi, abonelik, hedef ve AI koçluk modüllerinin tamamını aynı çekirdeğe bağlayabilecek kurumsal temel oluşturur.

Bu belge yürürlüğe girdiğinde FinansKoçu, ekranlardan oluşan bir uygulama değil; yaşayan, açıklanabilir ve güvenilir bir finans işletim sistemidir.

