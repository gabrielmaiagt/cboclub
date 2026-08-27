-- =====================================================================
-- 0016 — Row Level Security e privilegios
--
-- MODELO DE ACESSO (adaptado do Supabase para Cloud SQL):
--   * As migrations rodam como o dono do schema (postgres). O dono NAO
--     e submetido a RLS, entao seed e manutencao funcionam normalmente.
--   * A aplicacao conecta como app_user, que NAO e dono de nada. Para
--     ele a RLS vale integralmente.
--   * Antes de cada query a app executa:
--         SET LOCAL app.firebase_uid = '<uid do Firebase>';
--     e as politicas abaixo resolvem o profile e o papel a partir disso.
-- =====================================================================

-- ── Role da aplicacao ───────────────────────────────────────────────
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'app_user') then
    create role app_user nologin;
  end if;
end $$;

grant usage on schema public, app to app_user;
grant select, insert, update, delete on all tables in schema public to app_user;
grant usage, select on all sequences in schema public to app_user;
grant execute on all functions in schema public, app to app_user;

alter default privileges in schema public
  grant select, insert, update, delete on tables to app_user;
alter default privileges in schema public
  grant usage, select on sequences to app_user;
alter default privileges in schema public
  grant execute on functions to app_user;

-- ── Habilita RLS em tudo ────────────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array[
    'profiles','app_settings','mining_items','offers','angles','scripts','script_versions',
    'creative_formats','tags','creatives','creative_tags','landing_pages','campaigns',
    'daily_metrics','creative_daily_metrics','experiments','experiment_creatives',
    'chips','chip_secrets','chip_events','partners','expenses','revenues',
    'capital_contributions','profit_distributions','decisions','tasks','sops','tools',
    'activity_logs']
  loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- ── LEITURA: todo usuario ativo le o operacional ────────────────────
do $$
declare t text;
begin
  foreach t in array array[
    'profiles','app_settings','mining_items','offers','angles','scripts','script_versions',
    'creative_formats','tags','creatives','creative_tags','landing_pages','campaigns',
    'daily_metrics','creative_daily_metrics','experiments','experiment_creatives',
    'chips','chip_events','decisions','tasks','sops','tools','activity_logs']
  loop
    execute format(
      'create policy %I on public.%I for select to app_user using (public.auth_role() is not null)',
      t || '_read', t);
  end loop;
end $$;

-- ── LEITURA RESTRITA: financeiro e numeros de chip (§54) ────────────
create policy partners_read on public.partners
  for select to app_user using (public.is_admin());
create policy expenses_read on public.expenses
  for select to app_user using (public.has_role('owner','admin','trafego'));
create policy revenues_read on public.revenues
  for select to app_user using (public.is_admin());
create policy contrib_read on public.capital_contributions
  for select to app_user using (public.is_admin());
create policy distrib_read on public.profit_distributions
  for select to app_user using (public.is_admin());
create policy chip_secrets_read on public.chip_secrets
  for select to app_user using (public.has_role('owner','admin','operacao'));

-- ── ESCRITA por grupo de papeis (§3) ────────────────────────────────

-- Ofertas, trafego, testes e mineracao: owner, admin, trafego
do $$
declare t text;
begin
  foreach t in array array[
    'offers','angles','landing_pages','decisions','campaigns','daily_metrics',
    'creative_daily_metrics','experiments','experiment_creatives','mining_items']
  loop
    execute format(
      'create policy %I on public.%I for all to app_user
         using (public.has_role(''owner'',''admin'',''trafego''))
         with check (public.has_role(''owner'',''admin'',''trafego''))',
      t || '_write', t);
  end loop;
end $$;

-- Criativos e copy: owner, admin, criativo, trafego
do $$
declare t text;
begin
  foreach t in array array[
    'creatives','scripts','script_versions','creative_tags','tags','creative_formats']
  loop
    execute format(
      'create policy %I on public.%I for all to app_user
         using (public.has_role(''owner'',''admin'',''criativo'',''trafego''))
         with check (public.has_role(''owner'',''admin'',''criativo'',''trafego''))',
      t || '_write', t);
  end loop;
end $$;

-- Chips: owner, admin, operacao
do $$
declare t text;
begin
  foreach t in array array['chips','chip_events','chip_secrets']
  loop
    execute format(
      'create policy %I on public.%I for all to app_user
         using (public.has_role(''owner'',''admin'',''operacao''))
         with check (public.has_role(''owner'',''admin'',''operacao''))',
      t || '_write', t);
  end loop;
end $$;

-- Financeiro: somente owner/admin
do $$
declare t text;
begin
  foreach t in array array[
    'partners','expenses','revenues','capital_contributions','profit_distributions']
  loop
    execute format(
      'create policy %I on public.%I for all to app_user
         using (public.is_admin()) with check (public.is_admin())',
      t || '_write', t);
  end loop;
end $$;

-- Tarefas: qualquer nao-viewer cria; edita as proprias ou as que criou
create policy tasks_insert on public.tasks
  for insert to app_user with check (public.can_write());
create policy tasks_update on public.tasks
  for update to app_user
  using (public.is_admin()
         or responsible_user_id = public.current_uid()
         or created_by = public.current_uid())
  with check (public.can_write());
create policy tasks_delete on public.tasks
  for delete to app_user
  using (public.is_admin() or created_by = public.current_uid());

-- SOPs e ferramentas: escrita apenas admin
create policy sops_write on public.sops
  for all to app_user using (public.is_admin()) with check (public.is_admin());
create policy tools_write on public.tools
  for all to app_user using (public.is_admin()) with check (public.is_admin());

-- Settings: escrita apenas admin
create policy settings_write on public.app_settings
  for all to app_user using (public.is_admin()) with check (public.is_admin());

-- Profiles: cada um edita o proprio; papel so o owner muda
create policy profiles_self_update on public.profiles
  for update to app_user
  using (id = public.current_uid() or public.is_admin())
  with check (id = public.current_uid() or public.is_admin());
create policy profiles_owner_all on public.profiles
  for all to app_user
  using (public.has_role('owner')) with check (public.has_role('owner'));

-- Activity log: imutavel para a aplicacao.
-- Escrito pelos triggers, que sao SECURITY DEFINER e rodam como o dono.
revoke insert, update, delete on public.activity_logs from app_user;
