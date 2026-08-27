-- =====================================================================
-- 0005 — Ofertas (núcleo do sistema)
-- =====================================================================
create sequence offer_code_seq;

create table public.offers (
  id              uuid primary key default gen_random_uuid(),
  internal_code   text unique not null,              -- OFFER-0001
  name            text not null,
  niche           text,
  sub_niche       text,
  country         text not null default 'BR',
  language        text not null default 'pt-BR',
  main_promise    text,
  mechanism       text,
  target_audience text,
  ticket_price    numeric(12,2) check (ticket_price >= 0),
  status          offer_status   not null default 'minerada',
  health          offer_health   not null default 'saudavel',   -- §50, manual
  priority        priority_level not null default 'media',
  responsible_user_id uuid references public.profiles(id),
  mining_item_id  uuid references public.mining_items(id) on delete set null,

  -- alimenta a coluna "Próxima ação" (§6) e a Fila de Lançamento (§8)
  next_action     text,
  next_action_due date,

  launch_date     date,
  validation_date date,
  scaling_date    date,
  notes           text,

  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id),
  deleted_at timestamptz
);

alter table public.mining_items
  add constraint mining_items_converted_offer_fk
  foreign key (converted_offer_id) references public.offers(id) on delete set null;

create index on public.offers (status)              where deleted_at is null;
create index on public.offers (responsible_user_id) where deleted_at is null;
create index on public.offers (next_action_due)
  where deleted_at is null and next_action_due is not null;
create index on public.offers using gin (name gin_trgm_ops);

create trigger t_offer_code  before insert on public.offers
  for each row execute function public.assign_code('internal_code','OFFER','offer_code_seq','4');
create trigger t_offer_audit before insert or update on public.offers
  for each row execute function public.set_audit_fields();
