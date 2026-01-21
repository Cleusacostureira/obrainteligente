-- Migration: Add observacoes column to custos
-- Adds a text column to store notes/attachments metadata for lançamentos

ALTER TABLE custos
  ADD COLUMN IF NOT EXISTS observacoes text;

-- Optional: create an index if you plan to query by observacoes (rare)
-- CREATE INDEX IF NOT EXISTS idx_custos_observacoes ON custos USING gin (to_tsvector('portuguese', observacoes));
