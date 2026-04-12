/*
  # Add monthly_payment column to debts table

  ## Summary
  Adds the `monthly_payment` column to support debt risk analysis in the Borç Merkezi.
  
  ## Changes
  - `debts` table: adds `monthly_payment numeric(15,2) DEFAULT 0`
    - Stores the expected monthly repayment for each debt
    - Used to calculate Borç/Gelir ratio for risk coloring (Red if > 35%)
    - Defaults to 0 for existing records to avoid data loss

  ## Notes
  - Non-destructive addition; existing rows retain all data
  - RLS policies remain unchanged; all existing policies still apply
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'debts' AND column_name = 'monthly_payment'
  ) THEN
    ALTER TABLE debts ADD COLUMN monthly_payment numeric(15,2) NOT NULL DEFAULT 0;
  END IF;
END $$;
