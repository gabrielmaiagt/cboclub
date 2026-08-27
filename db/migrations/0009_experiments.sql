-- =====================================================================
-- 0009 — Testes (experiments)
--
-- REGRA CENTRAL (§23): um teste nao pode ser marcado como concluido sem
-- conclusao (o que aprendemos) e proxima acao (o que faremos). Isso e um
-- CHECK de banco, nao validacao de formulario — nao ha como perder
-- aprendizado nem por acesso direto ao Postgres.
-- =====================================================================
create sequence experiment_code_seq;

create table public.experiments (
  id              uuid primary key default gen_random_uuid(),
  experiment_code text unique not null,              -- TEST-0001
  offer_id        uuid not null references public.offers(id) on delete cascade,
  name            text not null,
  hypothesis      text not null,
  variable_type   experiment_variable not null,
  description     text,
  status          experiment_status not null default 'planejado',
  start_date      date,
  end_date        date,
  responsible_user_id uuid references public.profiles(id),

  -- Numeros da janela testada, informados manualmente.
  -- Distinto de daily_metrics: aquele e o razao diario da oferta,
  -- este e o registro daquele teste especifico.
  spend   numeric(12,2) not null default 0 check (spend >= 0),
  revenue numeric(12,2) not null default 0 check (revenue >= 0),
  leads   integer not null default 0 check (leads >= 0),
  sales   integer not null default 0 check (sales >= 0),
  roas    numeric generated always as (revenue / nullif(spend,0)) stored,
  cpa     numeric generated always as (spend / nullif(sales,0)) stored,

  result      experiment_result,
  conclusion  text,                                  -- o que aprendemos
  next_action text,                                  -- o que faremos

  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id),
  deleted_at timestamptz,

  constraint experiment_learning_required check (
    status <> 'concluido'
    or (nullif(btrim(conclusion),'')  is not null
    and nullif(btrim(next_action),'') is not null
    and result is not null)
  ),
  constraint experiment_dates check (
    end_date is null or start_date is null or end_date >= start_date)
);
create index on public.experiments (offer_id, status) where deleted_at is null;
create index on public.experiments (variable_type)    where deleted_at is null;
create index on public.experiments (result)           where deleted_at is null;

create trigger t_exp_code  before insert on public.experiments
  for each row execute function public.assign_code('experiment_code','TEST','experiment_code_seq','4');
create trigger t_exp_audit before insert or update on public.experiments
  for each row execute function public.set_audit_fields();

-- Criativos participantes de um teste
create table public.experiment_creatives (
  experiment_id uuid not null references public.experiments(id) on delete cascade,
  creative_id   uuid not null references public.creatives(id) on delete cascade,
  primary key (experiment_id, creative_id)
);
create index on public.experiment_creatives (creative_id);
