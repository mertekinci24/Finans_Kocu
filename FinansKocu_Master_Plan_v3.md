🇹🇷  FinansKoçu
Türkiye'nin Kişisel Finans Koçu
Startup Master Plan  v3.0  —  Türkiye Odaklı & Rafine Edilmiş
"Muhasebe değil — Türk kullanıcısına kontrol hissi ve finansal özgüven.
TL enflasyonuna, taksit kültürüne, Findeks'e hakim bir koç."

1.1  Türkiye'ye Özgü Finansal Gerçekler	1
1.2  v2'den Çıkarılanlar (Türkiye Odağı İçin)	1
2.1  Taksit Merkezi	1
2.2  Findeks & Kredi Raporu Analizi	1
2.3  Enflasyon Modu	1
2.4  Türk Finans Ekosistemi Entegrasyonları	1
2.5  SGK / Vergi / Bağkur Modülü	1
3.1  Maliyet Optimizasyonu: %80/%20 Model	1
3.2  Kural Motoru — Sıfır Maliyetli Analizler	1
3.3  Finansal Sağlık Skoru (0–100)	1
3.4  Findeks PDF Analiz Akışı	1
4.1  Finansal Stres Skoru	1
4.2  WhatsApp Tarzı AI Asistan	1
5.1  MVP Kapsamı (v1.0)	1
5.2  Faz Planı (Türkiye Odaklı)	1
6.1  Onboarding: İlk 5 Dakika Kritik	1
6.2  Hız & Konfor Özellikleri	1
6.3  Tema & Kişiselleştirme	1
7.1  Tech Stack	1
9.1  Değerlendirme Skoru	1
9.2  Kuzey Yıldızı Metriği	1
9.3  Ürün Metrikleri (6. Ay Hedefleri)	1
9.4  İş Metrikleri (12. Ay)	1
12.1  Türkiye'de Kazanma Koşulları	1
12.2  3 Yıllık Yol	1

 
🇹🇷  1. Neden Türkiye Odaklı Strateji?
Türkiye pazar dinamiklerini anlayan ürün, global ürünleri geride bırakır.

1.1  Türkiye'ye Özgü Finansal Gerçekler
Dinamik	Türkiye Gerçeği	Ürün Fırsatı
Enflasyon	TL %50-80 yıllık enflasyon; nominal büyüme yanıltıcı	Reel harcama analizi, enflasyon bazlı bütçe
Taksit Kültürü	Kredi kartı taksiti yaşam biçimi; 12-36 taksit olağan	Taksit yük hesaplayıcısı, yeni alışveriş kapasitesi
Borç Profili	Yüksek kredi kartı kullanımı, tüketici kredisi bağımlılığı	Borç öncelik motoru, ödeme planı optimizasyonu
Kredi Skoru	Findeks kritik; çoğu kullanıcı skorunu bilmiyor	Findeks PDF yorumlama, skor iyileştirme rehberi
Kayıt Dışı Gelir	Serbest meslek & nakit gelir yaygın	Düzensiz gelir takibi, dönemsel tahmin
SGK / Bağkur	Esnaf ve serbest çalışanlar için kritik	SGK / Bağkur prim hatırlatmaları, maliyet dahil bütçe
Vergi	Gelir vergisi, stopaj, KDV karmaşıklığı	Vergi yükü tahmini, e-devlet entegrasyonu yol haritası
Global Rakip Zayıflığı	YNAB, Mint, Money Manager TR lokalizasyonu kötü	Tam Türkçe, TR banka ekstresi, TL çözümler

1.2  v2'den Çıkarılanlar (Türkiye Odağı İçin)
⚠️	Stripe → Kaldırıldı. Yerine: İyzico birincil, Param / Papara alternatif (Türk ödeme altyapısı).
Çoklu dil roadmap → Ertelendi. İngilizce v1.0 sonrasına, ARR 1M TL üstüne bırakıldı.
GDPR birincil → İkinci plana alındı. KVKK birincil; GDPR uyumu ilerleyen fazda.
Global expansion vizyonu → Roadmap'ten çıkarıldı. TR dominance önce, expansion Yıl 2+ sonra.

 
🏦  2. Türkiye'ye Özgü Özellik Seti
Global rakiplerin sunmadığı, Türk kullanıcısının ihtiyaç duyduğu özellikler.

