# technical_debt.md
Her 3 görevde bir gözden geçirilir.

## Kayıt Şablonu

## 2026-04-12 (Sprint 1 Finali — Görev 14, 15)
- Kaynak Görev: 14 & 15 (Taksit + Borç Merkezi)
- Borç Tanımı: monthlyIncome state'i oturum kaybında sıfırlanıyor
- Etki: Kullanıcı her sayfayı yenileyince Kapasite ve Borç/Gelir oranı hesaplaması için gelirini yeniden girmek zorunda kalıyor
- Öncelik: Orta
- Çözüm Planı: Auth sistemi kurulduğunda user_profiles tablosuna monthly_income kolonu eklenecek; otomatik gelir hesabı transaction geçmişinden yapılacak
- Hedef Tarih: Sprint 2 — Auth & Onboarding
- Durum: Açık

- Kaynak Görev: Tüm Sprint 1
- Borç Tanımı: TEMP_USER_ID = 'temp-user-id' tüm repository çağrılarında hardcoded
- Etki: Multi-kullanıcı desteği yok, gerçek auth olmadan RLS etkisiz
- Öncelik: Yüksek
- Çözüm Planı: Supabase Auth entegrasyonu → auth.uid() ile kullanıcı ID alınacak
- Hedef Tarih: Sprint 2 — Auth sistemi
- Durum: Açık

## 2026-04-12
- Kaynak Görev: 12 & 13
- Borç Tanımı: SQLite'ta karmaşık matematiksel işlemler (Çok katmanlı skor formülleri)
- Etki: SQLite üzerinde yüksek CPU yükü veya yavaşlama tehlikesi
- Öncelik: Orta
- Çözüm Planı: Karmaşık hesaplamaların uygulamanın (Tauri Rust / TypeScript) tarafında yapılması.
- Hedef Tarih: Faz 2
- Durum: Açık
- Tarih:
- Kaynak Görev:
- Borç Tanımı:
- Etki:
- Öncelik: Düşük/Orta/Yüksek
- Çözüm Planı:
- Hedef Tarih:
- Durum:

## Kurallar
- Geçici çözüm kalıcı bırakılmaz.
- Mimariyi bozan kısa yollar yasaktır.
- Borç varsa backlog'a görev açılır.
