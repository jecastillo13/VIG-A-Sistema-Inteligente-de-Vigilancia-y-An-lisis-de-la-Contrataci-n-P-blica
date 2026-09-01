CREATE TABLE IF NOT EXISTS document_reviews (
  contract_id TEXT NOT NULL,
  category TEXT NOT NULL,
  decision TEXT NOT NULL CHECK (decision IN ('confirmed', 'rejected')),
  note TEXT,
  reviewer TEXT NOT NULL DEFAULT 'human',
  reviewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (contract_id, category),
  FOREIGN KEY (contract_id, category) REFERENCES document_findings(contract_id, category) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS document_reviews_decision_idx ON document_reviews(decision);
