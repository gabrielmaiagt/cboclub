-- =====================================================================
-- 0002 — Identidade da sessão, auditoria e códigos automáticos
--
-- ADAPTAÇÃO CLOUD SQL: no Supabase a identidade vinha de auth.uid().
-- Aqui a app injeta o UID do Firebase por transação:
--     SET LOCAL app.firebase_uid = '<uid>';
-- e o Postgres resolve o profile correspondente. Todas as políticas de
-- RLS continuam sendo escritas em termos de public.current_uid().
-- =====================================================================

-- UID do Firebase da sessão atual (NULL se não houver)
create or replace function app.firebase_uid() returns text
language sql stable as $$
  select nullif(current_setting('app.firebase_uid', true), '')
$$;

-- Profile UUID do usuário atual
create or replace function public.current_uid() returns uuid
language sql stable security definer set search_path = public, app as $$
  select p.id from public.profiles p
   where p.firebase_uid = app.firebase_uid() and p.active
$$;

-- Papel do usuário atual
create or replace function public.auth_role() returns app_role
language sql stable security definer set search_path = public, app as $$
  select p.role from public.profiles p
   where p.firebase_uid = app.firebase_uid() and p.active
$$;

create or replace function public.has_role(variadic roles app_role[]) returns boolean
language sql stable as $$ select public.auth_role() = any(roles) $$;

create or replace function public.is_admin() returns boolean
language sql stable as $$ select public.auth_role() in ('owner','admin') $$;

create or replace function public.can_write() returns boolean
language sql stable as $$ select coalesce(public.auth_role() <> 'viewer', false) $$;

-- ── Auditoria automática: created_at/by, updated_at/by ───────────────
create or replace function public.set_audit_fields() returns trigger
language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    new.created_at := coalesce(new.created_at, now());
    new.created_by := coalesce(new.created_by, public.current_uid());
  end if;
  new.updated_at := now();
  new.updated_by := public.current_uid();
  return new;
end $$;

-- ── Código automático genérico ───────────────────────────────────────
-- Uso: assign_code('coluna','PREFIXO','sequence', largura)
create or replace function public.assign_code() returns trigger
language plpgsql as $$
declare
  v_col    text  := tg_argv[0];
  v_prefix text  := tg_argv[1];
  v_seq    text  := tg_argv[2];
  v_width  int   := coalesce(tg_argv[3]::int, 4);
  v_rec    jsonb := to_jsonb(new);
begin
  if v_rec->>v_col is null then
    v_rec := jsonb_set(v_rec, array[v_col], to_jsonb(
      v_prefix || '-' || lpad(nextval(v_seq::regclass)::text, v_width, '0')));
    new := jsonb_populate_record(new, v_rec);
  end if;
  return new;
end $$;
