-- =====================================================================
-- 0012 — Decisoes, tarefas, SOPs e ferramentas
--
-- decisions x tasks: decisao e a ESCOLHA a tomar; tarefa e a EXECUCAO.
-- tasks.decision_id liga as duas.
-- =====================================================================

create table public.decisions (
  id          uuid primary key default gen_random_uuid(),
  offer_id    uuid references public.offers(id) on delete cascade,
  title       text not null,
  description text,
  type        decision_type   not null default 'operacional',
  priority    priority_level  not null default 'media',
  status      decision_status not null default 'aberta',
  responsible_user_id uuid references public.profiles(id),
  resolution  text,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id)
);
create index on public.decisions (status, priority);
create index on public.decisions (offer_id);

create or replace function public.stamp_decision_resolution() returns trigger
language plpgsql as $$
begin
  if new.status in ('resolvida','descartada')
     and coalesce(old.status,'aberta') not in ('resolvida','descartada') then
    new.resolved_at := now();
  elsif new.status not in ('resolvida','descartada') then
    new.resolved_at := null;
  end if;
  return new;
end $$;
create trigger t_decision_resolved before insert or update on public.decisions
  for each row execute function public.stamp_decision_resolution();
create trigger t_decision_audit before insert or update on public.decisions
  for each row execute function public.set_audit_fields();

create table public.tasks (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  description text,
  offer_id    uuid references public.offers(id) on delete cascade,
  creative_id uuid references public.creatives(id) on delete cascade,
  decision_id uuid references public.decisions(id) on delete set null,
  responsible_user_id uuid references public.profiles(id),
  status      task_status    not null default 'backlog',
  priority    priority_level not null default 'media',
  deadline    date,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id),
  deleted_at timestamptz
);
create index on public.tasks (responsible_user_id, status) where deleted_at is null;
create index on public.tasks (offer_id) where deleted_at is null;
create index on public.tasks (deadline)
  where deleted_at is null and status <> 'concluido';

create or replace function public.stamp_task_completion() returns trigger
language plpgsql as $$
begin
  if new.status = 'concluido' and coalesce(old.status,'backlog') <> 'concluido' then
    new.completed_at := now();
  elsif new.status <> 'concluido' then
    new.completed_at := null;
  end if;
  return new;
end $$;
create trigger t_task_complete before insert or update on public.tasks
  for each row execute function public.stamp_task_completion();
create trigger t_task_audit before insert or update on public.tasks
  for each row execute function public.set_audit_fields();

create table public.sops (
  id       uuid primary key default gen_random_uuid(),
  title    text not null,
  category sop_category not null default 'geral',
  content  text not null default '',                 -- markdown
  active   boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id)
);
create index on public.sops (category) where active;
create trigger t_sop_audit before insert or update on public.sops
  for each row execute function public.set_audit_fields();

-- Ferramentas: NUNCA armazenar senha (§39, §54)
create table public.tools (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  category      tool_category not null default 'outros',
  url           text,
  monthly_cost  numeric(12,2) not null default 0 check (monthly_cost >= 0),
  billing_cycle text not null default 'mensal'
    check (billing_cycle in ('mensal','anual','avulso')),
  renewal_date  date,
  responsible_user_id uuid references public.profiles(id),
  notes         text,
  active        boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id)
);
create index on public.tools (category) where active;
create index on public.tools (renewal_date) where active and renewal_date is not null;
create trigger t_tool_audit before insert or update on public.tools
  for each row execute function public.set_audit_fields();
