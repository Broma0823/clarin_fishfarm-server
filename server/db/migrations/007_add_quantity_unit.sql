ALTER TABLE beneficiaries
ADD COLUMN IF NOT EXISTS quantity_unit TEXT NOT NULL DEFAULT 'pcs'
CHECK (quantity_unit IN ('pcs', 'kls'));

ALTER TABLE beneficiary_distributions
ADD COLUMN IF NOT EXISTS quantity_unit TEXT NOT NULL DEFAULT 'pcs'
CHECK (quantity_unit IN ('pcs', 'kls'));

UPDATE beneficiaries
SET quantity_unit = 'kls'
WHERE quantity_unit = 'pcs'
  AND species IS NOT NULL
  AND LOWER(species) LIKE '%culled%';

UPDATE beneficiary_distributions
SET quantity_unit = 'kls'
WHERE quantity_unit = 'pcs'
  AND species IS NOT NULL
  AND LOWER(species) LIKE '%culled%';
