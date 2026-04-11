-- Create monitoring_parameters table for tracking water quality and breeding cycle data
CREATE TABLE IF NOT EXISTS monitoring_parameters (
    id SERIAL PRIMARY KEY,
    cycle_id TEXT NOT NULL, -- Unique identifier for each breeding cycle
    cycle_start_date DATE NOT NULL,
    
    -- Main water quality parameters
    water_temperature NUMERIC(5,2), -- in Celsius
    dissolved_oxygen NUMERIC(5,2), -- in mg/L
    ph_level NUMERIC(4,2), -- pH level
    
    -- User-inputted parameters (entered before breeding cycle)
    number_of_breeders INTEGER,
    breeder_ratio TEXT, -- e.g., "1:1", "2:1" (male:female)
    feed_allocation NUMERIC(10,2), -- in kg
    
    -- Weather parameters (from API)
    weather_temperature NUMERIC(5,2), -- in Celsius
    weather_humidity INTEGER, -- percentage
    weather_condition TEXT, -- e.g., "Clear", "Cloudy", "Rainy"
    weather_wind_speed NUMERIC(5,2), -- in km/h
    
    -- Metadata
    recorded_at TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT,
    
    -- Fry Production (added for cycle summary)
    total_fry_produced INTEGER,
    harvest_date DATE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for efficient querying by cycle
CREATE INDEX IF NOT EXISTS monitoring_parameters_cycle_idx
    ON monitoring_parameters (cycle_id, recorded_at);

-- Create index for date range queries
CREATE INDEX IF NOT EXISTS monitoring_parameters_date_idx
    ON monitoring_parameters (cycle_start_date, recorded_at);

