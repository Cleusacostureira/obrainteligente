Setup rápido do Supabase

1) Variáveis de ambiente (local & Vercel)
- VITE_SUPABASE_URL -> URL do Supabase (ex: https://xyz.supabase.co)
- VITE_SUPABASE_ANON_KEY -> ANON public key

2) Aplicar migração
- No Supabase Dashboard: abra SQL Editor e cole o conteúdo de `supabase/migrations/001_init.sql`, execute.
- Ou use o Supabase CLI com uma chave de serviço (SERVICE_ROLE) para executar migrations.

3) Permissões
- Configure políticas RLS (Row Level Security) para garantir isolamento por `owner`:
  - Ative RLS nas tabelas `projetos` e `custos`.
  - Adicione policy para permitir SELECT/INSERT/UPDATE/DELETE apenas quando `auth.uid() = owner`.

Exemplo (SQL) para `projetos`:

-- Ativar RLS
ALTER TABLE projetos ENABLE ROW LEVEL SECURITY;

-- Policy: usuários autenticados podem inserir projetos com owner = auth.uid()
CREATE POLICY "Insert own projetos" ON projetos
FOR INSERT
WITH CHECK (owner = auth.uid());

-- Policy: selecionar apenas projetos do usuário
CREATE POLICY "Select own projetos" ON projetos
FOR SELECT USING (owner = auth.uid());

-- Policy: atualizar/excluir próprios
CREATE POLICY "Modify own projetos" ON projetos
FOR UPDATE, DELETE USING (owner = auth.uid()) WITH CHECK (owner = auth.uid());

Repita políticas semelhantes para `custos` (verificar `projeto_id` e dono) se desejar.

4) Deploy
- No Vercel, adicione `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` nas Environment Variables do projeto.

5) Observações
- Este repositório já contém o cliente Supabase em `src/lib/supabase.ts` e páginas usando auth e queries filtradas por `owner`.
- Instale o SDK se ainda não: `npm install @supabase/supabase-js`.
