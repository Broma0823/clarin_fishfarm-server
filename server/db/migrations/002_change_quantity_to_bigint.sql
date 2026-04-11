-- Change quantity column from INTEGER to BIGINT to support larger values
ALTER TABLE beneficiaries 
  ALTER COLUMN quantity TYPE BIGINT;

-- Also update monthly_production.fry_count to BIGINT for consistency
ALTER TABLE monthly_production 
  ALTER COLUMN fry_count TYPE BIGINT;

