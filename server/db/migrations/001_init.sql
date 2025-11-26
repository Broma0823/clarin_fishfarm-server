CREATE TABLE IF NOT EXISTS beneficiaries (
    id SERIAL PRIMARY KEY,
    excel_id TEXT UNIQUE,
    classification TEXT NOT NULL CHECK (classification IN ('individual', 'group')),
    name TEXT NOT NULL,
    gender TEXT,
    barangay TEXT,
    municipality TEXT,
    contact TEXT,
    species TEXT,
    quantity INTEGER,
    cost NUMERIC(14,2),
    implementation_type TEXT,
    satisfaction TEXT,
    date_implemented DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS beneficiaries_municipality_idx
    ON beneficiaries (municipality, classification);

CREATE TABLE IF NOT EXISTS monthly_production (
    id SERIAL PRIMARY KEY,
    snapshot_month DATE UNIQUE NOT NULL,
    fry_count INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS uploads (
    id SERIAL PRIMARY KEY,
    filename TEXT NOT NULL,
    imported_rows INTEGER NOT NULL DEFAULT 0,
    notes TEXT,
    imported_at TIMESTAMPTZ DEFAULT NOW()
);


