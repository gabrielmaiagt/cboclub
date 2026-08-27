-- =====================================================================
-- 0004 — Mineração de ofertas
-- =====================================================================
create sequence mining_code_seq;

create table public.mining_items (
  id              uuid primary key default gen_random_uuid(),
  mining_code     text unique not null,              -- MIN-0001
  name            text not null,
  niche           text,
  source          text,                              -- Biblioteca Meta, TikTok, spy...
  source_url      text,
  advertiser      text,
  country         text default 'BR',
  language        text default 'pt-BR',
  promise         text,
  mechanism       text,
  price           numeric(12,2),
  page_url        text,
  creative_url    text,
  why_interesting text,
  hypothesis      text,
  notes           text,
  priority        priority_level not null default 'media',
  status          mining_status  not null default 'encontrada',
  responsible_user_id uuid references public.profiles(id),

  -- Score 1..5 (§30). NULL = ainda não avaliado.
  score_promise        smallint check (score_promise        between 1 and 5),
  score_scale_evidence smallint check (score_scale_evidence between 1 and 5),
  score_production     smallint check (score_production     between 1 and 5),
  score_delivery       smallint check (score_delivery       between 1 and 5),
  score_margin         smallint check (score_margin         between 1 and 5),
  score_creative       smallint check (score_creative       between 1 and 5),
  score_adaptation     smallint check (score_adaptation     between 1 and 5),
  score_total numeric(3,2) generated always as (
    ( coalesce(score_promise,0) + coalesce(score_scale_evidence,0)
    + coalesce(score_production,0) + coalesce(score_delivery,0)
    + coalesce(score_margin,0) + coalesce(score_creative,0)
    + coalesce(score_adaptation,0) )::numeric
    / nullif(
        (score_promise        is not null)::int + (score_scale_evidence is not null)::int
      + (score_production     is not null)::int + (score_delivery       is not null)::int
      + (score_margin         is not null)::int + (score_creative       is not null)::int
      + (score_adaptation     is not null)::int, 0)
  ) stored,

  converted_offer_id uuid,                           -- FK adicionada em 0005
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id),
  deleted_at timestamptz
);

create index on public.mining_items (status)   where deleted_at is null;
create index on public.mining_items (priority) where deleted_at is null;
create index on public.mining_items using gin (name gin_trgm_ops);

create trigger t_mining_code  before insert on public.mining_items
  for each row execute function public.assign_code('mining_code','MIN','mining_code_seq','4');
create trigger t_mining_audit before insert or update on public.mining_items
  for each row execute function public.set_audit_fields();
