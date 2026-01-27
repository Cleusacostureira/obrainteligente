-- Migration: Create contratos table
-- Adds a table to persist contracts and their laudo objects

-- Ensure pgcrypto is available for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.contratos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text,
  contratante jsonb,
  contratado jsonb,
  imovel jsonb,
  valores jsonb,
  texto_contrato text,
  status text,
  laudo jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS contratos_status_idx ON public.contratos(status);
CREATE INDEX IF NOT EXISTS contratos_created_at_idx ON public.contratos(created_at);
CREATE INDEX IF NOT EXISTS contratos_contratante_gin ON public.contratos USING gin (contratante);
CREATE INDEX IF NOT EXISTS contratos_contratado_gin ON public.contratos USING gin (contratado);

-- Trigger to keep updated_at current
CREATE OR REPLACE FUNCTION public.trigger_set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS contratos_set_updated_at ON public.contratos;
CREATE TRIGGER contratos_set_updated_at
BEFORE UPDATE ON public.contratos
FOR EACH ROW EXECUTE PROCEDURE public.trigger_set_updated_at();
