-- Migration: Create calculadora_presets table
-- Stores price presets per projeto

CREATE TABLE IF NOT EXISTS public.calculadora_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  projeto_id uuid REFERENCES public.projetos(id) ON DELETE CASCADE,
  owner uuid REFERENCES public.users(id) ON DELETE SET NULL,
  name text NOT NULL,
  data jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_calc_presets_projeto ON public.calculadora_presets(projeto_id);
