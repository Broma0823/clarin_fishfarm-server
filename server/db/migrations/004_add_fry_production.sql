-- Add fry production columns to monitoring_parameters table
ALTER TABLE monitoring_parameters 
ADD COLUMN IF NOT EXISTS total_fry_produced INTEGER,
ADD COLUMN IF NOT EXISTS harvest_date DATE;