2.1  Taksit Merkezi
Türkiye'de kredi kartı taksiti bir ödeme yöntemi değil, yaşam biçimidir. Taksit Merkezi bu yükü görünür ve yönetilebilir kılar.

Özellik	Açıklama / Kullanıcı Değeri
Taksit Envanteri	Tüm aktif taksitler tek ekranda: kart, mağaza, tutar, kalan taksit sayısı
Aylık Taksit Yükü	Bu ay toplam taksit ödemesi = X TL. Gelirin %Y'i taksitte.
Kapasite Hesaplayıcısı	'Şu an yeni X TL'lik alışveriş yapabilir miyim?' → risk analizi
Taksit Takvimi	Hangi ay ne kadar taksit biter, nakit akışı nasıl değişir
Erken Kapama Analizi	Taksitin erken kapatılması avantajlı mı? Faiz hesabı
Taksit Uyarıları	Yüksek taksit yükü uyarısı: 'Gelirinizin %45'i taksitte, riskli.'

2.2  Findeks & Kredi Raporu Analizi
Kullanıcı PDF veya ekran görüntüsü yükler; sistem OCR ile okur, AI yorumlar, aksiyon önerir.

Desteklenen Doküman	Çıkarılan Veri	AI Yorumu
Findeks Raporu	Kredi skoru, limit kullanım oranı, gecikme geçmişi	'Skorunuz 1320 — riskli bölge. Limit kullanımını %50 altına çekin.'
Banka Ekstresi	Tüm işlemler, bakiye, taksit detayları, para çekme	Otomatik kategorizasyon, harcama anomali tespiti
Kredi Kartı Özeti	Kart borcu, asgari ödeme, faiz tutarı, taksit planı	'Sadece asgari öderseniz X ay sonra bitersiniz ve Y TL faiz ödersiniz.'
SGK / Bağkur Dökümü	Prim borcu, eksik ay, güncel durum	'3 ay prim borcunuz var. Bu ay ödenmezse gecikme zammı başlar.'
Borç Dökümü (BDDK)	Toplam borç, bankalar, gecikme status	Risk özeti ve öncelikli ödeme sıralaması

2.3  Enflasyon Modu
📈	Türkiye'ye özgü kritik özellik: Nominal artış yanıltmamalı.
Örnek gösterim: 'Market harcamanız geçen yıla göre +%32 arttı — ancak enflasyon %58 ise reel olarak -%16 tasarruf ettin.'
Bütçe hedefleri TL nominal değil, reel bazda (TÜFE endeksli) kurulabilir.
Enflasyon verisi: TCMB / TÜİK API beslemesi ile otomatik güncellenir.

Enflasyon Modu Özelliği	Açıklama
Reel Harcama Analizi	Nominal vs reel karşılaştırma, TÜFE bazlı düzeltme
Enflasyon Bazlı Bütçe	Bütçe hedeflerini enflasyona göre otomatik güncelle
Kategori Enflasyonu	Market, fatura, ulaşım için ayrı ayrı enflasyon göstergesi
Reel Tasarruf Takibi	'Nominal 10K TL biriktirdin ama reel değer X TL'ye düştü'
Döviz Modası	USD/EUR'a referans harcama analizi (isteğe bağlı)

2.4  Türk Finans Ekosistemi Entegrasyonları
Entegrasyon	Öncelik	Yöntem
Banka Ekstresi Yükleme	P1 — MVP	PDF/Excel yükleme + OCR parsing (Garanti, İş, YKB, Akbank, Ziraat)
Findeks PDF Analizi	P1 — MVP	OCR + AI yorum modülü
TCMB Enflasyon API	P1 — MVP	Resmi API beslemesi, otomatik güncelleme
İyzico Ödeme	P1 — MVP	TR abonelik ve uygulama içi ödemeler
Papara / Param	P2	Alternatif ödeme yöntemi seçeneği
Open Banking (BKM)	P3 — Faz 5	BDDK onaylı PSD2 benzeri banka bağlantısı
e-Devlet (İleride)	P4	Vergi, SGK, tapu verileri; KVKK uyumu gerektirir

2.5  SGK / Vergi / Bağkur Modülü
•	Aylık SGK prim hatırlatması — serbest meslek ve esnaf için kritik
•	Bağkur prim hesabı — seçilen basamağa göre aylık yük
•	Vergi takvimi — Mart/Temmuz geçici vergi, yıllık beyanname hatırlatması
•	Stopaj takibi — serbest meslek makbuzu kesintileri
•	'Bu ay vergi + SGK dahil gerçek maliyetim kaç TL?' hesabı

 
🤖  3. Hibrit AI Mimarisi
Düşük maliyetli kural motoru + premium LLM kombinasyonu.

