# Talimat.md

## EMİR SETİ

# TALİMAT v2 — DELIVERY CONSTITUTION

1. Master Plan tek kaynaktır.
2. Tasks.md ilk açık görev seçilir.
3. Görev başlamadan:
   - etki analizi
   - bağımlılık analizi
   - risk analizi yapılır.

4. DONE demeden önce zorunlu kontroller:
   - build passes
   - lint passes
   - type passes
   - tests pass
   - no dead code
   - changelog updated

5. Her özellik için:
   - happy path
   - edge case
   - fail case
     çözülmeden teslim yok.

6. Veri bütünlüğü bozan çözüm yasaktır.

7. Temporary fix yasaktır.
8. Root cause zorunludur.

9. UI değişikliği:
   - mobile
   - desktop
   - dark mode
     kontrol edilmeden tamam sayılmaz.

10. Performance regression yasaktır.

11. Her görevde kullanıcı psikolojisi dikkate alınır:
    güven, açıklık, hız, kontrol hissi.

12. Bir dosya değişiyorsa komşu sistem etkisi incelenir.

13. Kod kadar dokümantasyon da teslimatın parçasıdır.

14. Şüphede kalınırsa basit, güvenli, sürdürülebilir çözüm seçilir.
15. Her görev sonunda `Changelog.md` dosyasına şablona uygun kayıt zorunludur.
16. Her 3 tamamlanan görev sonrası `technical_debt.md` incele, kayıt ekle, mümkünse öncelik borcu kapat.
17. Her hata, sapma veya başarısız deneme sonrası `debugging.md` kaydı oluştur. Çıkardığımız derslerin hepsini kaydet.
18. Kod; modüler, test edilebilir, tip güvenli ve okunabilir olacak.
19. Geçici console log, dead code, kullanılmayan import bırakılmayacak.
20. DONE işaretlenen her görev için doğrulama testi yapılacak.
21. Güvenlik, performans ve veri bütünlüğü her zaman özelliklerden önce gelir.
22. Türkçe UX standarttır. TRY para formatı varsayılandır.
23. İş bitmeden rapor bitmez; kayıt tutulmayan iş yapılmamış sayılır.
24. Her adımdan sonra github safety push
