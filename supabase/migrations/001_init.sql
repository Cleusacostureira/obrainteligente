-- Migração inicial para o projeto "Obrainteligente"
-- Cria tabelas: users, projetos, custos, materiais_precos, materiais_coeficientes

-- Habilita extensão para geração de UUIDs (se disponível)
create extension if not exists "pgcrypto";

-- Usuários (opcional - se usar Supabase Auth, ignore esta tabela)
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text,
  created_at timestamptz not null default now()
);

-- Projetos (obras)
create table if not exists projetos (
  id uuid primary key default gen_random_uuid(),
  owner uuid references users(id) on delete set null,
  nome text not null,
  tipo text,
  endereco text,
  area numeric,
  padrao text,
  orcamento numeric,
  gasto_total numeric default 0,
  data_inicio date,
  data_termino date,
  status text,
  observacoes text,
  created_at timestamptz not null default now()
);

-- Custos / despesas
create table if not exists custos (
  id uuid primary key default gen_random_uuid(),
  projeto_id uuid references projetos(id) on delete cascade,
  data date,
  categoria text,
  descricao text,
  quantidade numeric,
  valor_unitario numeric,
  valor_total numeric,
  forma_pagamento text,
  created_at timestamptz not null default now()
);

-- Tabela de preços de materiais (para preencher tabelaPrecos)
create table if not exists materiais_precos (
  key text primary key,
  preco numeric not null,
  updated_at timestamptz not null default now()
);

-- Coeficientes por tipo/padrão (armazenados em JSONB)
create table if not exists materiais_coeficientes (
  id serial primary key,
  tipo text not null,
  padrao text not null,
  coeficientes jsonb not null,
  created_at timestamptz not null default now(),
  unique (tipo, padrao)
);

-- Índices úteis
create index if not exists idx_projetos_owner on projetos(owner);
create index if not exists idx_custos_projeto on custos(projeto_id);

-- Inserções iniciais a partir dos mocks (exemplos)
insert into materiais_precos (key, preco) values
('areiaGrossa', 85.00),
('areiaFina', 75.00),
('pedraBrita', 90.00),
('cimento', 32.50),
('tijolo', 0.85)
on conflict (key) do update set preco = excluded.preco, updated_at = now();

-- Exemplos de coeficientes (vazio por padrão — preencher conforme necessidade)
-- insert into materiais_coeficientes (tipo, padrao, coeficientes) values
-- ('casa','medio','{"areiaGrossa":0.04,"areiaFina":0.02}');