3.1  Maliyet Optimizasyonu: %80/%20 Model
Katman	Kapsam	Teknoloji & Maliyet
%80 — Kural Motoru	Harcama artışı tespiti, bütçe aşımı, taksit yükü, nakit akışı tahmini, kategori bazlı anomali	Deterministik kurallar — sıfır API maliyeti
%15 — Açık Kaynak LLM	Türkçe özet, senaryo yorumlama, doküman parsing yardımı	Ollama + Llama 3 / Qwen2.5 / Mistral — self-hosted, sabit maliyet
%5 — Premium LLM	Findeks rapor yorumu, karmaşık senaryo analizi, kişiselleştirilmiş finansal koç yanıtı	Claude Sonnet 4.6 veya GPT-4o — kullanım bazlı, kontrollü

3.2  Kural Motoru — Sıfır Maliyetli Analizler
Bu analizler LLM gerektirmez; deterministik, hızlı ve güvenilirdir.

Kural	Tetikleyici & Çıktı
Harcama Artışı	Kategori geçen aya göre >%20 → 'Market harcamanız %34 arttı'
Negatif Bakiye Riski	30 günlük tahmin eksi çıkıyorsa → 'Ayın 22'sinde hesabınız eksiye düşebilir'
Taksit Yükü Uyarısı	Taksitler gelirin >%40'ı → 'Gelirinizin %47'si taksitte — kritik seviye'
Abonelik Tespiti	Tekrarlayan küçük ödemeler → 'Netflix, Spotify, YouTube Premium aktif — ₺650/ay'
Bütçe Aşımı	Kategori limiti aşıldığında → anlık bildirim
Gelir Sapması	Beklenen gelir gelmemişse → 'Bu ay düzenli geliriniz henüz gelmedi'
Fatura Gecikme Riski	Ödenmemiş fatura varsa → N gün kala hatırlatma
Tasarruf Fırsatı	Geçen ay ortalamanın altında harcandıysa → 'Bu ay X TL tasarruf ettiniz, hedefe ekleyin'

3.3  Finansal Sağlık Skoru (0–100)
Kural motoruna dayalı, gerçek zamanlı hesaplanan kompozit skor. AI gerektirmez.

Alt Skor	Ağırlık	Nasıl Hesaplanır?
Borç / Gelir Oranı	25%	Aylık borç ödemeleri / net gelir. İdeal: <%35
Nakit Tamponu	20%	Acil fon = kaç aylık gideri karşılar? Hedef: 3 ay
Tasarruf Oranı	20%	Aylık tasarruf / gelir. İdeal: >%20
Taksit / Gelir Oranı	15%	Toplam taksit yükü / gelir. İdeal: <%30
Fatura Disiplini	10%	Son 6 ayda gecikme sayısı
Abonelik Yükü	5%	Toplam abonelik / gelir. İdeal: <%5
Gelir İstikrarı	5%	Son 3 ay gelir varyansı

💡	İyileştirme Motoru: Skor düşükse 'Şunu yaparsan +X puan kazanırsın' önerisi üretilir.
Örnek: 'Garanti kartı limitini ₺5.000 düşürürsen borç/limit oranın %78 → %52 olur, +8 puan.'
Örnek: 'Yemek siparişini haftada 1 azaltırsan aylık ₺800 tasarruf, tasarruf oranın %8 → %14 olur, +6 puan.'

3.4  Findeks PDF Analiz Akışı
Adım	İşlem & Teknoloji
1. Yükleme	Kullanıcı PDF atar → uygulama içi drag-drop veya kamera (mobil)
2. OCR	Tesseract.js (client-side) veya Google Cloud Vision API — metin çıkarma
3. Parser	Kural bazlı parser: kredi skoru, limit kullanım %, gecikme kayıtları, banka listesi
4. Puanlama	Kural motoru: Findeks verisine göre finansal sağlık alt skoru hesapla
5. AI Yorum	Claude Sonnet 4.6: 'Bu raporu analiz et, kişiselleştirilmiş Türkçe tavsiye ver' prompt
6. Aksiyon Planı	'Skorunu 6 ayda kaç puana çıkarmak istersin?' → adım adım plan
7. Takip	Her ay yeni rapor yüklenince önceki ile karşılaştır, ilerleme göster

 
🧠  4. Türk Finans Psikolojisi
Kullanıcı rakam değil, rahatlama ve kontrol hissi ister.

