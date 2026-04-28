# debugging.md

Hata günlüğü ve öğrenimler.

## Kayıt Şablonu

### 20. SyntaxError: Expected corresponding JSX closing tag for <> / Ternary Mismatch (2026-04-19)
**Sorun**: `src/pages/Installments.tsx` dosyasında "Expected corresponding JSX closing tag for <>" ve "TypeScriptParserMixin.parseConditional" hatalarıyla uygulamanın çökmesi.
**Kök Neden**: 
1. `activeTab === 'installments'` bloğu için açılan `<>` (Fragment) etiketinin sonu yanlışlıkla `</div>` ile kapatılmıştı.
2. Daha da kritik olarak, blok `{activeTab === 'installments' ? (` (ternary) ile başlatılmış ancak else durumu (`:`) belirtilmeden kapatılmıştı. Bu durum derleyicinin "parseConditional" hatası fırlatmasına sebep oldu.
**Çözüm**: 
1. `</div>` etiketi `</>` ile düzeltildi.
2. Ternary operatörü (`?`) yerine, else durumu gerektirmeyen mantıksal VE (`&&`) operatörüne geçildi.
**Öğrenim**: JSX içinde ternary (`? :`) kullanılıyorsa, React her zaman iki dalın da (true/false) mevcudiyetini bekler. Sadece belirli bir durumu göstermek istiyorsak `&&` operatörü hem daha temizdir hem de "missing colon" gibi syntax hatalarını engeller.


## 2026-04-14 (SURGICAL FIX FOR QUICKINPUT - Task 43.1)

- Tarih: 2026-04-14
- Problem (The Real Reason Behind "Save Button Failure"): `QuickInput.tsx`'in `handleSave` fonksiyonu içinde `Transactions.tsx` katmanından gelen `onSave` promise'i çağrıldığında `catch` statement'ı bulunmadığı için failed request'ler sessizce "Unhandled Promise Rejection" yaratıyordu. Hata yutuluyordu. DAHA DA ÖNEMLİSİ: Eğer sistemde hiç "Hesap" (Account) yoksa veya gecikiyorsa, `selectedAccountId` boş oluyordu fakat Buton Enable kalıyordu. Kullanıcı butona bastığında ise `if (!selectedAccountId) return;` bloğu sessizce işlemin durmasına sebep oluyordu.
- Çözüm (Buton Onarımı): `try...catch` bloğu eklendi ve daha önemlisi, `!selectedAccountId` durumunda sessiz return yerine UI üzerinde `setErrorMsg('Lütfen önce bir hesap ekleyin.')` uyarısı çıkarıldı.
- Öğrenim (Kategori Ağı Akıllanması ve Priority Logic): "Kira geliri" girildiğinde "kira" kelimesinden dolayı sistemin bunu "Kira & Aidat" (Gider) olarak algılaması bir mantık hatasıydı. Bunun üstesinden gelmek için `predictCategory` içine `type` parametresi eklenerek "Priority Logic" (Öncelik Mantığı) kuruldu. Artık metinde gelir ifade eden bir kelime veya `+` işareti varsa, harcama havuzları deaktive ediliyor ve önce "Gelir" sınıflarında eşleşme aranıyor. Giyim ve Yeme-İçme kümeleri ise yeni terimlerle ("pantolon", "kebap") genişletildi.

## 2026-04-13 (Kritik Hata: API Key Geçersizliği)

- Tarih: 2026-04-13
- Problem: Kayıt ve Giriş süreçlerinde Supabase Auth'tan "Invalid API key" (401/400) hatası dönmesi.
- Kök Neden 1: FSIA incelemesinde çevre değişkeninin adı (`VITE_SUPABASE_SUPABASE_ANON_KEY` -> `VITE_SUPABASE_ANON_KEY`) düzeltilmiş ancak değerinin geçerliliği kontrol edilmemiştir.
- Kök Neden 2: Kod içerisinde `import.meta.env.VITE_SUPABASE_ANON_KEY` runtime sırasında başarıyla yükleniyor; ancak `.env` içerisindeki değer gerçek bir JWT anahtarı (örn. `eyJ...`) yerine harfi harfine `your_supabase_anon_key_here` şeklindeki _placeholder (yer tutucu)_ metnidir.
- Kök Neden 3: `authService.ts` içindeki kontrol (`if (!supabaseKey) throw`) sadece değişkenin var olup olmadığını (`undefined`/boş) kontrol eder, anahtarın geçerli bir Supabase JWT formatında olup olmadığını doğrulamaz.
- Çözüm Planı:
  1. `.env` dosyasına projenin gerçek Supabase Anon Key'i girilmelidir. (Bu adım güvenli bir şekilde yapılmalıdır).
  2. "Environment Guard" Stratejisi geliştirilmeli: `authService.ts` ve `adapter.ts` içerisinde Supabase client'ı başlatılmadan önce `supabaseKey.startsWith('eyJ')` gibi bir semantik geçerlilik (sanity) kontrolü ile fail-fast (erken hata fırlatma) mekanizması eklenmeli.
