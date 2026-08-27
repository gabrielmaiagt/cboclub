-- =====================================================================
-- 0015 — Busca global (§43) e conversao mineracao -> oferta (§29)
-- =====================================================================

create or replace function public.search_all(q text)
returns table (entity text, id uuid, code text, title text, subtitle text, status text)
language sql stable as $$
  select 'offer', o.id, o.internal_code, o.name, coalesce(o.niche,''), o.status::text
    from public.offers o
   where o.deleted_at is null
     and (o.name ilike '%'||q||'%' or o.internal_code ilike '%'||q||'%'
          or o.niche ilike '%'||q||'%')
  union all
  select 'creative', c.id, c.creative_code, c.title, coalesce(c.hook,''), c.status::text
    from public.creatives c
   where c.deleted_at is null
     and (c.title ilike '%'||q||'%' or c.creative_code ilike '%'||q||'%')
  union all
  select 'script', s.id, s.script_code, s.title, '', s.status::text
    from public.scripts s
   where s.deleted_at is null
     and (s.title ilike '%'||q||'%' or s.script_code ilike '%'||q||'%')
  union all
  select 'chip', ch.id, ch.chip_code, coalesce(ch.phone_masked, ch.chip_code),
         coalesce(ch.operator,''), ch.status::text
    from public.chips ch
   where ch.deleted_at is null and ch.chip_code ilike '%'||q||'%'
  union all
  select 'experiment', e.id, e.experiment_code, e.name,
         coalesce(e.hypothesis,''), e.status::text
    from public.experiments e
   where e.deleted_at is null
     and (e.name ilike '%'||q||'%' or e.experiment_code ilike '%'||q||'%')
  union all
  select 'mining', m.id, m.mining_code, m.name, coalesce(m.niche,''), m.status::text
    from public.mining_items m
   where m.deleted_at is null
     and (m.name ilike '%'||q||'%' or m.mining_code ilike '%'||q||'%'
          or m.niche ilike '%'||q||'%')
  limit 50
$$;

-- Converte item minerado em oferta mantendo a relacao original (§29)
create or replace function public.convert_mining_to_offer(p_mining_id uuid)
returns uuid language plpgsql as $$
declare
  v_offer_id uuid;
  m public.mining_items;
begin
  select * into m from public.mining_items where id = p_mining_id;
  if not found then
    raise exception 'Item de mineracao % nao encontrado', p_mining_id;
  end if;
  if m.converted_offer_id is not null then
    return m.converted_offer_id;
  end if;

  insert into public.offers
    (name, niche, country, language, main_promise, mechanism,
     ticket_price, status, mining_item_id, responsible_user_id, notes)
  values
    (m.name, m.niche, coalesce(m.country,'BR'), coalesce(m.language,'pt-BR'),
     m.promise, m.mechanism, m.price, 'aprovada', m.id,
     coalesce(m.responsible_user_id, public.current_uid()),
     concat_ws(chr(10), 'Origem: ' || coalesce(m.source,'-'), m.why_interesting))
  returning id into v_offer_id;

  update public.mining_items
     set status = 'convertida', converted_offer_id = v_offer_id
   where id = p_mining_id;

  return v_offer_id;
end $$;
