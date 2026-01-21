-- RLS policies to ensure each user only sees their own projetos and custos
-- Run this in Supabase SQL editor or apply via supabase CLI

-- Enable Row Level Security
ALTER TABLE IF EXISTS public.projetos ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.custos ENABLE ROW LEVEL SECURITY;

-- PROJECTS (projetos) policies
-- INSERT: only allow inserting when owner = auth.uid()
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_policy p
    JOIN pg_catalog.pg_class c ON p.polrelid = c.oid
    JOIN pg_catalog.pg_namespace n ON c.relnamespace = n.oid
    WHERE p.polname = 'Insert own projetos' AND n.nspname = 'public' AND c.relname = 'projetos'
  ) THEN
    CREATE POLICY "Insert own projetos" ON public.projetos
      FOR INSERT
      WITH CHECK (owner = auth.uid());
  END IF;
END$$;

-- SELECT: only select rows owned by the authenticated user
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_policy p
    JOIN pg_catalog.pg_class c ON p.polrelid = c.oid
    JOIN pg_catalog.pg_namespace n ON c.relnamespace = n.oid
    WHERE p.polname = 'Select own projetos' AND n.nspname = 'public' AND c.relname = 'projetos'
  ) THEN
    CREATE POLICY "Select own projetos" ON public.projetos
      FOR SELECT
      USING (owner = auth.uid());
  END IF;
END$$;

-- UPDATE: only update own projetos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_policy p
    JOIN pg_catalog.pg_class c ON p.polrelid = c.oid
    JOIN pg_catalog.pg_namespace n ON c.relnamespace = n.oid
    WHERE p.polname = 'Update own projetos' AND n.nspname = 'public' AND c.relname = 'projetos'
  ) THEN
    CREATE POLICY "Update own projetos" ON public.projetos
      FOR UPDATE
      USING (owner = auth.uid())
      WITH CHECK (owner = auth.uid());
  END IF;
END$$;

-- DELETE: only delete own projetos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_policy p
    JOIN pg_catalog.pg_class c ON p.polrelid = c.oid
    JOIN pg_catalog.pg_namespace n ON c.relnamespace = n.oid
    WHERE p.polname = 'Delete own projetos' AND n.nspname = 'public' AND c.relname = 'projetos'
  ) THEN
    CREATE POLICY "Delete own projetos" ON public.projetos
      FOR DELETE
      USING (owner = auth.uid());
  END IF;
END$$;

-- CUSTOS policies (scoped by projeto owner)
-- INSERT: only insert custos when the referenced projeto belongs to auth.uid()
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_policy p
    JOIN pg_catalog.pg_class c ON p.polrelid = c.oid
    JOIN pg_catalog.pg_namespace n ON c.relnamespace = n.oid
    WHERE p.polname = 'Insert custos for own projetos' AND n.nspname = 'public' AND c.relname = 'custos'
  ) THEN
    CREATE POLICY "Insert custos for own projetos" ON public.custos
      FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.projetos p WHERE p.id = custos.projeto_id AND p.owner = auth.uid()
        )
      );
  END IF;
END$$;

-- SELECT: can only select custos belonging to projetos owned by the user
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_policy p
    JOIN pg_catalog.pg_class c ON p.polrelid = c.oid
    JOIN pg_catalog.pg_namespace n ON c.relnamespace = n.oid
    WHERE p.polname = 'Select custos for own projetos' AND n.nspname = 'public' AND c.relname = 'custos'
  ) THEN
    CREATE POLICY "Select custos for own projetos" ON public.custos
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.projetos p WHERE p.id = custos.projeto_id AND p.owner = auth.uid()
        )
      );
  END IF;
END$$;

-- UPDATE: only update custos for projetos owned by the user
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_policy p
    JOIN pg_catalog.pg_class c ON p.polrelid = c.oid
    JOIN pg_catalog.pg_namespace n ON c.relnamespace = n.oid
    WHERE p.polname = 'Update custos for own projetos' AND n.nspname = 'public' AND c.relname = 'custos'
  ) THEN
    CREATE POLICY "Update custos for own projetos" ON public.custos
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
  END IF;
END$$;

-- DELETE: only delete custos for projetos owned by the user
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_policy p
    JOIN pg_catalog.pg_class c ON p.polrelid = c.oid
    JOIN pg_catalog.pg_namespace n ON c.relnamespace = n.oid
    WHERE p.polname = 'Delete custos for own projetos' AND n.nspname = 'public' AND c.relname = 'custos'
  ) THEN
    CREATE POLICY "Delete custos for own projetos" ON public.custos
      FOR DELETE
      USING (
        EXISTS (
          SELECT 1 FROM public.projetos p WHERE p.id = custos.projeto_id AND p.owner = auth.uid()
        )
      );
  END IF;
END$$;

-- Optional: allow authenticated users to read materiais_precos (shared data)
ALTER TABLE IF EXISTS public.materiais_precos ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_policy p
    JOIN pg_catalog.pg_class c ON p.polrelid = c.oid
    JOIN pg_catalog.pg_namespace n ON c.relnamespace = n.oid
    WHERE p.polname = 'Select materiais_precos public' AND n.nspname = 'public' AND c.relname = 'materiais_precos'
  ) THEN
    CREATE POLICY "Select materiais_precos public" ON public.materiais_precos
      FOR SELECT
      USING (true);
  END IF;
END$$;

-- Note: after running this migration ensure service_role (or DB admin) has permissions
-- to manage the DB; regular users will be constrained by these policies.
