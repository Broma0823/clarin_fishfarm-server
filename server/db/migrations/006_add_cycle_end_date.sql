ALTER TABLE monitoring_parameters
ADD COLUMN IF NOT EXISTS cycle_end_date DATE;