"Türk kullanıcısı için finansal uygulama kaygıyı azaltmalı, fırsatı göstermeli, kontrol hissi vermeli. Rakamlar değil, anlatı."
— Ürün Felsefesi

4.1  Finansal Stres Skoru
Gelir, borç, taksit ve nakit tamponu verilerinden hesaplanan duygusal durum göstergesi.

Stres Seviyesi	Skor Aralığı	Uygulama Tonu & Aksiyonu
🟢  Rahat	70–100	'Bu ay durumun çok iyi! Hedefine ₺450 daha ekleme vakti.' — Motivasyon modu
🟡  Dikkat	45–69	'Taksit yükün biraz yüksek. Şu adımları atarsan rahatarsın.' — Rehberlik modu
🟠  Gergin	25–44	'Bu ay sıkışıklık var. Seninle birlikte bir çıkış planı yapalım.' — Destek modu
🔴  Kriz	0–24	'Acil adım gerekiyor. Sana özel 30 günlük kriz planını göstereyim.' — Aksiyon modu

💬	Dil & Ton Kararı: Uygulama hiçbir zaman yargılamaz, suçlamaz. Koç gibi konuşur.
❌ 'Bu ay çok harcadınız.'   ✅ 'Bu ay market biraz taştı — küçük bir düzenlemeyle dengeleyebilirsin.'
❌ 'Bütçenizi aştınız.'      ✅ 'Yeme-içme kategorisi bu ay öne geçti. Haftaya bir mini-plan yapalım mı?'

4.2  WhatsApp Tarzı AI Asistan
Kullanıcı doğal dille yazar, asistan anlık yanıt verir. Türkçe konuşma dili, samimi ton.

Kullanıcı Sorusu	Asistan Yanıtı
Bu ay durumum ne?	'Bu ay 12.400 TL gelir, 9.800 TL gider — 2.600 TL olumlu. Ama dikkat: 3 taksit bu ayı ağırlaştırdı.'
Ne kadar harcarım?	'Son 3 ay ortalamanı göre yaklaşık 9.200–10.500 TL/ay harcıyorsun. Bu ay biraz üstündesin.'
Borçlarım ne zaman biter?	'En agresif ödeme planıyla Garanti kartın 8 ayda, ihtiyaç kredin 14 ayda kapanır.'
Yeni telefon alabilir miyim?	'12 taksit için aylık ~650 TL ek yük gelir. Şu anki taksit oranın %38 → %47 çıkar. Biraz riskli.'
Bu ay tasarruf eder miyim?	'Mevcut gidişatla ~2.400 TL tasarruf edilebilir. Hedefe aktarırsak tatil fonun 3 ayda dolacak.'

 
🎯  5. MVP Sınırı — Ne Yapılır, Ne Beklenir?
Az ama çok iyi. Kullanıcı alışkanlığı kuran minimum ürün.

5.1  MVP Kapsamı (v1.0)
✅	MVP'de şunlar olmalı — bunlar olmadan ürün yayınlanmaz:

Modül	MVP Özellikleri	Neden MVP'de?
Hesap Yönetimi	Çoklu hesap (nakit, banka, kredi kartı), manuel bakiye girişi	Her şeyin temeli; bu olmadan hiçbir şey çalışmaz
İşlem Girişi	Gelir/gider CRUD, kategori, not, tarih; hızlı giriş kutusu	Günlük kullanım alışkanlığı bu ekranda kurulur
Borç Takibi	Borç listesi, kalan tutar, aylık ödeme, kapanış tahmini	Türk kullanıcısının en yüksek acı noktası
Taksit Merkezi	Aktif taksit listesi, aylık yük, kapasite göstergesi	TR'ye özgü, rakiplerde yok, güçlü differentiator
Dashboard	Bakiye, bu ay gelir/gider, finansal sağlık skoru, yaklaşan ödemeler	İlk 5 saniyede değer görmeli
Kural Motoru	8 temel kural analizi, harcama uyarıları	Ücretsiz AI — anında değer
Finansal Sağlık Skoru	0–100 kompozit skor, alt kırılımlar	Kullanıcıyı geri getirir ('Skor kaçtı acaba?')
Banka Ekstresi Yükleme	PDF upload, otomatik kategorizasyon	TR kullanıcısı manuel girmek istemez
Tema (Light/Dark)	2 tema, sistem tercihi takibi	UX temeli, retention etkisi yüksek
PDF Rapor	Aylık özet PDF export	Danışmanlık & B2B için gerekli

