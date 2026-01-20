-- RLS policies to ensure each user only sees their own projetos and custos
-- Run this in Supabase SQL editor or apply via supabase CLI

-- Enable Row Level Security
ALTER TABLE IF EXISTS public.projetos ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.custos ENABLE ROW LEVEL SECURITY;

-- PROJECTS (projetos) policies
-- INSERT: only allow inserting when owner = auth.uid()
CREATE POLICY IF NOT EXISTS "Insert own projetos" ON public.projetos
  FOR INSERT
  WITH CHECK (owner = auth.uid());

-- SELECT: only select rows owned by the authenticated user
CREATE POLICY IF NOT EXISTS "Select own projetos" ON public.projetos
  FOR SELECT
  USING (owner = auth.uid());

-- UPDATE: only update own projetos
CREATE POLICY IF NOT EXISTS "Update own projetos" ON public.projetos
  FOR UPDATE
  USING (owner = auth.uid())
  WITH CHECK (owner = auth.uid());

-- DELETE: only delete own projetos
CREATE POLICY IF NOT EXISTS "Delete own projetos" ON public.projetos
  FOR DELETE
  USING (owner = auth.uid());

-- CUSTOS policies (scoped by projeto owner)
-- INSERT: only insert custos when the referenced projeto belongs to auth.uid()
CREATE POLICY IF NOT EXISTS "Insert custos for own projetos" ON public.custos
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projetos p WHERE p.id = custos.projeto_id AND p.owner = auth.uid()
    )
  );

-- SELECT: can only select custos belonging to projetos owned by the user
CREATE POLICY IF NOT EXISTS "Select custos for own projetos" ON public.custos
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projetos p WHERE p.id = custos.projeto_id AND p.owner = auth.uid()
    )
  );

-- UPDATE: only update custos for projetos owned by the user
CREATE POLICY IF NOT EXISTS "Update custos for own projetos" ON public.custos
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.projetos p WHERE p.id = custos.projeto_id AND p.owner = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projetos p WHERE p.id = custos.projeto_id AND p.owner = auth.uid()
    )
  );

-- DELETE: only delete custos for projetos owned by the user
CREATE POLICY IF NOT EXISTS "Delete custos for own projetos" ON public.custos
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.projetos p WHERE p.id = custos.projeto_id AND p.owner = auth.uid()
    )
  );

-- Optional: allow authenticated users to read materiais_precos (shared data)
ALTER TABLE IF EXISTS public.materiais_precos ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Select materiais_precos public" ON public.materiais_precos
  FOR SELECT
  USING (true);

-- Note: after running this migration ensure service_role (or DB admin) has permissions
-- to manage the DB; regular users will be constrained by these policies.
