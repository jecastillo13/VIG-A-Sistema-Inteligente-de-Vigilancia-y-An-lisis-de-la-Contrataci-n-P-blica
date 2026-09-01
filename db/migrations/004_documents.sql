CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  contract_id TEXT NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  process_reference TEXT,
  file_name TEXT NOT NULL,
  extension TEXT,
  size_bytes BIGINT CHECK (size_bytes IS NULL OR size_bytes >= 0),
  description TEXT,
  uploaded_at TIMESTAMPTZ,
  source_url TEXT NOT NULL,
  source_dataset_id TEXT NOT NULL,
  download_status TEXT NOT NULL DEFAULT 'inventory_only',
  sha256 TEXT,
  mime_type TEXT,
  local_path TEXT,
  indexed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS documents_contract_id_idx ON documents(contract_id);
CREATE INDEX IF NOT EXISTS documents_uploaded_at_idx ON documents(uploaded_at DESC);
CREATE INDEX IF NOT EXISTS documents_extension_idx ON documents(extension);
