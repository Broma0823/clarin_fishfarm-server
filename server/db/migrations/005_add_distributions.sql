-- Create distributions table normalized away from beneficiaries
CREATE TABLE IF NOT EXISTS beneficiary_distributions (
    id SERIAL PRIMARY KEY,
    beneficiary_id INTEGER NOT NULL REFERENCES beneficiaries(id) ON DELETE CASCADE,
    excel_id TEXT UNIQUE,
    species TEXT,
    quantity BIGINT,
    cost NUMERIC(14,2),
    implementation_type TEXT,
    satisfaction TEXT,
    date_implemented DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS beneficiary_distributions_beneficiary_id_idx
    ON beneficiary_distributions (beneficiary_id);

CREATE INDEX IF NOT EXISTS beneficiary_distributions_date_idx
    ON beneficiary_distributions (date_implemented);

-- Migrate existing distribution data from beneficiaries into beneficiary_distributions.
-- Only rows that have any distribution-related data will be copied.
INSERT INTO beneficiary_distributions (
    beneficiary_id,
    excel_id,
    species,
    quantity,
    cost,
    implementation_type,
    satisfaction,
    date_implemented,
    created_at
)
SELECT
    b.id,
    b.excel_id,
    b.species,
    b.quantity,
    b.cost,
    b.implementation_type,
    b.satisfaction,
    b.date_implemented,
    COALESCE(b.created_at, NOW())
FROM beneficiaries b
WHERE (
    b.species IS NOT NULL OR
    b.quantity IS NOT NULL OR
    b.cost IS NOT NULL OR
    b.implementation_type IS NOT NULL OR
    b.satisfaction IS NOT NULL OR
    b.date_implemented IS NOT NULL
)
ON CONFLICT (excel_id) DO NOTHING;

