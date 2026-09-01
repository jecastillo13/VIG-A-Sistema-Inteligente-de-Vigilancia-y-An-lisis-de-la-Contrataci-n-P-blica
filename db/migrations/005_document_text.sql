ALTER TABLE documents ADD COLUMN IF NOT EXISTS extraction_status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE documents ADD COLUMN IF NOT EXISTS page_count INTEGER CHECK (page_count IS NULL OR page_count >= 0);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS text_char_count INTEGER CHECK (text_char_count IS NULL OR text_char_count >= 0);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS extracted_at TIMESTAMPTZ;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS extraction_error TEXT;

CREATE TABLE IF NOT EXISTS document_pages (
  document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  page_number INTEGER NOT NULL CHECK (page_number > 0),
  text_content TEXT NOT NULL,
  char_count INTEGER NOT NULL CHECK (char_count >= 0),
  extraction_method TEXT NOT NULL,
  extracted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (document_id, page_number)
);

CREATE INDEX IF NOT EXISTS document_pages_document_id_idx ON document_pages(document_id);
