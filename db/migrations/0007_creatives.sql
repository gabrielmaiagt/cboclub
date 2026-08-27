-- =====================================================================
-- 0007 — Criativos, formatos e tags
-- =====================================================================

-- Formatos extensiveis pelo usuario (§16)
create table public.creative_formats (
  id     uuid primary key default gen_random_uuid(),
  name   text not null,
  slug   text not null unique,
  active boolean not null default true,
  sort_order integer not null default 100
);

-- Tags (§17)
create table public.tags (
  id    uuid primary key default gen_random_uuid(),
  name  text not null,
  slug  text not null unique,
  color text not null default 'slate'
);

create sequence creative_code_seq;

create table public.creatives (
  id            uuid primary key default gen_random_uuid(),
  creative_code text unique not null,                -- CR-0001
  offer_id      uuid not null references public.offers(id) on delete cascade,
  angle_id      uuid references public.angles(id) on delete set null,
  script_id     uuid references public.scripts(id) on delete set null,
  script_version_id uuid references public.script_versions(id) on delete set null,
  title         text not null,
  hook          text,
  format_id     uuid references public.creative_formats(id),
  platform      traffic_platform not null default 'meta',
  duration_seconds integer check (duration_seconds >= 0),
  editor_user_id      uuid references public.profiles(id),
  responsible_user_id uuid references public.profiles(id),
  status        creative_status not null default 'ideia',
  storage_path  text,                                -- Firebase Storage: creatives/
  thumbnail_path text,
  source_url    text,
  inspiration_url text,
  notes         text,
  edited_at     timestamptz,
  approved_at   timestamptz,
  launched_at   timestamptz,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id),
  deleted_at timestamptz
);
create index on public.creatives (offer_id, status) where deleted_at is null;
create index on public.creatives (status)          where deleted_at is null;
create index on public.creatives (editor_user_id)  where deleted_at is null;
create index on public.creatives using gin (title gin_trgm_ops);

create trigger t_creative_code  before insert on public.creatives
  for each row execute function public.assign_code('creative_code','CR','creative_code_seq','4');
create trigger t_creative_audit before insert or update on public.creatives
  for each row execute function public.set_audit_fields();

create table public.creative_tags (
  creative_id uuid not null references public.creatives(id) on delete cascade,
  tag_id      uuid not null references public.tags(id) on delete cascade,
  primary key (creative_id, tag_id)
);
create index on public.creative_tags (tag_id);