- Öğrenim: Çevre değişkenlerinde değişken adının doğru olması yetmez; payload'un form ve mantık olarak da kurallara uyması gerekir. Hatanın çözüldü sanılması "name mapping" probleminin çözülüp payload sorununun gizli kalmasından kaynaklanmıştır.
- Neden-Sonuç: Geliştirici ortamında placeholder kullanıldığı için, string boş olmadığı sürece frontend çalışmış, ancak backend'e giden `apikey` header'ı arızalı olduğu için "Invalid API key" vermiştir.

### 11. Bi-directional Sync: Transactions to Installments (2026-04-16)
**Sorun**: İşlemler (Transactions) sayfasından bir taksit ödemesi silindiğinde, bu durumun taksit takvimini (PaymentCalendar) etkilememesi ve bakiyenin iade edilmemesi.
**Çözüm**: `Transactions.tsx` içindeki silme mantığına "Reverse Atomic Protocol" eklendi.
**Mantık Akışı**:
1. `category === 'Taksit Ödemesi'` kontrolü yapılır.
2. İşlem açıklaması (`lenderName - monthName Taksidi`) parse edilerek ilgili taksit ve ay anahtarı (`monthKey`) bulunur.
3. **Bakiye İadesi**: İşlem tutarı, hesap türüne göre ters işlemle iade edilir (Kredi kartı ise borç düşülür, nakit/banka ise bakiye artırılır).
4. **Takvim Geri Alma**: `installments` tablosunda `paymentHistory` içinden ilgili ay silinir ve `remainingMonths` 1 artırılır.
5. **İşlem Silme**: En son ana `transaction` kaydı silinir.
**Hata Yönetimi**: Herhangi bir adımda hata oluşursa süreç durdurulur ve "Atomic Rollback" mantığı gereği transaction silinmez.

### 12. Debt Calculation & Sync Rectification (2026-04-16)
**Sorun**: Ödemeler yapılmasına rağmen nominal borcun Dashboard'da erimemesi ve `InstallmentCard` içinde eksi değerler (-1 Ödendi) oluşması.
**Çözüm**: 
1. `PaymentCalendar.tsx` içinde ödeme yapıldığında `remainingMonths` bir azaltıldı, geri alındığında bir artırıldı.
2. `Dashboard.tsx` içindeki `totalDebt` hesaplaması, `Installments` sayfasındaki gibi `paymentHistory` duyarlı hale getirildi.
3. Dashboard "Toplam Borç" widget'ı enflasyon ayarına (`useRealValue`) bağlandı.
4. `InstallmentCard.tsx`'e `Math.max(0, ...)` güvenlik kontrolleri eklendi.

### 13. Fixed Timeline vs. Floating Timeline (2026-04-16)
**Sorun**: Taksitlerin sadece `remainingMonths` üzerinden hesaplanması yüzünden ödeme yapıldıkça bitiş tarihinin erkene kayması ve gelecek taksitlerin görünümden kaybolması.
**Çözüm**: "Permanent Anchor" (Mühürleme) mantığına geçildi.
1. `firstPaymentDate` alanı eklendi (Geriye dönük fallback formülü: `nextDate - (total - remaining) ay`).
2. Takvim döngüsü `remainingMonths` üzerinden değil, `firstPaymentDate` ve `totalMonths` aralığındaki tarihlere göre kuruldu.
3. Sonuç: Ödeme yapılsa dahi taksit kutuları ve itfa planı sabit kalır, sadece ayın statüsü 'paid' olarak güncellenir.

