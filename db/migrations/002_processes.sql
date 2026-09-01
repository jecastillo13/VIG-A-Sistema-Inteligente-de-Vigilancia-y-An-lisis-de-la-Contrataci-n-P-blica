CREATE TABLE IF NOT EXISTS processes (
  id TEXT PRIMARY KEY,
  reference TEXT,
  entity_code TEXT NOT NULL REFERENCES entities(code),
  description TEXT,
  procurement_method TEXT,
  source_url TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO processes (id, reference, entity_code, description, procurement_method, source_url)
SELECT DISTINCT ON (process_id) process_id, reference, entity_code, description, procurement_method, source_process_url
FROM contracts
WHERE process_id IS NOT NULL
ORDER BY process_id, imported_at DESC
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'contracts_process_id_fkey') THEN
    ALTER TABLE contracts ADD CONSTRAINT contracts_process_id_fkey FOREIGN KEY (process_id) REFERENCES processes(id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS processes_entity_code_idx ON processes(entity_code);
