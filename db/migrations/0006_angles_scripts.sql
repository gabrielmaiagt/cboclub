-- =====================================================================
-- 0006 — Ângulos e Copy (com versionamento imutável)
-- =====================================================================

-- offer_id NULL = ângulo de biblioteca, reusável entre ofertas (§13)
create table public.angles (
  id              uuid primary key default gen_random_uuid(),
  offer_id        uuid references public.offers(id) on delete cascade,
  parent_angle_id uuid references public.angles(id) on delete set null,
  name            text not null,                     -- Renda extra, Luxo, Economia...
  description     text,
  hypothesis      text,
  status          angle_status not null default 'ideia',
  result          text,
  notes           text,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id)
);
create index on public.angles (offer_id);
create unique index angles_library_name_uniq
  on public.angles (lower(name)) where offer_id is null;
create trigger t_angles_audit before insert or update on public.angles
  for each row execute function public.set_audit_fields();

-- ── COPY ────────────────────────────────────────────────────────────
create sequence script_code_seq;

create table public.scripts (
  id          uuid primary key default gen_random_uuid(),
  script_code text unique not null,                  -- CP-0001
  offer_id    uuid not null references public.offers(id) on delete cascade,
  angle_id    uuid references public.angles(id) on delete set null,
  title       text not null,
  status      script_status not null default 'rascunho',
  current_version integer not null default 1,
  responsible_user_id uuid references public.profiles(id),
  notes       text,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id),
  deleted_at timestamptz
);
create index on public.scripts (offer_id) where deleted_at is null;
create trigger t_script_code  before insert on public.scripts
  for each row execute function public.assign_code('script_code','CP','script_code_seq','4');
create trigger t_script_audit before insert or update on public.scripts
  for each row execute function public.set_audit_fields();

-- Versões imutáveis (§20): nunca sobrescrever
create table public.script_versions (
  id        uuid primary key default gen_random_uuid(),
  script_id uuid not null references public.scripts(id) on delete cascade,
  version   integer not null,
  hook      text,
  body      text not null default '',
  cta       text,
  word_count integer not null default 0,
  estimated_duration_seconds integer not null default 0,
  change_note text,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id),
  unique (script_id, version)
);
create index on public.script_versions (script_id, version desc);

-- word_count + duração estimada (WPM configurável em app_settings)
create or replace function public.compute_script_metrics() returns trigger
language plpgsql as $$
declare
  v_text text := concat_ws(' ', coalesce(new.hook,''), coalesce(new.body,''), coalesce(new.cta,''));
  v_wpm  numeric := coalesce(
    (select (value #>> '{}')::numeric from public.app_settings where key = 'copy_words_per_minute'), 150);
begin
  new.word_count := coalesce(array_length(
    array_remove(regexp_split_to_array(btrim(v_text), '\s+'), ''), 1), 0);
  new.estimated_duration_seconds := ceil(new.word_count / nullif(v_wpm,0) * 60)::int;
  return new;
end $$;
create trigger t_script_version_metrics before insert or update on public.script_versions
  for each row execute function public.compute_script_metrics();

-- Mantém scripts.current_version sincronizado
create or replace function public.bump_script_version() returns trigger
language plpgsql as $$
begin
  update public.scripts
     set current_version = greatest(current_version, new.version), updated_at = now()
   where id = new.script_id;
  return new;
end $$;
create trigger t_bump_script_version after insert on public.script_versions
  for each row execute function public.bump_script_version();