⏳	MVP'de OLMAYACAKLAR — sonraki fazlara bırakılır:
Widget sürükle-bırak, ek temalar, çoklu dil, Findeks AI yorumu, AI asistan sohbet, yatırım modülü,
banka API entegrasyonu, aile bütçesi, open banking, mobile app.

5.2  Faz Planı (Türkiye Odaklı)
Faz	Süre	Odak & Çıktılar
Faz 1	0–30 gün	Temel: hesap, işlem, borç, taksit, dashboard, sağlık skoru, kural motoru — çalışan MVP
Faz 2	30–60 gün	Derinlik: banka ekstresi parse, enflasyon modu, SGK/vergi hatırlatmaları, widget altyapısı, tüm temalar
Faz 3	60–90 gün	AI: Findeks PDF analiz, WhatsApp asistan, nakit akışı tahmini, senaryo simülatörü, hedef sistemi
Faz 4	90–120 gün	Monetizasyon: İyzico entegrasyonu, Pro plan, beta kullanıcılar, onboarding optimizasyonu, KVKK uyumu
Faz 5	120+ gün	Büyüme: React Native mobil, open banking, aile bütçesi, B2B white-label, API marketplace

 
✨  6. Kullanım Rahatlığı Sistemi
Her etkileşim sürtüşmesiz — kullanıcı düşünmeden hareket eder.

6.1  Onboarding: İlk 5 Dakika Kritik
Kullanıcı ilk 5 dakikada değer görmezse asla geri gelmez. Onboarding bu sorunu çözer.

Adım	Hedef & İçerik
Adım 1 — Hesap Ekle (60 sn)	'Maaş hesabını ekle' → banka adı + bakiye. Hepsi bu. Kredi kartı ayrı seçenek.
Adım 2 — İlk İşlem (90 sn)	Hızlı giriş: '3500 market' yaz → kategori otomatik önerilir → kaydet.
Adım 3 — Sağlık Skoru (30 sn)	'Şu an skorun 62/100 — taksit yükün biraz yüksek. Detay görmek ister misin?' → Aha moment.
Adım 4 — 1 Borç Gir (90 sn)	'Kredi kartı borcunu gir, sana ödeme planı çıkarayım.' → Borç kapanış tarihi gösterilir.
Tamamlandı	Dashboard açılır, kişiselleştirilmiş dashboard, konfeti animasyonu, ilk rozet.

6.2  Hız & Konfor Özellikleri
Özellik	Davranış	Kullanıcı Değeri
Hızlı İşlem Kutusu	'3500 market yaz, Enter bas' — 2 saniyede kayıt	Manuel giriş sürtüşmesini ortadan kaldırır
Akıllı Kategori	Geçmiş verimize göre tahmin: 'A101' → Market	%70+ tahmin doğruluğuyla giriş hızlanır
Sürükle Sil	İşlemler listesinde sola sürükle → sil, sağa sürükle → düzenle	Mobil konfor, uygulama gibi hissettir
Inline Düzenleme	Listedeki işleme tıkla → yerinde düzenle, modal açılmaz	Akış kırılmaz
Toplu Seçim	Birden fazla işlem seç → kategori değiştir / sil	Banka ekstresi sonrası hız
Skeleton Screens	Yüklenirken gerçek boyutlu iskelet, boş sayfa yok	Algılanan hız artar
Cmd+K Komut Paleti	Her yerden arama: işlem, menü, ayar, yardım	Power user deneyimi
Geri Al (Undo)	Silinen işlem 5 sn içinde geri alınabilir	Hata korkusu azalır, kullanım artar
Sesli Giriş	Mikrofon: '500 TL taksit ödemesi' → otomatik kayıt	Hızlı mobil giriş
Bağlamsal Yardım	Her sayfada ? ikonu → o ekrana özel 30 saniyelik rehber	Destek maliyeti düşer

