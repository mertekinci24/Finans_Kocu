# Financial_Health_Score.md — Bireysel Finansal Radar Anayasası

## Hierarchical Scoring v6.1 (Deterministic Refinement)

Bu doküman, FinansKoçu'nun felsefi anayasasıdır. Finansal Sağlık Skoru bir ceza puanı değil, kullanıcının bugünü anlamasını ve yarınını planlamasını sağlayan bir **Karar Destek Sistemi (DSS)**'dir.

---

# 1. Temel Felsefe: Radar vs. Mahkeme

FinansKoçu, İstoç Esnafı'ndan maaşlı çalışana kadar herkesin finansal baskısını ve dayanıklılığını ölçer.

*   **Açıklanabilir Finans:** Skor bir sayıdan fazlasıdır. Her zaman "Durum", "Sebep" ve "Aksiyon" üçlemesiyle sunulur.
*   **Enflasyon ve Sermaye Erimesi:** Nominal artışlar başarı değildir. "Varlık Zengini - Gelir Fakiri" ikilemi, v6.1 (Deterministic Refinement) ile birlikte **Sermaye Erimesi** kavramı üzerinden takip edilir. Varlıkların likidite kalitesi düşükse, sistem bunu potansiyel bir risk olarak raporlar.
*   **Kontrollü Rahatsızlık:** Skorun amacı sadece kullanıcıyı rahatlatmak değil, varlık erimesi veya nakit akışı bozulması durumunda "doğru zamanda rahatsız ederek" aksiyon almasını sağlamaktır.

---

# 2. Hiyerarşik Puanlama Mimarisi (Synthesized)

## Katman 0: Solvency Guard (Özsermaye Koruması)
Sistemin en derin temelidir. Likidite ağırlıklı Net Değerin negatif olup olmadığını kontrol eder.
- **Mantık:** Eğer borçlar, nakit ve nakde hızlı dönebilecek varlıkların toplamını aşıyorsa, sistem "Teknik İflas" (Kriz) uyarısı verir ve skoru kilitler.

## Katman 1: Override Engine (Liquidity Stress Detection)
Anlık likidite krizlerini ve 30 günlük hayatta kalma riskini yakalar. 
- **Mühür Kural:** Override Engine detects liquidity stress (Cash Blockage & Intra-month Risk) and only escalates to crisis-level severity (15-25) when NT < 1. 
- **Intra-month Risk:** Sistem, ayın 15'indeki maaşınız gelmeden önce ayın 5'indeki bir taksidin bakiyenizi sıfırlayıp sıfırlamadığını (Günü Gününe Hassasiyet) takip eder.
- High liquidity buffers (NT ≥ 1) convert the signal into a "Cash Flow Warning" instead of a score override.

## Katman 2: Truth Engine (Veri Güveni)
Manuel girişe dayalı sistemin dürüstlük katsayısıdır.
- **TruthScore directly scales the final score.** Lower data quality reduces maximum achievable score.
- *Example: TruthScore = 50 → FinalScore is halved.*

## Katman 3: Base Score Engine (Dinamik Performans)
Varlık gücü ile operasyonel nakit akışının sentezlendiği ana katmandır. v6.1 ile birlikte **Dinamik Absorpsiyon** mantığı gelmiştir:
- Varlık gücü yüksek olan kullanıcılar, geçici nakit dalgalanmalarına (SmoothPenalty) karşı daha dirençli (VC_adj) gösterilir.

## Katman 4: Anchor Engine (Solvency Protection)
Katman 1 krizleri aktif değilse devreye girer. 
- **Anchor Engine applies a gradual score support using a sigmoid-based boost.**
- Users with stronger solvency receive higher support, but no fixed minimum score is enforced. It does NOT create artificial jumps.

## Katman 5: Future / Scenario Engine (Karar Simülasyonu)
"Ne Olursa?" sorusuna yanıt verir. Gelecek perspektifiyle skoru simüle eder.

---

# 3. Kritik Tanımları

*   **Likidite Kalitesi (Quality of Asset):** Varlığın nakde dönüşme hızıdır. Nakit (1.0), Ticari Stok (0.5) ve Gayrimenkul (0.2) arasındaki fark, kriz anındaki "hareket kabiliyetini" belirler.
*   **Liquidity Stress:** Portföydeki likit varlık oranının %30'un altına düşmesidir; finansal esnekliği azaltır ve otomatik ceza puanı tetikler.
*   **NetWorth (Weighted - WNW):** Likidite ağırlıklı varlıklar eksi toplam borç. Sistem, hesap isimlerindeki "Araba, Ev, Stok" gibi anahtar kelimeleri kullanarak semantik ağırlıklandırma yapar. 
*   **MonthlyRequiredExpenses (Hibrit Zorunlu Gider Modeli):** `Sabit Zorunlu + Değişken Zorunlu (3 Ay Ort.) + Taksit Yükü`. 
    - **Proaktif Koruma:** Eğer mevcut ayda bir Fatura veya Kira girişi yoksa, sistem son 3 ayın ortalamasını otomatik olarak hesaba katarak "veri eksikliği kaynaklı yapay iyimserliği" engeller.

---

# 4. AI Koçluk ve Dil Standartları

Her uyarı şu yapıda olmalıdır: **Durum + Sebep + Aksiyon**
*   **Örnek:** "Sermayeniz eriyor (Durum) çünkü likit olmayan varlıklara yatırım yaparken nakit tamponunuzu tükettiniz (Sebep). Gayrimenkul satışını değerlendirin veya acil nakit girişi sağlayın (Aksiyon)."

---

# 5. Skor Grupları

| Skor  | Durum       | Finansal Mesaj                               |
| ------ | ----------- | -------------------------------------------- |
| 85–100 | Çok Güçlü   | Tam dayanıklılık ve yüksek büyüme potansiyeli. |
| 70–84  | Sağlıklı    | Güvenli alan, ilerleme devam ediyor.           |
| 55–69  | İzle        | Dikkat başlanmalı, eşiklere yaklaşıldı.        |
| 35–54  | Baskı Var   | Hareket alanı kısıtlı, borç baskısı yüksek.     |
| 15–34  | Kritik (High Risk) | Aktif risk, çok düşük likidite.              |
| 0–14   | Kriz (Technical Crisis) | Teknik iflas veya nakit kilitlenmesi.        |
