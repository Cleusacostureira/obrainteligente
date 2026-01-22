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
CREATE INDEX IF NOT EXISTS idx_plantas_owner ON plantas(owner);

-- Enable Row Level Security and add owner-based policies
ALTER TABLE plantas ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert rows only when they set `owner` to their uid
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'plantas_insert_owner_check') THEN
    EXECUTE 'CREATE POLICY plantas_insert_owner_check ON plantas FOR INSERT WITH CHECK (owner = auth.uid())';
  END IF;
END
$$;

-- Allow owners to perform any action on their rows
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'plantas_owner_full_access') THEN
    EXECUTE 'CREATE POLICY plantas_owner_full_access ON plantas FOR ALL USING (owner = auth.uid()) WITH CHECK (owner = auth.uid())';
  END IF;
END
$$;

-- Allow authenticated users to claim/update plants that have no owner yet
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'plantas_update_claim') THEN
    EXECUTE 'CREATE POLICY plantas_update_claim ON plantas FOR UPDATE USING (owner IS NULL OR owner = auth.uid()) WITH CHECK (owner = auth.uid() OR owner IS NULL)';
  END IF;
END
$$;
