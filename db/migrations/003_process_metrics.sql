ALTER TABLE processes ADD COLUMN IF NOT EXISTS official_process_id TEXT;
ALTER TABLE processes ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;
ALTER TABLE processes ADD COLUMN IF NOT EXISTS awarded_at TIMESTAMPTZ;
ALTER TABLE processes ADD COLUMN IF NOT EXISTS estimated_value NUMERIC(20, 2);
ALTER TABLE processes ADD COLUMN IF NOT EXISTS awarded_value NUMERIC(20, 2);
ALTER TABLE processes ADD COLUMN IF NOT EXISTS offer_count INTEGER;
ALTER TABLE processes ADD COLUMN IF NOT EXISTS unique_bidder_count INTEGER;
ALTER TABLE processes ADD COLUMN IF NOT EXISTS lot_count INTEGER;
ALTER TABLE processes ADD COLUMN IF NOT EXISTS metrics_source_dataset_id TEXT;

CREATE INDEX IF NOT EXISTS processes_official_id_idx ON processes(official_process_id);
CREATE INDEX IF NOT EXISTS processes_published_at_idx ON processes(published_at);
