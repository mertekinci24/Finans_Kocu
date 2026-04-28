-- 2026-04-16: Fixed Timeline Anchor Support
-- Taksitlerin "yüzen" yapısını "sabit" itfa planına çevirmek için mühürleme sütunu eklenir.

ALTER TABLE installments ADD COLUMN IF NOT EXISTS first_payment_date DATE;

-- Mevcut taksitleri tahmini olarak "mühürle"
UPDATE installments 
SET first_payment_date = (next_payment_date::date - ((total_months - remaining_months) || ' months')::interval)::date
WHERE first_payment_date IS NULL;

COMMENT ON COLUMN installments.first_payment_date IS 'Taksidin orijinal başlangıç tarihini temsil eden sabit mühür.';
