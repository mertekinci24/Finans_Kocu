# FinansKoçu — 3 Görsel Sprint (MVP Yol Haritası)

**Kullanıcı Perspektifinden: "Bu ayın sonunda ne görmüş olacağım?"**

---

## SPRINT 1: Görsel Temel — "İlk 5 Gün"
### *"Uygulamayı aç, hesabım görünüyor, işlem girebiliyorum"*

**Zaman Çerçevesi:** Adımlar 9–11 (Tasks.md)
**Kullanıcı Hedefi:** Uygulamada 3 muş gibi hissetmek

| Ekran | Açıklama | Neden İlk? | Ne Göreceksin |
|-------|----------|-----------|---------------|
| **Dashboard** | Ev sayfası | Giriş yeri; burada ilk 5 saniyede değer görmeli | • 3 hesabının bakiyesi (Maaş: ₺12.500, Kredi Kartı: ₺3.200 kullanılabilir, Nakit: ₺850)<br>• Ay başından buğüne: Gelir ₺12.500, Gider ₺9.800, Net +₺2.700<br>• Sağlık Skoru: 65/100 (renk: sarı — normal)<br>• Yaklaşan ödemeler: Kredi kartı ödeme 25 Nisanda |
| **Hesap Listesi** | Tüm hesaplar bir sayfada | Çok hesaplı yaşam Türkiye'de standart | • Kart: Garanti (dropdown banka seçim)<br>• Nakit: El Kasası<br>• Banka: Ziraat Bankası<br>• Her bir hesabın adı, türü, bakiyesi, son güncelleme tarihi<br>• Düzenle/Sil butonları (soft delete) |
| **Yeni Hesap Modal** | Hesap ekle formu | İlk kurulumda gerekli | • Hesap adı (ör: "Çalışma Maaşı")<br>• Hesap türü: nakit / banka / kredi_kartı (radio)<br>• Banka adı (dropdown — Garanti, İş, Ziraat, Vakıfbank, Akbank, YKB, ING, Fibabanka, QNB, Denizbank)<br>• İlk bakiye (₺ girdisi)<br>• Kredi Kartı limit (opsiyonel)<br>• Kaydet/İptal |
| **Hesap Düzenleme Modal** | Mevcut hesap güncelleme | Bakiye değişiklikleri, limit ayarı | • Tüm alanlar düzenlenebilir (adı hariç)<br>• Bakiye güncelleme (pozitif olmalı)<br>• Sil butonunda "Emin misin?" onayı (soft delete) |
| **Hızlı İşlem Kutusu** | Gidiş gelişte işlem girişi | Günlük alışkanlık kuru | • Input: "3500 market" yazıp Enter<br>• Kategori otomatik önerilir (market + gelir/gider radyo)<br>• Tarih: otomatik bugün<br>• Not alanı (opsiyonel)<br>• Kaydet düğmesi<br>• Geçmiş 5 işlem listesi |
| **İşlem Listesi** | Ay boyunca işlemler | Neler harcandığı görmek | • Tablo: Tarih, Açıklama, Kategori, Tutar, Gider/Gelir<br>• Ayı seçme (dropdown) / Tümü<br>• Gelir toplam / Gider toplam<br>• Sırala: Tarihe göre (yeni → eski) |
| **Taksit Merkezi (Temel)** | Aktif taksitler sayfası | TR özel; global rakipler yok | • Taksit tablosu: Kart, Mağaza, Tutar, Kalan Taksit, Aylık Yük<br>• Bu ay toplam taksit yükü: ₺1.250<br>• Gelirin %kaçı taksitte: %12<br>• Uyarı (eğer >%30): "Taksit yükünüz yüksek" |
| **Borç Merkezi (Temel)** | Kredi borçları listesi | Kullanıcının kaygı noktası #1 | • Tablo: Borç Sahibi, Tutar, Kalan, Aylık Ödeme, Kapanış Tarihi<br>• Duruma göre renk: Aktif (yeşil), Riskli (kırmızı)<br>• Toplam borç: ₺45.000<br>• Tahmini bitişi: 24 ay |

**Sonuç:** Kullanıcı uygulamayı açıyor → 30 saniye içinde "Aha! Tüm belgelerim bir yerde" diyebiliyor. Basit, temiz, hızlı.

---

## SPRINT 2: Finansal Hareket — "İlk 2 Hafta"
### *"Para giriş çıkışı otomatik kategori oluyor, banka ekstresini yükleyebiliyorum"*

