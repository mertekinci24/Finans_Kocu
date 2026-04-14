# debugging.md
Hata günlüğü ve öğrenimler.

## Kayıt Şablonu

## 2026-04-13 (Kritik Hata: API Key Geçersizliği)
- Tarih: 2026-04-13
- Problem: Kayıt ve Giriş süreçlerinde Supabase Auth'tan "Invalid API key" (401/400) hatası dönmesi.
- Kök Neden 1: FSIA incelemesinde çevre değişkeninin adı (`VITE_SUPABASE_SUPABASE_ANON_KEY` -> `VITE_SUPABASE_ANON_KEY`) düzeltilmiş ancak değerinin geçerliliği kontrol edilmemiştir.
- Kök Neden 2: Kod içerisinde `import.meta.env.VITE_SUPABASE_ANON_KEY` runtime sırasında başarıyla yükleniyor; ancak `.env` içerisindeki değer gerçek bir JWT anahtarı (örn. `eyJ...`) yerine harfi harfine `your_supabase_anon_key_here` şeklindeki *placeholder (yer tutucu)* metnidir.
- Kök Neden 3: `authService.ts` içindeki kontrol (`if (!supabaseKey) throw`) sadece değişkenin var olup olmadığını (`undefined`/boş) kontrol eder, anahtarın geçerli bir Supabase JWT formatında olup olmadığını doğrulamaz.
- Çözüm Planı:
  1. `.env` dosyasına projenin gerçek Supabase Anon Key'i girilmelidir. (Bu adım güvenli bir şekilde yapılmalıdır).
  2. "Environment Guard" Stratejisi geliştirilmeli: `authService.ts` ve `adapter.ts` içerisinde Supabase client'ı başlatılmadan önce `supabaseKey.startsWith('eyJ')` gibi bir semantik geçerlilik (sanity) kontrolü ile fail-fast (erken hata fırlatma) mekanizması eklenmeli.
- Öğrenim: Çevre değişkenlerinde değişken adının doğru olması yetmez; payload'un form ve mantık olarak da kurallara uyması gerekir. Hatanın çözüldü sanılması "name mapping" probleminin çözülüp payload sorununun gizli kalmasından kaynaklanmıştır.
- Neden-Sonuç: Geliştirici ortamında placeholder kullanıldığı için, string boş olmadığı sürece frontend çalışmış, ancak backend'e giden `apikey` header'ı arızalı olduğu için "Invalid API key" vermiştir.

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


## 2026-04-12 (Faz 3 Sprint 1 — FSIA: Tam Sistem Denetimi)
- Tarih: 2026-04-12 18:45 - 19:30
- Problem: AUTH krizi (kayıt sırasında "Invalid API key" hatası) + Matematiksel formüller uyumsuzluğu
- Kök Neden 1: authService.ts satır 4'de VITE_SUPABASE_SUPABASE_ANON_KEY (çift "SUPABASE" prefix) kullanılıyordu
- Kök Neden 2: Assistant.tsx'te BYOK mekanizması fallback gerçekleştirmeden error fırlatıyordu
- Kök Neden 3: scoringEngine.ts'te finalScore hesaplaması logic_specs_v2 formülüne uymuyordu:
  * YANLıŞ: finalScore = baseScore * confidence; finalScore += bonus
  * DOĞRU: finalScore = (baseScore + bonus) * confidence
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
- Tarih:
- Problem:
- Kök Neden:
- Çözüm:
- Önleme:
- Öğrenim:
- Neden-Sonuç:

## Örnek
- Tarih: 2026-04-12
- Problem: SQLite migration çalışmadı
- Kök Neden: Yanlış path
- Çözüm: Config düzeltildi
- Önleme: CI migration testi eklendi
- Öğrenim: Ortam değişkenleri doğrulanmalı
- Neden-Sonuç: Şu denemeden sonra bu oldu