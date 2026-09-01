CREATE TABLE IF NOT EXISTS document_findings (
  contract_id TEXT NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('found', 'not_found')),
  document_id TEXT REFERENCES documents(id) ON DELETE CASCADE,
  page_number INTEGER CHECK (page_number IS NULL OR page_number > 0),
  excerpt TEXT,
  matched_term TEXT,
  analyzer_version TEXT NOT NULL,
  analyzed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (contract_id, category),
  CHECK ((status = 'found' AND document_id IS NOT NULL AND page_number IS NOT NULL AND excerpt IS NOT NULL) OR status = 'not_found')
);

CREATE INDEX IF NOT EXISTS document_findings_document_id_idx ON document_findings(document_id);