**Zaman Çerçevesi:** Adımlar 10–12 (Tasks.md)
**Kullanıcı Hedefi:** Günlük finansal alışkanlık kurma

| Ekran | Açıklama | Neden Sonra? | Ne Göreceksin |
|-------|----------|------------|---------------|
| **Gelir/Gider Form (Detaylı)** | İşlem ekleme modal | Sprint 1 seçim sonrası | • Hesap seçim (dropdown)<br>• Tür: Gelir / Gider (radio)<br>• Kategori (dropdown): Maaş, Bonus, Market, Ulaşım, Fatura, Abonelik, Taksit, vb.<br>• Tutar (TL girdisi)<br>• Tarih (datepicker)<br>• Açıklama/Not<br>• Tekrarlayan? (checkbox — "Aylık tekrar")<br>• Kaydet/İptal |
| **Kategori Sistemi** | Kategori CRUD (arka plan) | İşlem girişi akışkın olsun | • Önceden tanımlı 20 kategori (Market, Ulaşım, Fatura, Abonelik, Taksit, Maaş, Bonus, vb.)<br>• Türkçe isimleri<br>• Kullanıcı özel kategori ekleyebilir<br>• Kategori düzenleme / silme |
| **Banka Ekstresi Yükleme** | PDF/Excel upload | Her ay manual giriş çok sıkıcı | • Sürükle-bırak alan: "Ekstrenizi buraya sürükleyin"<br>• Dosya seçim butonu (PDF, Excel)<br>• Parsing başlıyor (ilerleme çubuğu)<br>• Çıkan işlemler: { Tarih, Açıklama, Tutar, Tip }<br>• Otomatik kategori önerisi (%70 doğruluk)<br>• Onay öncesi düzenleme seçeneği<br>• "Bunları içe aktar" düğmesi |
| **İşlem Düzenleme/Silme** | Listedeki işlemi değiştir | Hatalı giriş düzeltme | • Satırda tıklayınca inline modal<br>• Kategori, tutar, tarih, açıklama değişebilir<br>• Sil düğmesi → "Emin misin?" uyarısı<br>• Geri Al (Undo): Son 5 silme geri alınabilir |
| **Kategori Analizi Sayfası** | Kategoriye göre harcama dökümü | "Aylık nereye gitti?" sorusu | • Grafik: Dairesel (pie) / Çubuk (bar) harcamalar<br>• Kategori başına tutar + yüzde<br>• Ay seçimi<br>• Bütçe hedefi (eğer set edildiyse): "Market: ₺2.500 (₺2.800 harcandı, +%12 aşım)" |
| **Bütçe Yönetimi** | Kategoriye göre harcama hedefi | Bilinçli harcama yapma | • Kategori seçimi (dropdown)<br>• Aylık hedef tutarı (ör: Market ₺2.500)<br>• Hedefe kalan (gerçek zamanlı)<br>• Grafik: Hedef vs Gerçek<br>• Ay sonu için tahmin |
| **Taksit Merkezi (Detaylı)** | Taksit ekleme ve yönetim | Taksit izlemesi essensiyel | • Yeni taksit formu:<br>- Kart: dropdown<br>- Mağaza: "A101", "Teknosa" vb.<br>- Toplam tutar<br>- Taksit sayısı (3/6/9/12/24)<br>- Başlama tarihi<br>- Faiz oranı (opsiyonel)<br>• Taksit takvimi: Hangi ay ne kadar ödenecek<br>• Erken kapatma hesabı: "Burada kapatırsan Y TL faiz tasarrufu" |
| **Borç Ekleme/Düzenleme** | Kredi borcu takibi | Borç yönetim merkezi | • Yeni borç formu:<br>- Borçlu: "Garanti Bankası", "Kişisel kredi"<br>- Tutar<br>- Kalan tutar<br>- Aylık ödeme<br>- Faiz oranı<br>- Kapanış tarihi (hesaplanır)<br>- Durumu: aktif / riskli / ödendi<br>• Borç sıralaması: Kapanış tarihine göre / tutar |

**Sonuç:** Kullanıcı banka ekstresini atıyor → otomatik kategori oluyor → taksitleri, borçları giriyor. "Elle tutulur" şekilde finansal gerçeklik görmüş oluyor.

---

## SPRINT 3: Akıllı Koç — "2–4. Haftalar"
### *"Finansal sağlık skorum günlük güncellenüyor, AI uyarılar alıyorum, raporları indirilebiliyorum"*

