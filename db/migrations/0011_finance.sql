-- =====================================================================
-- 0011 — Financeiro
--
-- SEPARACAO CONTABIL (§33, §36, §37):
--   daily_metrics ....... gasto com trafego + receita de oferta (P&L)
--   expenses ............ overhead (P&L), exceto ads/gateway
--   revenues ............ receita fora de oferta (P&L)
--   capital_contributions  movimento de CAPITAL, nao e receita
--   profit_distributions   movimento de CAPITAL, nao e despesa
-- =====================================================================

create table public.partners (
  id        uuid primary key default gen_random_uuid(),
  name      text not null,
  ownership_percentage numeric(5,2) not null default 0
    check (ownership_percentage >= 0 and ownership_percentage <= 100),
  active    boolean not null default true,
  user_id   uuid references public.profiles(id),
  notes     text,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id)
);

-- Despesas: overhead. Ads e gateway ja estao em daily_metrics, entao
-- entram com counts_in_pnl = false (ficam como registro de caixa).
create table public.expenses (
  id          uuid primary key default gen_random_uuid(),
  date        date not null default current_date,
  category    expense_category not null,
  description text not null,
  amount      numeric(12,2) not null check (amount >= 0),
  offer_id    uuid references public.offers(id) on delete set null,
  responsible_user_id uuid references public.profiles(id),
  recurring   boolean not null default false,
  receipt_path text,                                 -- Firebase Storage: receipts/
  notes       text,
  counts_in_pnl boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id),
  deleted_at timestamptz
);
create index on public.expenses (date desc) where deleted_at is null;
create index on public.expenses (category)  where deleted_at is null;
create index on public.expenses (offer_id)  where deleted_at is null;

create or replace function public.default_counts_in_pnl() returns trigger
language plpgsql as $$
begin
  if new.category in ('meta_ads','gateway') then
    new.counts_in_pnl := false;
  end if;
  return new;
end $$;
create trigger t_expense_pnl   before insert on public.expenses
  for each row execute function public.default_counts_in_pnl();
create trigger t_expense_audit before insert or update on public.expenses
  for each row execute function public.set_audit_fields();

-- Receita fora do fluxo de oferta. Venda de oferta vai em daily_metrics.
create table public.revenues (
  id          uuid primary key default gen_random_uuid(),
  date        date not null default current_date,
  source      revenue_source not null default 'outro',
  description text not null,
  amount      numeric(12,2) not null check (amount >= 0),
  offer_id    uuid references public.offers(id) on delete set null,
  notes       text,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id),
  deleted_at timestamptz,
  constraint revenue_not_offer_sale check (source <> 'venda_oferta')
);
create index on public.revenues (date desc) where deleted_at is null;
create trigger t_revenue_audit before insert or update on public.revenues
  for each row execute function public.set_audit_fields();

-- Aporte: NAO e receita (§36)
create table public.capital_contributions (
  id         uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners(id) on delete restrict,
  date       date not null default current_date,
  amount     numeric(12,2) not null check (amount > 0),
  notes      text,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id)
);
create index on public.capital_contributions (partner_id, date desc);

-- Distribuicao: NAO e despesa operacional (§37)
create table public.profit_distributions (
  id         uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners(id) on delete restrict,
  date       date not null default current_date,
  amount     numeric(12,2) not null check (amount > 0),
  period     text,                                   -- '2026-08'
  notes      text,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id)
);
create index on public.profit_distributions (partner_id, date desc);
