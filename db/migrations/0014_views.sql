-- =====================================================================
-- 0014 — Views de agregacao
--
-- IMPORTANTE: security_invoker = true. Sem isso a view roda com os
-- privilegios do dono e ignora a RLS de quem consulta. Requer PG15+.
-- =====================================================================

-- Totais acumulados por oferta — cards do §49
create view public.v_offer_totals with (security_invoker = true) as
select
  o.id as offer_id, o.internal_code, o.name, o.status, o.health, o.ticket_price,
  m.spend, m.revenue, m.refunds, m.gateway_fees, m.additional_costs,
  m.sales, m.leads, m.clicks, m.impressions, x.allocated_expenses,
  (m.revenue / nullif(m.spend,0))                                as roas,
  (m.spend   / nullif(m.sales,0))                                as cpa,
  (m.spend   / nullif(m.leads,0))                                as cpl,
  (m.revenue / nullif(m.sales,0))                                as avg_ticket,
  (m.revenue - m.refunds - m.gateway_fees - m.spend
             - m.additional_costs - x.allocated_expenses)        as operational_profit,
  ((m.revenue - m.refunds - m.gateway_fees - m.spend
              - m.additional_costs - x.allocated_expenses)
   / nullif(m.spend + m.gateway_fees + m.additional_costs
            + x.allocated_expenses, 0))                          as roi
from public.offers o
cross join lateral (
  select coalesce(sum(spend),0) spend, coalesce(sum(revenue),0) revenue,
         coalesce(sum(refunds),0) refunds, coalesce(sum(gateway_fees),0) gateway_fees,
         coalesce(sum(additional_costs),0) additional_costs,
         coalesce(sum(sales),0) sales, coalesce(sum(leads),0) leads,
         coalesce(sum(clicks),0) clicks, coalesce(sum(impressions),0) impressions
  from public.daily_metrics d where d.offer_id = o.id) m
cross join lateral (
  select coalesce(sum(amount),0) allocated_expenses
  from public.expenses e
  where e.offer_id = o.id and e.counts_in_pnl and e.deleted_at is null) x
where o.deleted_at is null;

-- Serie diaria por oferta — graficos Receita x Gasto e ROAS (§49)
create view public.v_offer_daily with (security_invoker = true) as
select offer_id, date,
       sum(spend) spend, sum(revenue) revenue, sum(sales) sales, sum(leads) leads,
       sum(net_profit) net_profit,
       sum(revenue) / nullif(sum(spend),0) roas
from public.daily_metrics
group by offer_id, date;

-- Serie diaria da empresa — cards Hoje/Ontem (§5)
create view public.v_company_daily with (security_invoker = true) as
select d.date,
  sum(d.spend) spend, sum(d.revenue) revenue, sum(d.refunds) refunds,
  sum(d.gateway_fees) gateway_fees, sum(d.additional_costs) additional_costs,
  sum(d.sales) sales, sum(d.leads) leads, sum(d.clicks) clicks,
  sum(d.impressions) impressions,
  (select coalesce(sum(e.amount),0) from public.expenses e
    where e.date = d.date and e.counts_in_pnl and e.deleted_at is null) as other_costs,
  sum(d.revenue) / nullif(sum(d.spend),0)  as roas,
  sum(d.spend)   / nullif(sum(d.sales),0)  as cpa,
  sum(d.spend)   / nullif(sum(d.leads),0)  as cpl,
  sum(d.revenue) / nullif(sum(d.sales),0)  as avg_ticket,
  sum(d.revenue - d.refunds - d.gateway_fees - d.spend - d.additional_costs)
    - (select coalesce(sum(e.amount),0) from public.expenses e
        where e.date = d.date and e.counts_in_pnl and e.deleted_at is null)
                                           as operational_profit
from public.daily_metrics d
group by d.date;

-- Capacidade operacional de chips (§7)
create view public.v_chip_capacity with (security_invoker = true) as
select
  count(*)                                      as total,
  count(*) filter (where status = 'novo')         as novos,
  count(*) filter (where status = 'aquecendo')    as aquecendo,
  count(*) filter (where status = 'pronto')       as prontos,
  count(*) filter (where status = 'ativo')        as ativos,
  count(*) filter (where status = 'reserva')      as reserva,
  count(*) filter (where status = 'indisponivel') as indisponiveis,
  (select (value #>> '{}')::int from public.app_settings where key = 'chips_target') as meta
from public.chips
where deleted_at is null and status <> 'arquivado';

-- Caixa da operacao (§62). Aportes e distribuicoes sao capital, nao P&L.
create view public.v_cash_position with (security_invoker = true) as
with f as (
  select
    (select coalesce(sum(amount),0) from public.capital_contributions)  as aportes,
    (select coalesce(sum(amount),0) from public.profit_distributions)   as distribuicoes,
    (select coalesce(sum(revenue - refunds - gateway_fees),0)
       from public.daily_metrics)                                       as receita_liquida,
    (select coalesce(sum(spend + additional_costs),0)
       from public.daily_metrics)                                       as trafego,
    (select coalesce(sum(amount),0) from public.expenses
      where counts_in_pnl and deleted_at is null)                       as despesas,
    (select coalesce(sum(amount),0) from public.revenues
      where deleted_at is null)                                         as outras_receitas
)
select f.*,
  (aportes - distribuicoes + receita_liquida + outras_receitas - trafego - despesas) as caixa,
  (receita_liquida + outras_receitas - trafego - despesas)                           as lucro_acumulado
from f;

-- Performance acumulada por criativo — ranking (§49)
create view public.v_creative_totals with (security_invoker = true) as
select c.id as creative_id, c.creative_code, c.offer_id, c.title, c.status,
       c.format_id, c.angle_id, c.editor_user_id,
       coalesce(sum(m.spend),0)   as spend,
       coalesce(sum(m.revenue),0) as revenue,
       coalesce(sum(m.sales),0)   as sales,
       coalesce(sum(m.leads),0)   as leads,
       coalesce(sum(m.revenue),0) / nullif(sum(m.spend),0) as roas,
       coalesce(sum(m.spend),0)   / nullif(sum(m.sales),0) as cpa
from public.creatives c
left join public.creative_daily_metrics m on m.creative_id = c.id
where c.deleted_at is null
group by c.id;

-- Estimativa por socio (§38). Apenas estimativa: sem distribuicao automatica.
create view public.v_partner_estimate with (security_invoker = true) as
select p.id as partner_id, p.name, p.ownership_percentage,
  (select lucro_acumulado from public.v_cash_position)
    * p.ownership_percentage / 100 as lucro_estimado,
  coalesce((select sum(amount) from public.capital_contributions c
             where c.partner_id = p.id), 0) as aportado,
  coalesce((select sum(amount) from public.profit_distributions d
             where d.partner_id = p.id), 0) as retirado
from public.partners p
where p.active;