**Zaman Çerçevesi:** Adımlar 13–18 (Tasks.md)
**Kullanıcı Hedefi:** "Beni para konusunda rehberlik eden birisi var artık"

| Ekran | Açıklama | Neden Son? | Ne Göreceksin |
|-------|----------|----------|---------------|
| **Finansal Sağlık Skoru Detayı** | Composite score + alt skorlar | Sprint 1 temel skordan sonra | • Ana skor: 65/100 (renk göstergesi: 🟢🟡🔴)<br>• Alt skorlar (7 bileşen):<br>- Borç/Gelir Oranı: 32% (ideal <%35) → ✅<br>- Nakit Tamponu: 2 ay (hedef 3 ay) → ⚠️<br>- Tasarruf Oranı: 18% (hedef >%20) → 📍<br>- Taksit/Gelir: 12% (ideal <%30) → ✅<br>- Fatura Disiplini: 100% (0 gecikme) → ✅<br>- Abonelik Yükü: ₺850/ay (%7, ideal <%5) → 📍<br>- Gelir İstikrarı: Düzenli maaş → ✅<br>• Skor grafiği: Son 3 ayın trend (çizgi grafik)<br>• "Skorunu +5 puan artırmak için:" önerileri:<br>  - "Spotify ve Netflix'i sil → +₺180/ay → +3 puan"<br>  - "Taksit bitmesini bekle (2 ay) → +₺300/ay → +7 puan" |
| **Kural Motoru (Uyarılar)** | 8 otomatik finansal analiz | Proaktif rehberlik | • **Harcama Artışı:** "Market harcaman geçen aya göre +%34 arttı"<br>• **Negatif Bakiye Riski:** "Bu gidişatla 22 Nisanda hesabın ₺2K eksiye düşebilir" (uyarı)<br>• **Taksit Yükü:** "Gelirinizin %47'si taksitte — biraz yüksek" (sarı uyarı)<br>• **Abonelik Tespiti:** "Netflix ₺149, Spotify ₺99, YouTube Premium ₺49 → toplam ₺297/ay" (satır satır)\<br>• **Bütçe Aşımı:** "Yemek kategorisi hedefi aştı: ₺800/₺600" (anında bildirim)<br>• **Gelir Sapması:** "Beklenen maaş henüz gelmedi (geç <> +2 gün normal)" (info)<br>• **Fatura Gecikme Riski:** "Elektrik faturası ödenmemiş, son gün 15 Mayıs" (uyarı)<br>• **Tasarruf Fırsatı:** "Bu ay ortalamanın ₺1.200 altında harcadın — havuz'a ekle?" (motivasyon) |
| **Uyarı Paneli / Push Bildirimleri** | Anlık bildirim sistemi | Zamanında aksiyon al | • Mobil: iOS/Android push (opsiyonel, açılır/kapalı)<br>• Web: Sağ üstte bildirim ilgi kutusundan görülür<br>• Her bildirim: Başlık, açıklama, aksiyon linki<br>• Ör: "Kredi kartı limitinin 80%'ini kullandın — kontrol et?" |
| **Finansal Sağlık Raporu (PDF)** | Aylık özet rapor | B2B + danışman kullanımı | • Kapak: Logo, tarih, skor (0–100, başarı açıklaması)<br>• Bölüm 1: Özet (gelir, gider, net, tasarruf)<br>• Bölüm 2: Kategorik dökümü (tablo + grafik)<br>• Bölüm 3: Taksit + Borç özeti (durum, kapanış tarihleri)<br>• Bölüm 4: Finansal sağlık skorları (7 bileşen, trend grafikleri)<br>• Bölüm 5: Uyarılar ve öneriler (kural motoru çıktısı)<br>• Ek: Banka hesapları durumu<br>• İndir butonu: PDF olarak indir |
| **Enflasyon Modu (Sprint 3)** | Reel vs Nominal karşılaştırma | TR'ye özgü — önemli | • Toggle: "Enflasyonu dikkate al"<br>• Reel harcama gösterimi: "Market: ₺2.800 nominal, ₺1.950 reel (%58 enflasyon)\<br>• Kategori enflasyonu: "Market +%68, Ulaşım +%45, Fatura +%52"<br>• Reel tasarruf takibi: "Biriktirmen: ₺10K nominal, ₺4.2K reel" |
| **Sağlık Skoru İyileştirme Planı** | Aksiyon önerileri listesi | Somut iyileştirme adımları | • "6 ayda skorunu 65 → 85'e çıkarmak için:"<br>  1. "Taksit I'i (₺2.200) agresif öde → 3 ayda bitir → +12 puan" (tarih gösterilir)<br>  2. "Abonelik 2 taneyi sil → ₺250/ay → +4 puan" (özel)<br>  3. "Fatura ödeme günü otomatik yap → +3 puan" (fatura disiplini)<br>  4. "Nakit tamponu 2 → 3 aya çıkar (₺2K/ay sparing başla) → +8 puan"<br>• Her adımın öncelik skoru ve zaman çizelgesi |
| **Tema Sistemi** | Light / Dark / AMOLED / Yüksek Kontrast | UX polling ve retention | • Ayarlar > Tema<br>• Seçenekler:<br>  - ☀️ Açık (beyaz + mavi)<br>  - 🌙 Koyu (lacivert + neon)<br>  - ⬛ AMOLED (siyah + neon)<br>  - 👁️ Yüksek Kontrast (siyah/sarı, WCAG AAA)<br>  - 🔄 Sistem (OS tercihi takip)<br>• Tüm uygulamada konsisten tema uygulanır<br>• Kaydetme: localStorage |
| **Onboarding Sihirbazı (İyileştirilmiş)** | 4 adımlı ilk açılış akışı | Yeni kullanıcılar için | Adım 1 (60sn): "Maaş hesabını ekle" → Adım 2 (90sn): "Hızlı işlem yaz (3500 market)" → Adım 3 (30sn): "Skorun 65/100, taksit biraz yüksek" → Adım 4 (90sn): "1 borç gir" → Tamamlandı (konfeti + ilk rozet) |
| **Rapor & Analitik Sayfası** | Tüm raporları bir yerde | Mikro kullanıcı kontrol | • İndirilebilir raporlar listesi (son 12 ay)<br>• Tarih seçim (başla/bitir) – custom rapor oluştur<br>• Seçenek: Sadece bu kategorileri dahil et / Borç ekle / Taksit ekle |

