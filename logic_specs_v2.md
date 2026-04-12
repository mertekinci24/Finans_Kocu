# Finansal Mantık Anayasası v2 (logic_specs_v2.md)

Bu doküman, Master Plan v3'teki "Low Cost / High Value" prensiline %100 uyumlu olarak kurgulanmış olan çok katmanlı, yerelleştirilmiş finansal skorlama sistemini tanımlar.

## Katman 1: Güven Skoru ($C$)

Güven Skoru, kullanıcının sisteme girdiği verilerin "tamlığını ve doğruluğunu" ölçen bir katsayıdır. Eksik veriyle yapılan analizlerin kullanıcıyı yanıltmasını engeller.

$$C = \left( \frac{\text{Girilen Kalemler}}{\text{Beklenen Temel Kalemler}} \right)$$
*(Not: $C$, $0.0$ ile $1.0$ arasında bir katsayıdır.)*

## Katman 2: Çok Katmanlı Puanlama

Finansal Sağlık Skoru ($S_{final}$), ham skor ($S_{base}$), cezalar ($P$) ve ödüllerin ($B$) Güven Skoru ($C$) ile çarpılmasına dayanır.

$$S_{base} = (0.25 \times \text{Borç/Gelir}) + (0.20 \times \text{Nakit Tamponu}) + (0.20 \times \text{Tasarruf Oranı}) + (0.15 \times \text{Taksit/Gelir}) + (0.20 \times \text{Diğer})$$

$$ \text{Penalties } (P) = \sum_{i=1}^{n} (w_i \times p_i) $$
*(Örn: Gecikmiş fatura, bütçe aşımı)*

$$ \text{Bonuses } (B) = \sum_{j=1}^{m} (w_j \times b_j) $$
*(Örn: Erken borç kapama, artan tasarruf)*

$$ S_{final} = \max \left(0, \min \left(100, \left( S_{base} - P + B \right) \times C \right) \right) $$

## Katman 3: Kritik Risk (Red Flags - Kriz Modu)

Aşağıdaki tetikleyicilerden birinin gerçekleşmesi durumunda sistem skoru maksimum 24 (Kriz Modu) olarak sabitler:

- **Nakit Tıkanıklığı:** $\text{Net Gelir} < (\text{Sabit Giderler} + \text{Taksitler} + \text{Asgari Ödemeler})$
- **Borç Sarmalı Risk:** $\text{Taksit Yükü} > \text{Net Gelirin \%40'ı}$
- **Findeks İhlali:** $\text{Gecikmiş Borç} \ge 1 \text{ ay}$

*Bu durumda sistem koçluk (destek) paneline geçer ve acil kriz çıkış planı verir.*

## Katman 4: Türkiye Spesifikasyonu

### 1. Taksit Yükünü Borçtan Ayırma
Türkiye'de taksit, aylık nakit akışında bir "sabit gider" gibi değerlendirilir ve doğrudan kullanılabilir likiditeyi düşürür. Toplam borç stokundan ayrı, operasyonel yük olarak hesaplanır.

### 2. Enflasyon Bazlı Reel Harcama Katsayısı
Nominal harcamalar TÜFE bazlı indirgenerek reel tüketim değişimi ölçülür.
$$ \text{Reel Değişim (\%)} = \left( \frac{\text{Harcama}_{ay}}{\text{Harcama}_{onceki\_ay} \times (1 + I_{aylik})} - 1 \right) \times 100 $$

## Açıklanabilir Finans: Çıktı Şablonları

Sistem geri bildirimleri yargılamadan Neden, Sonuç ve Öneri şablonuna oturur.

**Örnek (Taksit Limiti İçin):**
- **Neden:** "Bu ayki 3 taksit ödemen (₺2.400) nakit akışını sıkıştırdı."
- **Sonuç:** "Gelirinin %45'i daha ay başında kredi borcundan bağımsız olarak bağlandı."
- **Öneri:** "Bu ay yeni taksite girmek yerine, en küçük ödemeni bitirerek önümüzdeki aya alan açabiliriz. Birlikte planlayalım mı?"