6.3  Tema & Kişiselleştirme
Tema	Açıklama	Hedef Kullanıcı
☀️  Light	Beyaz zemin, mavi aksan, WCAG AA kontrast	Gündüz ofis, standart kullanım
🌙  Dark	Koyu lacivert zemin, neon aksan	Gece kullanımı, göz yorgunluğu
⬛  AMOLED	Saf siyah zemin, pil tasarrufu (OLED)	Mobil güç kullanıcıları
👁️  Yüksek Kontrast	Siyah/sarı, WCAG AAA	Görme engelli, güneşte kullanım
🖥️  Sistem	OS tercihine otomatik uyum	Varsayılan, zahmetsiz
🎨  Özel (B2B)	Kurum rengi, logo, white-label	B2B danışmanlık müşterileri

 
⚙️  7. Teknoloji Mimarisi
Ölçeklenebilir, hızlı, offline-first, Türkiye altyapısına uygun.

7.1  Tech Stack
Katman	Teknoloji	Karar Gerekçesi
Masaüstü	Tauri 2 (Rust)	RAM %70 daha az, native hız, küçük bundle; Electron alternatifte tutulur
Frontend	React 18 + TypeScript	Olgun ekosistem, concurrent rendering, tip güvenliği
State	Zustand + TanStack Query	Minimal boilerplate, server/client state ayrımı
Stil	Tailwind CSS + shadcn/ui	Utility-first, erişilebilir, tema motoru uyumlu
Yerel DB	SQLite (libsql)	Offline-first, hızlı, taşınabilir; Turso ile cloud sync
Backend API	Fastify + Prisma	En hızlı Node.js framework, type-safe ORM
Cloud DB	PostgreSQL (Supabase)	Realtime, RLS, Auth; TR region seçeneği
AI — Premium	Claude Sonnet 4.6	Türkçe kalitesi yüksek, Findeks yorumu için tercih
AI — Açık Kaynak	Ollama + Qwen2.5	Self-hosted, Türkçe orta-iyi, sıfır token maliyeti
OCR	Tesseract.js + Cloud Vision	Client-side ilk, hassas dokümanlar için cloud
Ödeme	İyzico	TR birincil ödeme altyapısı, taksitli ödeme desteği
Enflasyon API	TCMB / TÜİK Resmi API	Resmi kaynak, otomatik TÜFE güncelleme
Cache	Redis (Upstash)	Session, rate limit, job queue
Mobil (Faz 5)	React Native + Expo	Kod paylaşımı, OTA update, TR App Store
CI/CD	GitHub Actions + Railway	Otomatik test, preview env, TR region tercih
Monitoring	Sentry + PostHog	Hata + ürün analitik; KVKK uyumlu self-host seçeneği

🔒	Güvenlik Notları: AES-256 yerel şifreleme, JWT+Refresh Token rotation, Row-Level Security,
rate limiting, input sanitization. KVKK: Veri Türkiye'de tutulur, yurt dışı aktarım için açık rıza.

 
💰  8. Gelir Modeli — Türkiye Odaklı
Türk kullanıcısına uygun fiyat noktaları, yerel ödeme altyapısı.

Plan	Fiyat & Kapsam	Hedef
🆓  Free	Ücretsiz — 1 hesap, 50 işlem/ay, temel dashboard, light/dark tema	Kullanıcı edinme, ağ etkisi
⚡  Pro Aylık	₺149/ay — Sınırsız hesap & işlem, taksit merkezi, banka ekstresi parse, enflasyon modu, tüm temalar, AI asistan (30 sorgu/ay), PDF export	Bireysel aktif kullanıcı
📅  Pro Yıllık	₺990/yıl (%44 indirim) — Pro özelliklerin tümü	Maliyet bilinçli bireyler
👨‍👩‍👧  Aile	₺249/ay — 5 kullanıcı, ortak bütçe, bireysel gizlilik, aile finans raporu	Hane halkı yönetimi
🏢  B2B Starter	₺3.500/ay — 10 danışman, white-label, müşteri paneli, Findeks toplu analiz, API	Finans danışmanları, muhasebeciler
🏗️  B2B Enterprise	Özel fiyat — Sınırsız, SSO, SLA, custom entegrasyon, yerinde eğitim	KOBİ, büyük danışmanlık firmaları

 
📊  9. KPI & Başarı Metrikleri
Ölçülmeyen şey yönetilemez.