**Sonuç:** Kullanıcı hemen skor düşüşü fark ediyor → AI önerilerini görüyor → "Peki bu abonelikleri silirim" ve taksiti agresif öder. "Skor 68'e çıktı!" diye geri geliyor. Geri geliş loop kuruldu.

---

## Özet Tablo — "Ne Zaman Neyi Göreceksin?"

| **Zaman** | **Sprint** | **Ana Özellikler** | **Kullanıcı Duygusu** |
|-----------|-----------|------------------|---------------------|
| **Gün 1–5** | Sprint 1 | Hesap CRUD, Dashboard, Hızlı İşlem, Taksit & Borç temel listesi | "Oof, tüm belgelerim bir yerde! Basit, hızlı." |
| **Gün 6–14** | Sprint 2 | Gelir/Gider detaylı form, Banka ekstresi yükleme, Kategori sistemi, Taksit & Borç detaylı yönetim | "Ah, artık ekstremden upload edebiliyorum. Elle yazmıyorum. Taksitim açık." |
| **Gün 15–30** | Sprint 3 | Finansal Sağlık Skoru (detay), Kural Motoru (8 uyarı), Enflasyon Modu, PDF Rapor, Tema sistemi, Onboarding | "Bana fiili olarak koçluk yapıyor bu! Uyarılarını alıyorum. Skor arttığında hevesleniyorum." |

---

## İleri Safha (Faz 2+) — *Bunlar MVP'de değil*

| Özellik | Sprint | Neden Daha Sonra? |
|---------|--------|------------------|
| WhatsApp tarzı AI asistan | Faz 2 | Taban uygulaması güçleşince, Findeks'i yazdıktan sonra |
| Findeks rapor yükle & AI yorumla | Faz 2 | OCR (Tesseract) + Claude Sonnet setup gerekir; MVP sürekliliği riskli |
| Bütçe tahmini (ML) | Faz 2 | Veri birikimi gerekli; ilk 30 günde AI yapması erken |
| Mobil uygulama (React Native) | Faz 2+ | Web MVP stabili olduktan sonra |
| Aile bütçesi | Faz 2 | Güvenlik + RLS tasarımı ek çalışma gerektirir |

---

## KRAR VER: Onaylı mı?

Bu roadmap'i bağla mı, başlamaya devam edelim mi?
