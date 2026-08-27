-- =====================================================================
-- 0017 — Bootstrap de identidade
--
-- Problema: um usuario que acabou de logar no Firebase ainda nao tem
-- profile. Logo auth_role() e NULL, nenhuma politica de RLS passa, e ele
-- nao consegue criar o proprio profile. Classico ovo-e-galinha.
--
-- Solucao: uma unica funcao SECURITY DEFINER que roda como dono do
-- schema e cria o profile. E o unico caminho de escrita em profiles que
-- nao exige identidade previa, e ele nao aceita escolher o proprio papel.
--
-- O PRIMEIRO usuario do sistema vira owner. Os demais entram como viewer
-- e precisam ser promovidos por um owner em /usuarios.
-- =====================================================================

create or replace function public.ensure_profile(
  p_firebase_uid text,
  p_email        text default null,
  p_full_name    text default null,
  p_avatar_url   text default null
)
returns public.profiles
language plpgsql security definer set search_path = public as $$
declare
  v_profile public.profiles;
  v_is_first boolean;
begin
  if p_firebase_uid is null or btrim(p_firebase_uid) = '' then
    raise exception 'firebase_uid obrigatorio';
  end if;

  select * into v_profile from public.profiles where firebase_uid = p_firebase_uid;

  if found then
    -- Mantem nome/email/avatar em sincronia com o Firebase, sem tocar no papel
    update public.profiles
       set email      = coalesce(p_email, email),
           full_name  = case
                          when coalesce(btrim(p_full_name),'') <> '' then p_full_name
                          else full_name end,
           avatar_url = coalesce(p_avatar_url, avatar_url),
           updated_at = now()
     where id = v_profile.id
     returning * into v_profile;
    return v_profile;
  end if;

  select count(*) = 0 into v_is_first from public.profiles;

  insert into public.profiles (firebase_uid, email, full_name, avatar_url, role)
  values (p_firebase_uid, p_email,
          coalesce(nullif(btrim(p_full_name),''), split_part(coalesce(p_email,''),'@',1)),
          p_avatar_url,
          case when v_is_first then 'owner'::app_role else 'viewer'::app_role end)
  returning * into v_profile;

  return v_profile;
end $$;

-- Executavel pela aplicacao mesmo sem identidade estabelecida
grant execute on function public.ensure_profile(text,text,text,text) to app_user;

-- =====================================================================
-- Guarda contra escalonamento de privilegio: ninguem muda o proprio papel,
-- e o ultimo owner ativo nao pode ser rebaixado nem desativado.
-- =====================================================================
create or replace function public.guard_role_change() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_actor_role app_role := public.auth_role();
begin
  if new.role is distinct from old.role then
    if v_actor_role is distinct from 'owner' then
      raise exception 'Somente um owner pode alterar papeis';
    end if;
    if new.id = public.current_uid() then
      raise exception 'Voce nao pode alterar o proprio papel';
    end if;
  end if;

  if (old.role = 'owner' and new.role <> 'owner')
     or (old.role = 'owner' and old.active and not new.active) then
    if (select count(*) from public.profiles
         where role = 'owner' and active and id <> new.id) = 0 then
      raise exception 'O sistema precisa de pelo menos um owner ativo';
    end if;
  end if;

  return new;
end $$;

create trigger t_guard_role_change before update on public.profiles
  for each row execute function public.guard_role_change();
