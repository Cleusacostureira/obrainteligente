-- Migration: Create plantas table to persist floorplans

CREATE TABLE IF NOT EXISTS plantas (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  projeto_id uuid REFERENCES projetos(id) ON DELETE CASCADE,
  title text,
  owner uuid,
  data jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_plantas_projeto_id ON plantas(projeto_id);
