CREATE TABLE IF NOT EXISTS entities (
  code TEXT PRIMARY KEY,
  tax_id TEXT,
  name TEXT NOT NULL,
  department TEXT,
  city TEXT,
  government_order TEXT,
  sector TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS suppliers (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  is_group BOOLEAN NOT NULL DEFAULT FALSE,
  is_sme BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS contracts (
  id TEXT PRIMARY KEY,
  process_id TEXT,
  reference TEXT,
  status TEXT,
  description TEXT,
  contract_type TEXT,
  procurement_method TEXT,
  procurement_method_justification TEXT,
  signed_at TIMESTAMPTZ NOT NULL,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  value NUMERIC(20, 2) NOT NULL CHECK (value >= 0),
  added_days INTEGER NOT NULL DEFAULT 0,
  main_category_code TEXT,
  entity_code TEXT NOT NULL REFERENCES entities(code),
  supplier_code TEXT REFERENCES suppliers(code),
  source_dataset_id TEXT NOT NULL,
  source_process_url TEXT,
  source_updated_at TIMESTAMPTZ,
  imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS data_loads (
  id BIGSERIAL PRIMARY KEY,
  run_key TEXT NOT NULL,
  dataset_id TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL,
  received INTEGER NOT NULL DEFAULT 0,
  accepted INTEGER NOT NULL DEFAULT 0,
  rejected INTEGER NOT NULL DEFAULT 0,
  duplicates INTEGER NOT NULL DEFAULT 0,
  report JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS risk_signals (
  id BIGSERIAL PRIMARY KEY,
  contract_id TEXT NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  rule_code TEXT NOT NULL,
  rule_version TEXT NOT NULL,
  score NUMERIC(6, 2) NOT NULL,
  evidence JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (contract_id, rule_code, rule_version)
);

CREATE INDEX IF NOT EXISTS contracts_signed_at_idx ON contracts(signed_at DESC);
CREATE INDEX IF NOT EXISTS contracts_entity_code_idx ON contracts(entity_code);
CREATE INDEX IF NOT EXISTS contracts_supplier_code_idx ON contracts(supplier_code);
CREATE INDEX IF NOT EXISTS contracts_value_idx ON contracts(value DESC);
CREATE INDEX IF NOT EXISTS contracts_method_idx ON contracts(procurement_method);

