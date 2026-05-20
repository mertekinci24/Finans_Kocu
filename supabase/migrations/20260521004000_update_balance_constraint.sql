-- Kısıtlamayı kaldırıp, type duyarlı hale getiriyoruz.
-- nakit hesaplar >= 0 kalmalı, banka ve kredi kartı hesapları eksiye düşebilmeli.

ALTER TABLE accounts DROP CONSTRAINT IF EXISTS positive_balance;

ALTER TABLE accounts
ADD CONSTRAINT valid_balance_by_type
CHECK (
  (type = 'nakit' AND balance >= 0)
  OR type IN ('banka', 'kredi_kartı')
);
