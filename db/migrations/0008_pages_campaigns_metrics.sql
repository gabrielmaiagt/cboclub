-- =====================================================================
-- 0008 — Paginas, campanhas e metricas diarias
--
-- daily_metrics e a FONTE DA VERDADE de gasto com trafego e receita de
-- oferta. expenses cobre overhead; revenues cobre receita fora de oferta.
-- Ver inconsistencia #1 no plano (anti-dupla-contagem).
-- =====================================================================

create table public.landing_pages (
  id       uuid primary key default gen_random_uuid(),
  offer_id uuid not null references public.offers(id) on delete cascade,
  name     text not null,                            -- PV, Quiz, Checkout
  version  text not null default 'V1',
  url      text,
  status   landing_page_status not null default 'rascunho',
  headline text,
  notes    text,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id),
  deleted_at timestamptz
);
create index on public.landing_pages (offer_id) where deleted_at is null;
create trigger t_page_audit before insert or update on public.landing_pages
  for each row execute function public.set_audit_fields();

create table public.campaigns (
  id            uuid primary key default gen_random_uuid(),
  offer_id      uuid not null references public.offers(id) on delete cascade,
  name          text not null,
  platform      traffic_platform not null default 'meta',
  account       text,
  campaign_code text,                                -- id externo da plataforma
  status        campaign_status not null default 'rascunho',
  start_date    date,
  responsible_user_id uuid references public.profiles(id),
  notes         text,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id),
  deleted_at timestamptz
);
create index on public.campaigns (offer_id, status) where deleted_at is null;
create trigger t_campaign_audit before insert or update on public.campaigns
  for each row execute function public.set_audit_fields();

-- ── METRICAS DIARIAS POR OFERTA ─────────────────────────────────────
create table public.daily_metrics (
  id          uuid primary key default gen_random_uuid(),
  date        date not null,
  offer_id    uuid not null references public.offers(id) on delete cascade,
  campaign_id uuid references public.campaigns(id) on delete set null,
  spend       numeric(12,2) not null default 0 check (spend >= 0),
  impressions bigint  not null default 0 check (impressions >= 0),
  clicks      bigint  not null default 0 check (clicks >= 0),
  leads       integer not null default 0 check (leads >= 0),
  sales       integer not null default 0 check (sales >= 0),
  revenue     numeric(12,2) not null default 0 check (revenue >= 0),
  refunds     numeric(12,2) not null default 0 check (refunds >= 0),
  gateway_fees     numeric(12,2) not null default 0 check (gateway_fees >= 0),
  additional_costs numeric(12,2) not null default 0 check (additional_costs >= 0),

  -- Derivadas calculadas pelo banco: nunca divergem entre telas (§32)
  ctr        numeric generated always as (clicks::numeric / nullif(impressions,0)) stored,
  cpc        numeric generated always as (spend / nullif(clicks,0)) stored,
  cpm        numeric generated always as (spend * 1000 / nullif(impressions,0)) stored,
  cpl        numeric generated always as (spend / nullif(leads,0)) stored,
  cpa        numeric generated always as (spend / nullif(sales,0)) stored,
  roas       numeric generated always as (revenue / nullif(spend,0)) stored,
  avg_ticket numeric generated always as (revenue / nullif(sales,0)) stored,
  net_profit numeric generated always as
    (revenue - refunds - gateway_fees - spend - additional_costs) stored,

  notes text,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id)
);
-- unique tolerante a NULL em campaign_id
create unique index daily_metrics_uniq on public.daily_metrics
  (date, offer_id, coalesce(campaign_id,'00000000-0000-0000-0000-000000000000'::uuid));
create index on public.daily_metrics (date desc);
create index on public.daily_metrics (offer_id, date desc);
create trigger t_daily_audit before insert or update on public.daily_metrics
  for each row execute function public.set_audit_fields();

-- ── METRICAS DIARIAS POR CRIATIVO (§18) ─────────────────────────────
create table public.creative_daily_metrics (
  id          uuid primary key default gen_random_uuid(),
  creative_id uuid not null references public.creatives(id) on delete cascade,
  date        date not null,
  spend       numeric(12,2) not null default 0,
  impressions bigint  not null default 0,
  clicks      bigint  not null default 0,
  leads       integer not null default 0,
  sales       integer not null default 0,
  revenue     numeric(12,2) not null default 0,
  cpm  numeric generated always as (spend * 1000 / nullif(impressions,0)) stored,
  ctr  numeric generated always as (clicks::numeric / nullif(impressions,0)) stored,
  cpc  numeric generated always as (spend / nullif(clicks,0)) stored,
  cpl  numeric generated always as (spend / nullif(leads,0)) stored,
  cpa  numeric generated always as (spend / nullif(sales,0)) stored,
  roas numeric generated always as (revenue / nullif(spend,0)) stored,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id),
  unique (creative_id, date)
);
create index on public.creative_daily_metrics (date desc);
create trigger t_cdm_audit before insert or update on public.creative_daily_metrics
  for each row execute function public.set_audit_fields();
