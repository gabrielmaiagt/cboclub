-- =====================================================================
-- 0013 — Activity log
--
-- Uma tabela alimenta tres coisas: o Historico da oferta (§12), o
-- Activity Log global (§42) e a auditoria. Por isso nao existe
-- offer_status_history separada.
-- =====================================================================

create table public.activity_logs (
  id          bigserial primary key,
  actor_id    uuid references public.profiles(id),
  entity_type text not null,          -- offer | creative | script | chip | ...
  entity_id   uuid not null,
  entity_code text,
  offer_id    uuid references public.offers(id) on delete cascade,
  action      text not null,          -- created | status_changed
  field       text,
  old_value   text,
  new_value   text,
  description text,
  created_at  timestamptz not null default now()
);
create index on public.activity_logs (offer_id, created_at desc);
create index on public.activity_logs (entity_type, entity_id, created_at desc);
create index on public.activity_logs (created_at desc);

-- Trigger generico: log_activity('entity_type','coluna_codigo','coluna_offer_id')
create or replace function public.log_activity() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_type      text  := tg_argv[0];
  v_code_col  text  := tg_argv[1];
  v_offer_col text  := tg_argv[2];
  j_new jsonb := to_jsonb(new);
  j_old jsonb := case when tg_op = 'UPDATE' then to_jsonb(old) else null end;
  v_offer uuid := nullif(j_new->>v_offer_col, '')::uuid;
  v_code  text := j_new->>v_code_col;
begin
  if tg_op = 'INSERT' then
    insert into public.activity_logs
      (actor_id, entity_type, entity_id, entity_code, offer_id, action, description)
    values (public.current_uid(), v_type, new.id, v_code, v_offer, 'created',
            format('%s %s criado', v_type, coalesce(v_code,'')));
  elsif (j_new->>'status') is distinct from (j_old->>'status') then
    insert into public.activity_logs
      (actor_id, entity_type, entity_id, entity_code, offer_id,
       action, field, old_value, new_value, description)
    values (public.current_uid(), v_type, new.id, v_code, v_offer,
            'status_changed', 'status', j_old->>'status', j_new->>'status',
            format('%s %s: %s -> %s', v_type, coalesce(v_code,''),
                   j_old->>'status', j_new->>'status'));
  end if;
  return new;
end $$;

create trigger t_log_offer      after insert or update on public.offers
  for each row execute function public.log_activity('offer','internal_code','id');
create trigger t_log_creative   after insert or update on public.creatives
  for each row execute function public.log_activity('creative','creative_code','offer_id');
create trigger t_log_script     after insert or update on public.scripts
  for each row execute function public.log_activity('script','script_code','offer_id');
create trigger t_log_experiment after insert or update on public.experiments
  for each row execute function public.log_activity('experiment','experiment_code','offer_id');
create trigger t_log_chip       after insert or update on public.chips
  for each row execute function public.log_activity('chip','chip_code','current_offer_id');
create trigger t_log_mining     after insert or update on public.mining_items
  for each row execute function public.log_activity('mining','mining_code','converted_offer_id');
create trigger t_log_page       after insert or update on public.landing_pages
  for each row execute function public.log_activity('landing_page','name','offer_id');
create trigger t_log_campaign   after insert or update on public.campaigns
  for each row execute function public.log_activity('campaign','name','offer_id');