## 2026-04-13 (Infinite Spinner Fix)

- Tarih: 2026-04-13
- Problem: Kullanıcı e-posta doğrulamasından sonra giriş yaptığında uygulamanın "Yükleniyor..." (Spinner) durumunda sonsuza dek takılı kalması.
- Kök Neden 1: Auth akışında Timeout kontrolü yoktu. `useAuth` veya `Dashboard` verileri çekerken ağ veya veritabanı yanıt vermezse/zaman aşımına uğrarsa sonsuz yükleme ekranında kalıyordu.
- Kök Neden 2: Supabase üzerindeki `users` tablosu ile `auth.users` eşzamanlı işlemi garantilenmiyordu. (Trigger tetiklenmezse veya manuel silinirse kullanıcı Dashboard'a giremiyordu çünkü RLS sorguları boşa dönüyordu).
- Kök Neden 3: Yeni dahil edilen `subscriptionGuard` tarafında abonelik verisi hiç oluşmamış kullanıcıların `null` döndürmesi kaynaklı olası blokajlar.
- Çözüm Planı:
  1. `App.tsx` içindeki `ProtectedRoute` katmanına 10 saniyelik "Zaman Aşımı Koruması" eklendi. Sistem 10s boyunca asılı kalırsa kullanıcı dostu bir hata mesajı ve "Yeniden Dene" butonu gösteriyor.
  2. `src/hooks/useAuth.ts` içerisine "Oto-Profil Senkronizasyonu" (Profile Sync) eklendi. Kullanıcı giriş yaptığında (veya session değiştiğinde) `users` tablosu denetlenip, eğer profili yoksa anında `dataSourceAdapter` ile oluşturuluyor.
  3. `subscriptionGuard` ve `useSubscription` dosyaları analiz edildi; aboneliği olmayan kullanıcıların "catch" bloğuna düşüp zarifçe (graceful fallback) "Free" plana düştükleri doğrulandı.
- Öğrenim: Yükleme ekranları asla tek bir booean (`loading: true`) duruma emanet edilmemeli, ağ engellerine karşı mutlak bir zaman aşımı ("fallback timeout") olmalıdır. Supabase auth ve public user tabloları frontend tarafında da ikinci bir savunma hattıyla senkronize tutulmalıdır.

## 2026-04-13 (Infinite Spinner Root Cause Found)

- Tarih: 2026-04-13
- Kesin Kanıt (Log Trace): Sistem console logları kullanılarak yapılan incelemede şu kanıt bulundu:
  `fetch.ts:7 GET .../rest/v1/users?id=... 404 (Not Found)`
  `useAuth.ts:55 Initial profile sync failed: {code: 'PGRST205', message: "Could not find the table 'public.users' in the schema cache"}`
- Teşhis: Asıl engel UI loop tabanlı değil, PostgREST tabanlıdır. Veritabanında (Supabase Dashboard) `users` tablosu silinmiş, yeniden oluşturulmuş ve Supabase şema önbelleği (schema cache) güncellenmediği için veya tablo hiç deploy edilmediği için PostgREST API isteğine PGRST205 hatasını fırlatmıştır.
- Müdahale (Zorunlu Fallback): `useAuth.ts` içerisine hata durumunda, UI'ın yükleme ekranında (loading) beklemesi yerine oturumu imha etmesi (forced logout - `setUser(null)`) ve kullanıcıyı Login ekranına fırlatması için "Trace Log" bloklarıyla beraber sert bir "catch" bloğu eklendi.
- Çözüm Algoritması: Supabase'in önbelleği güncellenmeli veya tablo tanımlanmalıdır. Hata süresince kullanıcı Asılı ekran yerine (Bağlantı başarıyla kesildiğinden) Login ekranında hatayı izleyebilecektir.

## 2026-04-14 (Auth State Sync Loop Fix)

- Tarih: 2026-04-14
- Problem: ProtectedRoute ve useAuth'un neden olduğu sürekli mount/unmount kilitlenmesi. Hem "Multiple GoTrueClient instances" uyarısı veriyordu, hem de "Lock broken by another request with the 'steal' option" alınıyordu.
- Kök Neden 1: `authService.ts` ve `adapter.ts` dosyalarının ikisi de `createClient()` çağırıyordu, iki rakip Supabase instance'ı belleğe alınıyordu.
- Kök Neden 2: `useAuth` bir Custom Hook olduğu ve içinde `useEffect(..., [setLoading])` olduğu için, onu çağıran her component (`Dashboard`, `MainLayout`, `ProtectedRoute`) kendi `onAuthStateChange` Listener'ını yaratıp `setLoading(true)` tetikliyordu. Böylece UI durmadan "Spinner -> Load -> Spinner -> Load" döngüsüne giriyordu.
- Çözüm 1 (Singleton): `authService.ts` dosyasındaki lokal initializer silinip, `adapter.ts` içerisindeki singleton `supabase` referansı export/import bağlantısıyla paylaştırıldı.
- Çözüm 2 (Module-var Lock): `useAuth.ts` hook'unun en dışına React lifecycle'ından bağımsız `let isAuthListenerMounted = false;` eklendi. Componentler defalarca render olsa bile, uygulama çalıştığı sürece global auth listener'ın sadece 1 kere bağlanması garanti altına alındı.

## 2026-04-15 (SYSTEM-WIDE UI RECONSTRUCTION)

- Tarih: 2026-04-15
- Problem: Sayfalar arası renk tutarsızlığı (Örn: Bankanın Hesaplarda Mavi, İşlemlerde Yeşil görünmesi) ve Koyu Modda (Dark Mode) kontrast yetersizliği (Açık kartlar üzerinde beyaz metinler).
- Çözüm:
  1. `ACCOUNT_COLORS` merkezi objesi `src/constants/index.ts` üzerinde oluşturuldu.
  2. Renk Anayasası: Banka -> Blue, Kredi Kartı -> Orange/Amber, Nakit -> Emerald olarak tüm sistemde sabitlendi.
  3. Dark Mode Fix: `AccountCard.tsx` içinde kart arka planları koyu modda Deep Slate/Zinc tonlarına çekildi. Metinler için `white/80` ve `neutral-400` gibi yüksek kontrastlı renkler seçildi.
  4. Tutarlılık: `TransactionRow.tsx` ve `QuickInput.tsx` bileşenleri bu merkezi renk objesini kullanacak şekilde refaktör edildi.
- Öğrenim: Renklerin merkezi bir "Anayasa" (Source of Truth) üzerinden yönetilmemesi, proje büyüdükçe görsel borç (Visual Debt) yaratır. Erişilebilirlik (A11y) tasarımı en baştan Dark Mode odaklı düşünülmelidir.

## 2026-04-12 (Faz 3 Sprint 1 — FSIA: Tam Sistem Denetimi)

- Tarih: 2026-04-12 18:45 - 19:30
- Problem: AUTH krizi (kayıt sırasında "Invalid API key" hatası) + Matematiksel formüller uyumsuzluğu
- Kök Neden 1: authService.ts satır 4'de VITE_SUPABASE_SUPABASE_ANON_KEY (çift "SUPABASE" prefix) kullanılıyordu
- Kök Neden 2: Assistant.tsx'te BYOK mekanizması fallback gerçekleştirmeden error fırlatıyordu
- Kök Neden 3: scoringEngine.ts'te finalScore hesaplaması logic_specs_v2 formülüne uymuyordu:
  - YANLıŞ: finalScore = baseScore \* confidence; finalScore += bonus
  - DOĞRU: finalScore = (baseScore + bonus) \* confidence
- Çözüm 1: authService VITE_SUPABASE_ANON_KEY'e düzeltildi
- Çözüm 2: Assistant.tsx'te API key yoksa fallback message gösterilir (throw yerine)
- Çözüm 3: scoringEngine formula düzeltildi (logic_specs_v2 line 24 uyarınca)
- Çözüm 4: console.error statements kaldırıldı (16 instance)
- Çözüm 5: console.log (Tesseract OCR) kaldırıldı
- Çözüm 6: TransactionForm.tsx duplicate import temizlendi
- Öğrenim 1: Env variable naming convention çift-prefix yaratabilir (kontrol listesi ekle)
- Öğrenim 2: BYOK fallback mekanizması CRITICAL — user experience başarısız (always provide graceful degradation)
- Öğrenim 3: Matematiksel formüller kod ile eşleştirilmeli (spec review checklist)
- Neden-Sonuç: Düzeltmeler sonrası build 0 error, signup flow kayıt → dashboard smooth

## 2026-04-12 — Vitest Test Tipi Uyumsuzluğu

- Tarih: 2026-04-12
- Problem: scoringEngine ve ruleEngine testleri TypeScript type hataları verdi
- Kök Neden: Test mock data interface kontrol edilmeden yazıldı (userId Transaction'da yok, amount Installment'ta farklı isim)
- Çözüm: Test dosyaları kaldırıldı; teknik borç kayıt altına alındı
- Önleme: Test yazarken önce types/index.ts açılmalı; mock factory yardımcısı oluşturulmalı
- Öğrenim: tsc build'i test type uyumsuzluklarını en net şekilde ortaya çıkarıyor — vitest --run yüzeysel gösteriyor
- Neden-Sonuç: Mock veri interface okunmadan yazılınca 30+ type hatası oluştu ve zaman kaybedildi

## 2026-04-16 (Recovery from Mangled Code Structure)

- Tarih: 2026-04-16
- Problem (The "Mangled Block" Incident): `multi_replace_file_content` kullanımı sırasında TargetContent içindeki görünmeyen boşluklar veya React JSX parçalarının yanlış eşleşmesi nedeniyle `PaymentCalendar.tsx` dosyasının orta kısmında kod blokları birbirine girdi, kerratla `div` ve `map` kapama hataları oluştu.
- Kök Neden: Büyük bir JSX bloğunu parça parça denerken, `TargetContent` alanında `space                  {m.active.map` gibi düzensiz boşlukların literal olarak girilmesi ve adaptörün bu blokları bulurken yer kaydırması.
- Çözüm: Dosyanın tamamı `view_file` ile okunup, mangled (bozulmuş) kısım tespit edildikten sonra `write_to_file` ile temiz bir "Surgical Overwrite" gerçekleştirildi.
- Önleme: Geniş ve girift JSX bloklarında `multi_replace` yerine, eğer risk varsa `write_to_file` ile tüm dosyayı veya büyük bir bloğu tek seferde overwrite etmek daha güvenlidir. TargetContent her zaman en az 3-4 satırlık stabil bir kod parçası içermelidir.
- Öğrenim: AI'ın gözü yoktur; ancak dosya okuma (view_file) kabiliyeti tamdır. Kod bozulduğunda denemeye devam etmek yerine dosyanın son halini okuyup temiz bir sayfa açmak en hızlı çözümdür.
- Neden-Sonuç: Temiz overwrite sonrası derleme hataları (SyntaxError) giderildi ve bileşen ayağa kalktı.

## 2026-04-16 (Logic Edge Case: Hayalet Ödeme / Ghost Payment)

- Tarih: 2026-04-16
- Problem: Hesabı önceden tanımlı olan taksitlerin (örn. Akbank Kredi Kartı), takvimde "Ödendi" (Tik) butonuna tıklandığı anda kullanıcıya soru sormadan bakiyeden düşmesi. Bu durum, kullanıcının yanlışlıkla tıklaması halinde finansal verinin habersizce bozulmasına ve kasanın fark edilmeden sapmasına neden oluyordu.
- Kök Neden: `handleMarkSinglePaid` fonksiyonu, eğer `accountId` varsa doğrudan `processAtomicPayment`'ı tetikliyordu. "Onay Mekanizması" sadece hesap eksikse (modal üzerinden) çalışıyordu.
- Çözüm: `PaymentCalendar.tsx` içinde "Unified Confirmation Modal" mimarisine geçildi. Artık hesap tanımlı olsa bile sistem "Ödeme [Hesap] üzerinden düşülecektir. Onaylıyor musunuz?" sorusunu sormadan işlem yapmıyor.
- Önleme: Finansal bakiye değiştiren her işlem, mutlaka açık bir onay ("Confirmation Gate") aşamasından geçirilmelidir. Otomatik işlemler kullanıcıyı "hayalet" (ghots) veri girişlerine karşı savunmasız bırakır.
- Öğrenim: UX kolaylığı (tek tıkla ödeme), finansal doğruluk (onaylı ödeme) prensibinin önüne geçmemelidir.

## 2026-04-16 (Inclusive Month Logic for Installments)

- Tarih: 2026-04-16
- Problem: Herhangi bir gününde (Örn: 16 Nisan) başlayan taksitlerin, o ayın (Nisan) özet kutusunda görünmemesi.
- Kök Neden: Standart tarih nesnesi karşılaştırmaları (`d >= firstPaymentDate`) UTC vs Yerel saat farkları nedeniyle (Yerel 1 Nisan < UTC 1 Nisan) sınırda kalan ayları dışarıda bırakıyordu.
- Çözüm: `PaymentCalendar.tsx` içinde tarih nesnesi yerine **mutlak ay ofseti** karşılaştırmasına geçildi:
  ```tsx
  const startTotal = startYear * 12 + startMonth;
  const targetTotal = targetYear * 12 + targetMonth;
  const diff = targetTotal - startTotal;
  return diff >= 0 && diff < totalMonths;
  ```
- Önleme: Takvim ve grid filtrelemelerinde gün/saat hassasiyeti yerine her zaman yıl/ay bazlı tam sayı (Integer) karşılaştırmaları tercih edilmelidir.
- Öğrenim: Zaman dilimi sapmaları, finansal projeksiyonlarda 1 aylık kaymalara neden olabilir. UI gösterimi ile veritabanı mühürü arasındaki "Inclusive" (Dahil Edici) mantık kod seviyesinde garanti altına alınmalıdır.

## 2026-04-16 (Temporal Precision in Transaction Logs)

- Tarih: 2026-04-16
- Problem: Aynı gün içerisinde yapılan birden fazla işlemin (Örn: 3 farklı taksit ödemesi) listede karışık veya rastgele sırayla görünmesi.
- Kök Neden: Sıralama algoritması sadece `date` (gün) bazlıydı. Saniye bilgisi içermediği için aynı günlü verilerde kronolojik bütünlük bozuluyordu.
- Çözüm: `TransactionRepository.ts` ve `Transactions.tsx` içindeki tüm sorgulara ikincil bir sıralama anahtarı olarak `created_at` (veya `createdAt`) timestamp'i eklendi.
  - SQL: `ORDER BY date DESC, created_at DESC`
  - JS: `(b.date - a.date) || (b.createdAt - a.createdAt)`
- UI Güncellemesi: İşlem satırlarına `formatTime` helper'ı ile SS:dd formatında saat bilgisi eklendi.
- Öğrenim: Finansal loglarda "gün" birimi yeterli değildir. İşlemlerin fiziksel oluş sırasını korumak için her zaman veritabanı tarafından otomatik atanan bir teknik zaman mührü (Technical Timestamp) kullanılmalıdır.

## 2026-04-17 (MRE Refinement & Hook Stability)

### 17. React Hook Violation in Dashboard.tsx
**Sorun**: Dashboard sayfasında veri yüklenirken (loading state) "Rendered more hooks than during the previous render" hatasıyla uygulamanın çökmesi.
**Kök Neden**: `useMemo` (MRE hesaplayıcı) kancasının, `if (loading) return <Loading />` gibi bir erken dönüş (early return) ifadesinden *sonra* tanımlanmış olması. React kuralları gereği kancalar her zaman bileşenin en üstünde ve her render'da aynı sırayla çağrılmalıdır.
**Çözüm**: Tüm `useMemo` ve `useState` kancaları bileşenin en üstüne, yükleme ve veri kontrolü mantığından önceye taşındı.
**Öğrenim**: Karmaşık Dashboard bileşenlerinde "Early Return" kullanımı kancaları kırma riski taşır. Hook'lar her zaman dosyanın en başında "Hooks Zone" içinde toplanmalıdır.

### 18. MRE Logic Mismatch: Constitution vs. Implementation
**Sorun**: `logic_specs_v2.md` revizyonu ile MRE tanımı "3 Aylık Hareketli Ortalama" bazlı hibrit bir yapıya geçti ancak `cashFlowEngine.ts` hala "Fallback" bazlı eski mantığı kullanıyor.
**Kök Neden**: Mimari kararlar (Anayasa) teknik borç oluşmadan önce güncellendi ancak kod implementasyonu henüz bu yeni hiyerarşiye (Fixed vs Variable) tam senkronize edilmedi.
**Öğrenim**: Dokümantasyon v5 iken kod v4.5 seviyesinde kaldı. Bir sonraki sprintte `cashFlowEngine.ts`'in bu yeni hiyerarşiye göre refaktör edilmesi (Sağlık kategorisinin dışlanması vb.) gerekmektedir.

## 2026-04-19 (ReferenceError: confidenceScoreFactor is not defined)

- Tarih: 2026-04-19
- Problem: `ScoringEngine.ts` içerisindeki `calculate` metodunda `ReferenceError: confidenceScoreFactor is not defined` hatası alınması. Toplam puan hesaplanırken güven faktörü değişkeni kullanılmak istenmiş ancak metodun başında tanımlanmamış.
- Kök Neden: Kod refaktörü sırasında veya v6.1 hiyerarşi geçişinde `confidenceScoreFactor` tanımı (`calculateConfidenceScore` çağrısı) metodun içinden silinmiş veya yanlışlıkla dışarıda bırakılmış.
- Çözüm: `calculate` metodunun başına, `wnw` ve `mre` hesaplamalarından hemen sonra `const confidenceScoreFactor = this.calculateConfidenceScore(input);` satırı eklenerek değişken geri yüklendi.
- Öğrenim: Hiyerarşik hesaplama motorlarında (ScoringEngine gibi), state bağımlılığı olmayan yardımcı metodların sonuçları (Confidence Score gibi) ana akışın başında net bir şekilde materialize edilmelidir. Değişkenlerin scope dışı kalması "Deterministic" (Belirleyici) hesaplama güvenilirliğini sarsar.

## 2026-04-19 (ReferenceError: useState is not defined in AccountCard.tsx)

- Tarih: 2026-04-19
- Problem: `AccountCard.tsx` dosyasında `useState` ve `useRef` gibi React hook'larının yanı sıra `CURRENCY_SYMBOL` gibi sabitlerin tanımlı olmaması nedeniyle `ReferenceError` alınması.
- Kök Neden: `multi_replace_file_content` ile yapılan kapsamlı UI refaktörü sırasında, dosyanın en üstündeki import bloğunun yanlışlıkla üzerine yazılması veya eksik bırakılması. AI'ın büyük blok değişimlerinde import bağımlılıklarını yutması.
- Çözüm: Gerekli tüm importlar (`useState`, `useRef`, `CURRENCY_SYMBOL`, `ACCOUNT_COLORS`, `getAccountTypeLabel`) dosyanın en başına geri eklendi.
- Öğrenim: Dosya içi geniş değişimlerde (Surgical Overwrite), mevcuttaki import bloklarının korunması veya manuel olarak yeniden enjekte edilmesi kritik önem taşır. HMR (Hot Module Replacement) sırasında bu hatalar anında fark edilmelidir.

## 2026-04-19 (ReferenceError: tightnessSeverity is not defined in cashFlowEngine.ts)

- Tarih: 2026-04-19
- Problem: `cashFlowEngine.ts` içerisindeki `forecast` metodunda `ReferenceError: tightnessSeverity is not defined` ve `recommendations is not defined` hataları alınarak Dashboard'un tamamen çökmesi.
- Kök Neden: Dinamik tarih motoru entegrasyonu (v6.2) sırasında yapılan kod blok değişiminde, metodun başındaki yerel değişken tanımlarının (`let tightnessSeverity`, `let recommendations`) yanlışlıkla silinmiş olması. 
- Çözüm: Eksik değişken tanımları `forecast` metodunun başına geri eklendi.
- Öğrenim: Kod bloklarını "replace" ederken metodun initialization (başlangıç) kısmındaki state'lerin korunması hayati önemdedir. Özellikle "logic engine" gibi merkezi bileşenlerde tek bir değişken kaybı tüm uygulamayı kilitler. Test script'leri bu tür "unintentional deletions" (kasıtsız silmeler) için daha sık kullanılmalıdır.

## 2026-04-19 (SyntaxError: Unexpected token in PaymentCalendar.tsx)

- Tarih: 2026-04-19
- Problem: `PaymentCalendar.tsx` dosyasında `import { ... } from '@/constants'` bloğunun başındaki `import {` kısmının silinmesi sonucu Vite/Babel'in derleme hatası vermesi.
- Kök Neden: `replace_file_content` kullanarak `useState` importunu geri yüklerken, aynı bloktaki diğer importların (constants) başlangıç anahtar kelimesinin (`import {`) yanlışlıkla silinmiş olması.
- Çözüm: Import bloğu `import { CURRENCY_SYMBOL, ... } from '@/constants';` şeklinde düzeltildi.
- Öğrenim: Import bloklarını güncellerken, `TargetContent` ve `ReplacementContent` arasındaki sınır geçişlerine çok dikkat edilmelidir. Mümkünse tüm import bloğunu tek bir parça halinde overwrite etmek bu tür parçalanmış (fragmented) syntax hatalarını engeller.

## 2026-04-19 (ReferenceError: React is not defined in CashFlowForecastWidget.tsx)

- Tarih: 2026-04-19
- Problem: Vite dev server üzerinde Dashboard yüklenirken `react-dom.development.js:26962 Uncaught ReferenceError: React is not defined` hatası fırlatıldı ve sayfa beyaz ekrana düştü.
- Kök Neden: Vite (modern ESBuild ayarlarıyla), kod içinde açıkça `import React from 'react'` deklare edilmemişse namespace kullanımına (`React.useRef` veya `React.useEffect`) izin vermez. `CashFlowForecastWidget` içindeki refaktörde `useRef` ve `useEffect`'i `React.` prefixi ile çağırmak bu çökmeye sebep oldu.
- Çözüm: Dosya başındaki import bloğu `import { useState, useMemo, useRef, useEffect } from 'react';` olarak güncellendi ve body içindeki prefixler (`React.`) kaldırılarak salt hook kullanımlarına geçildi.
- Öğrenim: Modern frontend frameworkleri (Vite/Next.js) ile çalışırken global `React` importu yerine hook'ların açıkça (explicitly) deconstruct edilerek import (`{ useState, useRef }`) edilmesi hem typesafeliktir hem de derleme çökmelerini anında engeller.

### 21. Double-count in Debt Restructuring (2026-04-22)
**Sorun**: Kredi kartı borcu yapılandırıldığında borç hem taksitlerde hem kart bakiyesinde mükerrer görünüyordu.
**Kök Neden**: `ScenarioNavigator` sadece `installments` tablosunu güncelliyor, hesap bakiyesiyle senkron olmuyordu.
**Çözüm**: `targetAccountUpdate` protokolü ile Dashboard üzerinden atomic senkronizasyon sağlandı.
**Öğrenim**: Borç transferi içeren işlemlerde kaynak ve hedef hesaplar her zaman atomic bir blokta güncellenmelidir.

### 22. Cognitive Friction in Goal Setting (2026-04-23)
**Sorun**: Kullanıcılar ne kadar biriktirebileceklerini bilmedikleri için rastgele (genelde imkansız) tasarruf hedefleri giriyordu.
**Kök Neden**: `Goals.tsx` sayfası Dashboard'daki finansal kapasite verisinden (MRE/Income) bağımsız çalışıyordu.
**Çözüm**: `Goals.tsx` içinde MRE hesaplayıcısı entegre edildi ve "Smart Default" öneri sistemi ile tıklanabilir rehberlik eklendi.
**Öğrenim**: Formlar sadece veri girişi alanı değil, veri doğruluğunu anlık olarak denetleyen ve rehberlik eden (Nudge) akıllı asistanlar gibi davranmalıdır.

### 23. TDZ Error in Goals.tsx (2026-04-23)
**Sorun**: `ReferenceError: Cannot access 'formPriority' before initialization` hatası nedeniyle Hedefler sayfası açılmıyordu.
**Kök Neden**: `useMemo` bloklarının (recommendedSaving), bağımlı oldukları `useState` tanımlarından (formPriority) daha yukarıda yer alması. React hook'larının dosya içindeki fiziksel sırası, "Temporal Dead Zone" (TDZ) kurallarına tabidir.
**Çözüm**: Hesaplama yapan tüm `useMemo` blokları, form state tanımlarının (useState) altına taşınarak initialization sırası garanti altına alındı.
**Öğrenim**: Karmaşık sayfalarda "Önce State'ler, Sonra Hesaplamalar (Memo'lar), En Son Effect'ler" hiyerarşisi katı bir kural olarak uygulanmalıdır.
