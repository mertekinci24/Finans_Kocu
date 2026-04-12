# technical_debt.md
Her 3 görevde bir gözden geçirilir.

## Kayıt Şablonu

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
