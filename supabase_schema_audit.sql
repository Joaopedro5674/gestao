-- 1. Tabela IMOVEIS
create table if not exists imoveis (
  id uuid default gen_random_uuid() primary key,
  nome text not null,
  valor_aluguel numeric not null,
  ativo boolean default true,
  created_at timestamptz default now(),
  user_id uuid default auth.uid() -- Optional: if RLS is used
);

-- 2. Tabela IMOVEIS_PAGAMENTOS (Recebimentos)
create table if not exists imoveis_pagamentos (
  id uuid default gen_random_uuid() primary key,
  imovel_id uuid references imoveis(id) on delete cascade not null,
  mes_ref date not null, -- Sempre dia 01 (YYYY-MM-01)
  status text check (status in ('pendente', 'pago')) default 'pendente',
  data_pagamento timestamptz,
  valor_pago numeric,
  created_at timestamptz default now(),
  user_id uuid default auth.uid(),
  
  -- REGRA SUPREMA: Impedir duplicidade mensal
  unique(imovel_id, mes_ref)
);

-- 3. Tabela IMOVEIS_GASTOS (Novo nome solicitado, migrar se necessário)
create table if not exists imoveis_gastos (
  id uuid default gen_random_uuid() primary key,
  imovel_id uuid references imoveis(id) on delete cascade not null,
  mes_ref date not null,
  descricao text not null,
  valor numeric not null,
  categoria text default 'manutencao', -- Optional utility
  created_at timestamptz default now(),
  user_id uuid default auth.uid()
);

-- 4. Tabela EMPRESTIMOS
create table if not exists emprestimos (
  id uuid default gen_random_uuid() primary key,
  cliente_nome text not null,
  valor_emprestado numeric not null,
  juros_mensal numeric not null,
  dias_contratados int not null,
  juros_total_contratado numeric not null,
  data_inicio date not null,
  data_fim date not null,
  status text check (status in ('ativo', 'pago')) default 'ativo',
  data_pagamento timestamptz,
  created_at timestamptz default now(),
  user_id uuid default auth.uid()
);

-- Enable RLS (Optional but recommended)
alter table imoveis enable row level security;
alter table imoveis_pagamentos enable row level security;
alter table imoveis_gastos enable row level security;
alter table emprestimos enable row level security;

-- Policies (Simple 'public' or 'auth' - assuming authenticated user)
create policy "Users can view their own data" on imoveis for select using (auth.uid() = user_id);
create policy "Users can insert their own data" on imoveis for insert with check (auth.uid() = user_id);
create policy "Users can update their own data" on imoveis for update using (auth.uid() = user_id);
create policy "Users can delete their own data" on imoveis for delete using (auth.uid() = user_id);

-- (Repeat policies for other tables if needed, or open for simplification)
-- For now, let's assume the user handles RLS or the project has it disabled for dev.