9.1  Değerlendirme Skoru
Fikir	TR Uyumu	Gelir Pot.	Teknik	UX Kolaylık	AI Potansiyel	Başarı Şansı
9/10
Güçlü	9.5/10
Mükemmel	8.5/10
Yüksek	8/10
Yapılabilir	7/10
Geliştirilebilir	9/10
Güçlü	8.5/10
İyi exec ile

9.2  Kuzey Yıldızı Metriği
"Kullanıcı bu haftaki oturumundan sonra finansal geleceği hakkında geçen haftaya göre daha umutlu mu? Bu sorunun cevabı evet ise doğru yoldayız."
— FinansKoçu Ürün Felsefesi

9.3  Ürün Metrikleri (6. Ay Hedefleri)
Metrik	Hedef	Ölçüm
7 Günlük Aktiflik	≥ %40	PostHog retention
M1 Retention	≥ %60	Cohort analizi
Onboarding Tamamlama	≥ %70	Funnel izleme
İlk İşlem Süresi	< 3 dakika	Session recording
Sağlık Skoru Kontrol Sıklığı	≥ 3x/hafta	Custom event
Findeks Yükleme Oranı (Pro)	≥ %40	Feature analytics
App Store Rating	≥ 4.5	App Store Connect
AI Asistan Kullanımı	≥ %25 / hafta	Custom event

9.4  İş Metrikleri (12. Ay)
Metrik	Hedef	Not
MAU	10.000	Organik + referral ağırlıklı
Free → Pro Dönüşüm	≥ %8	Sektör ort. %3-5
MRR	₺120.000	~800 Pro kullanıcı mix
CAC	< ₺250	Community + SEO ağırlıklı
LTV / CAC	≥ 3x	Sürdürülebilirlik
Churn	< %5/ay	Pro kullanıcılar
NPS	≥ 50	Aylık anket

 
💻  10. Geliştirici Promptları (Claude Code / Cursor)
Türkiye odaklı geliştirme için hazır prompt şablonları.

Modül	Prompt Şablonu
Temel MVP	React 18 + TypeScript + Tauri ile Türk kullanıcısı için kişisel finans uygulaması oluştur. Sol sidebar, hızlı işlem giriş kutusu (enter ile kayıt), Zustand state, Tailwind CSS tema sistemi (light/dark/AMOLED), TL formatı, Türkçe arayüz.
Taksit Merkezi	TypeScript ile taksit takip modülü yaz. Taksit listesi CRUD, aylık toplam yük hesabı (gelir yüzdesi), kapasite hesaplayıcısı ('X TL alışveriş yapabilir miyim?'), taksit bitiş takvimi ve yüksek yük uyarısı. TL formatı, Türkçe.
Finansal Sağlık Skoru	Kural tabanlı finansal sağlık skoru motoru yaz. 7 alt skor (borç/gelir, nakit tamponu, tasarruf oranı, taksit yükü, fatura disiplini, abonelik yükü, gelir istikrarı), ağırlıklı ortalama, 0-100 skor, iyileştirme önerileri. TypeScript, saf hesaplama, API bağımlılığı yok.
Banka Ekstresi Parser	PDF banka ekstresi parse eden modül yaz. pdf-parse ile metin çıkar, regex ile Garanti/İş/YKB/Akbank formatlarını tanı, işlemleri {tarih, tutar, açıklama, tip} formatına çevir, makine öğrenimi yerine kural bazlı kategori ata. TypeScript.
Findeks OCR Analizi	Findeks raporu PDF'inden kredi skoru, limit kullanım oranı, gecikme geçmişi, banka listesini çıkaran OCR parser yaz (Tesseract.js). Çıkarılan veriyi Claude Sonnet 4.6 API'ye gönder, Türkçe kişiselleştirilmiş öneri al, aksiyon planı oluştur.
Kural Motoru	8 finansal kural analizi motoru yaz: harcama artışı, negatif bakiye riski, taksit yükü uyarısı, abonelik tespiti, bütçe aşımı, gelir sapması, fatura gecikme riski, tasarruf fırsatı. Her kural için tetikleyici koşul, mesaj şablonu (Türkçe, koç tonu), öncelik skoru.
Enflasyon Modu	TCMB API'den TÜFE verisi çeken ve nominal harcamaları reel değere dönüştüren modül yaz. Kategori bazlı enflasyon etkisi, reel bütçe hedefleri, enflasyona göre harcama karşılaştırması. TypeScript + React hook.
WhatsApp Asistan UI	React ile sohbet arayüzü oluştur. Kullanıcı mesaj yazar, Fastify backend finansal verileri context olarak hazırlayıp Claude Sonnet 4.6'ya iletir. Türkçe, samimi koç tonu, Markdown yanıt render, mesaj geçmişi, token limit yönetimi.
Onboarding Sihirbazı	4 adımlı onboarding wizard: (1) hesap ekle, (2) hızlı işlem dene, (3) finansal sağlık skoru göster, (4) 1 borç gir. Her adımda progress bar, atla seçeneği, mikro animasyon, tamamlandığında konfeti + ilk rozet. React + Framer Motion.
Widget Sistemi	dnd-kit ile sürükle-bırak dashboard widget sistemi: her widget bağımsız React component, boyut (1x1/2x1/2x2), görünürlük, konfigürasyon paneli. Düzen localStorage'a kaydedilir, reset seçeneği. TypeScript.

 
🗂️  11. Sonraki Aşama: Üretilecek Raporlar
Bu raporlar projenin kaderini belirler.

