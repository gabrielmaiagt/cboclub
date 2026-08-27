-- =====================================================================
-- 0010 — Chips, numeros protegidos e historico
--
-- RLS do Postgres e por LINHA, nao por coluna. Para esconder o numero de
-- quem nao tem permissao, ele vive em chip_secrets, tabela separada com
-- politica propria. chips.phone_masked guarda apenas ••••1234.
-- =====================================================================
create sequence chip_code_seq;

create table public.chips (
  id           uuid primary key default gen_random_uuid(),
  chip_code    text unique not null,                 -- CHIP-001
  phone_masked text,                                 -- ••••1234 (derivado)
  operator     text,
  status       chip_status not null default 'novo',
  acquisition_date  date,
  warmup_start_date date,
  ready_date        date,
  activation_date   date,
  responsible_user_id uuid references public.profiles(id),
  current_offer_id    uuid references public.offers(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id),
  deleted_at timestamptz
);
create index on public.chips (status)           where deleted_at is null;
create index on public.chips (current_offer_id) where deleted_at is null;

create trigger t_chip_code  before insert on public.chips
  for each row execute function public.assign_code('chip_code','CHIP','chip_code_seq','3');
create trigger t_chip_audit before insert or update on public.chips
  for each row execute function public.set_audit_fields();

-- Numero real isolado: RLS propria (owner/admin/operacao)
create table public.chip_secrets (
  chip_id      uuid primary key references public.chips(id) on delete cascade,
  phone_number text not null,
  updated_at   timestamptz not null default now(),
  updated_by   uuid references public.profiles(id)
);

create or replace function public.sync_phone_mask() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.chips
     set phone_masked = '••••' || right(regexp_replace(new.phone_number, '\D', '', 'g'), 4)
   where id = new.chip_id;
  return new;
end $$;
create trigger t_sync_phone_mask after insert or update on public.chip_secrets
  for each row execute function public.sync_phone_mask();

-- ── HISTORICO DO CHIP (§27) ─────────────────────────────────────────
create table public.chip_events (
  id          uuid primary key default gen_random_uuid(),
  chip_id     uuid not null references public.chips(id) on delete cascade,
  event_type  chip_event_type not null,
  offer_id    uuid references public.offers(id) on delete set null,
  description text,
  date        date not null default current_date,
  user_id     uuid references public.profiles(id),
  created_at  timestamptz not null default now()
);
create index on public.chip_events (chip_id, date desc);

-- Mudanca de status gera evento automaticamente
create or replace function public.log_chip_status_change() returns trigger
language plpgsql as $$
begin
  if tg_op = 'UPDATE' and new.status is distinct from old.status then
    insert into public.chip_events (chip_id, event_type, offer_id, description, user_id)
    values (new.id,
            case new.status
              when 'aquecendo'    then 'aquecimento_iniciado'::chip_event_type
              when 'pronto'       then 'pronto'::chip_event_type
              when 'ativo'        then 'vinculado_oferta'::chip_event_type
              when 'reserva'      then 'reserva'::chip_event_type
              when 'indisponivel' then 'indisponivel'::chip_event_type
              when 'arquivado'    then 'arquivado'::chip_event_type
              else 'nota'::chip_event_type end,
            new.current_offer_id,
            format('Status: %s -> %s', old.status, new.status),
            public.current_uid());
  end if;
  return new;
end $$;
create trigger t_chip_status_event after update on public.chips
  for each row execute function public.log_chip_status_change();
