-- =====================================================================
-- 0003 — Profiles (espelho do Firebase Auth) e configurações
-- =====================================================================
create table public.profiles (
  id           uuid primary key default gen_random_uuid(),
  firebase_uid text unique not null,
  full_name    text not null default '',
  email        text,
  role         app_role not null default 'viewer',
  avatar_url   text,
  active       boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index on public.profiles (role) where active;
create index on public.profiles (firebase_uid);

create table public.app_settings (
  key         text primary key,
  value       jsonb not null,
  description text,
  updated_at  timestamptz not null default now(),
  updated_by  uuid references public.profiles(id)
);

insert into public.app_settings (key, value, description) values
  ('copy_words_per_minute', '150'::jsonb, 'Palavras por minuto para estimar duração de locução'),
  ('chips_target',           '50'::jsonb, 'Meta de chips da operação'),
  ('currency',            '"BRL"'::jsonb, 'Moeda base'),
  ('default_country',      '"BR"'::jsonb, 'País padrão de novas ofertas');