Aşağıdaki 7 rapor, fikirden ürüne geçişte kritik kararları netleştirir. Her biri ayrı bir belge olarak hazırlanacak.

Rapor	Kapsam	Öncelik
1. Kullanıcı Akışı Haritası	Kayıttan günlük kullanıma tüm ekranlar, kararlar ve geçişler; Figma/Mermaid diyagramı	🔴 Kritik
2. Ekran Ekran UI Planı	Her ekranın wireframe'i, içerik hiyerarşisi, etkileşim detayları, widget pozisyonları	🔴 Kritik
3. MVP 1/2/3 Spesifikasyonu	Görev bazlı detay: kullanıcı hikayesi, kabul kriterleri, teknik notlar, sprint planı	🔴 Kritik
4. Growth Planı	İlk 1000 kullanıcı edinme, referral mekanizması, SEO içerik planı, dönüşüm hunisi	🟠 Yüksek
5. TR AI Finans Skoru Formülü	7 alt skoru formüle et, ağırlıkları kalibre et, skor bantlarını belirle, test veriseti oluştur	🟠 Yüksek
6. Findeks PDF Motor Sistemi	OCR mimarisi, parser regex desenleri, AI prompt şablonları, test senaryoları	🟠 Yüksek
7. Claude Sonnet 4.6 Geliştirme Planı	API entegrasyon mimarisi, prompt şablonları, token optimizasyonu, fallback stratejisi	🟡 Orta

 
🧭  12. Stratejik Not & Vizyon
Nereye gidiyoruz ve neden kazanabiliriz?

12.1  Türkiye'de Kazanma Koşulları
Koşul	Nasıl Sağlanır?
Günlük Alışkanlık Kur	Sağlık skoru + AI özet → kullanıcı her sabah bakar. 'Puanım kaçtı?' sorusu retention engine.
Güven İnşa Et	Veri gizliliği şeffaflığı, KVKK uyumu, yerel sunucu. 'Verilerim Türkiye'de' mesajı güven verir.
Sürtüşmeyi Sıfırla	Banka ekstresi yükle → otomatik kategori. 3500 yaz → kayıt. Tek tık raporlar.
Somut Değer Göster	'Bu ay taksit baskın olduğunu gösterdim, 2 abonelik kestim, ₺840 tasarruf ettim.' Gerçek hikaye.
TR'ye Özgü Ol	Taksit merkezi, Findeks analizi, SGK hatırlatması, enflasyon modu — global rakipler bunları sunamaz.

12.2  3 Yıllık Yol
Dönem	Hedef	Odak
Yıl 1	TR dominance — 10K MAU, ₺1.2M ARR	MVP mükemmelliği, TR özel özellikler, ilk 1000 sadık kullanıcı
Yıl 2	B2B büyümesi — 50K MAU, ₺5M ARR	Open banking, aile planı, finans danışmanları kanalı
Yıl 3	Bölgesel genişleme — 200K MAU, ₺15M ARR	Azerbaycan, Kazakistan, Türkiye diasporası (DE/NL), Series A

🇹🇷  FinansKoçu  •  Startup Master Plan v3.0
12 bölüm  •  Türkiye odaklı  •  Taksit merkezi  •  Findeks analizi  •  Hibrit AI
Enflasyon modu  •  Finansal sağlık skoru  •  TR psikolojisi  •  Claude Sonnet 4.6
Nisan 2025  •  Gizli & Şirkete Özel
