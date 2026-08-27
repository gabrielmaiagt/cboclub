-- =====================================================================
-- SEED — dados de demonstracao (§52)
--
-- Roda como dono do schema, portanto nao passa por RLS.
-- Idempotente: limpa e recria. NAO rodar em producao com dados reais.
-- =====================================================================

begin;

truncate table
  activity_logs, creative_tags, experiment_creatives, creative_daily_metrics,
  daily_metrics, chip_events, chip_secrets, chips, experiments, creatives,
  script_versions, scripts, angles, landing_pages, campaigns, tasks, decisions,
  profit_distributions, capital_contributions, revenues, expenses, partners,
  mining_items, offers, tools, sops, tags, creative_formats, profiles
restart identity cascade;

-- As sequences de codigo sao independentes de coluna, entao `restart
-- identity` nao as alcanca. Sem isto, reseed geraria OFFER-0004 em diante.
alter sequence offer_code_seq      restart with 1;
alter sequence mining_code_seq     restart with 1;
alter sequence creative_code_seq   restart with 1;
alter sequence script_code_seq     restart with 1;
alter sequence experiment_code_seq restart with 1;
alter sequence chip_code_seq       restart with 1;

-- ── USUARIOS ────────────────────────────────────────────────────────
-- firebase_uid: substituir pelos UIDs reais apos o primeiro login.
insert into profiles (id, firebase_uid, full_name, email, role) values
 ('11111111-1111-1111-1111-111111111111','seed-gabriel','Gabriel Maia','gabrielmaiasantos0012@gmail.com','owner'),
 ('22222222-2222-2222-2222-222222222222','seed-socio','Socio','socio@cboclub.com','admin'),
 ('33333333-3333-3333-3333-333333333333','seed-joao','Joao Editor','joao@cboclub.com','criativo'),
 ('44444444-4444-4444-4444-444444444444','seed-maria','Maria Operacao','maria@cboclub.com','operacao');

-- A partir daqui os triggers de auditoria atribuem created_by ao Gabriel
set app.firebase_uid = 'seed-gabriel';

insert into partners (id, name, ownership_percentage, user_id) values
 ('aaaaaaaa-0000-0000-0000-000000000001','Gabriel Maia',50,'11111111-1111-1111-1111-111111111111'),
 ('aaaaaaaa-0000-0000-0000-000000000002','Socio',50,'22222222-2222-2222-2222-222222222222');

-- ── FORMATOS E TAGS ─────────────────────────────────────────────────
insert into creative_formats (name, slug, sort_order) values
 ('UGC','ugc',10),('Story','story',20),('Selfie','selfie',30),('Narracao','narracao',40),
 ('Estatico','estatico',50),('Carrossel','carrossel',60),('Depoimento','depoimento',70),
 ('Demonstracao','demonstracao',80),('Antes/Depois','antes-depois',90),
 ('Comparacao de preco','comparacao-preco',100),('Tela gravada','tela-gravada',110),
 ('POV','pov',120),('Lista','lista',130),('Noticias','noticias',140),
 ('Podcast fake','podcast-fake',150),('Reacao','reacao',160);

insert into tags (name, slug, color) values
 ('preco','preco','amber'),('renda extra','renda-extra','emerald'),('dor','dor','rose'),
 ('desejo','desejo','fuchsia'),('luxo','luxo','violet'),('curiosidade','curiosidade','sky'),
 ('prova','prova','teal'),('urgencia','urgencia','orange'),('polemica','polemica','red'),
 ('economia','economia','lime'),('comparacao','comparacao','cyan');

-- ── BIBLIOTECA DE ANGULOS (offer_id NULL = reusavel) ────────────────
insert into angles (name, description) values
 ('Renda extra','Ganhar dinheiro com o produto'),
 ('Luxo','Status e exclusividade'),
 ('Economia','Gastar menos do que gastaria'),
 ('Facilidade','Simples de usar/fazer'),
 ('Antes e depois','Transformacao visivel'),
 ('Curiosidade','Gatilho de descoberta'),
 ('Dor','Alivio de um problema'),
 ('Desejo','Vontade de possuir'),
 ('Prova social','Outras pessoas ja compraram');

-- ── SOPs ────────────────────────────────────────────────────────────
insert into sops (title, category, content) values
 ('Como minerar ofertas na Biblioteca de Anuncios','mineracao',
  E'1. Filtrar por pais e periodo\n2. Buscar anuncios rodando ha mais de 30 dias\n3. Registrar em Mineracao com print da pagina\n4. Pontuar os 7 criterios\n5. Score >= 3.5 vai para Analisar'),
 ('Estrutura de copy que converte no X1','copy',
  E'Hook (3s) -> Agitacao da dor -> Mecanismo -> Prova -> Oferta -> CTA para o WhatsApp'),
 ('Checklist de aprovacao de criativo','criativos',
  E'- Hook nos primeiros 3 segundos\n- Legenda queimada\n- Sem marca dagua\n- 9:16, 1080x1920\n- Audio normalizado\n- CTA claro no final'),
 ('Aquecimento de chip','chips',
  E'Dia 1-3: conversas manuais\nDia 4-7: grupos e status\nDia 8-14: volume gradual\nSo marcar Pronto apos 14 dias sem restricao');

-- ── FERRAMENTAS ─────────────────────────────────────────────────────
insert into tools (name, category, url, monthly_cost, billing_cycle, renewal_date) values
 ('CapCut Pro','edicao','https://capcut.com',49.90,'mensal',current_date + 12),
 ('ElevenLabs','ia','https://elevenlabs.io',119.00,'mensal',current_date + 5),
 ('Adminer/Spy','spy',null,197.00,'mensal',current_date + 20),
 ('Cloudflare','hospedagem','https://cloudflare.com',0,'mensal',null),
 ('Registro.br','dominio','https://registro.br',40.00,'anual',current_date + 200),
 ('Utmify','tracking','https://utmify.com.br',79.00,'mensal',current_date + 8);

-- ── MINERACAO ───────────────────────────────────────────────────────
insert into mining_items
 (id, name, niche, source, advertiser, promise, mechanism, price, priority, status,
  why_interesting, hypothesis, responsible_user_id,
  score_promise, score_scale_evidence, score_production, score_delivery,
  score_margin, score_creative, score_adaptation)
values
 ('bbbbbbbb-0000-0000-0000-000000000001','Bolsa de Croche Artesanal','moda feminina',
  'Biblioteca Meta','Ateliê Lala','Bolsa artesanal exclusiva por menos de R$50',
  'Producao artesanal em pequena escala',39.90,'alta','convertida',
  'Anuncio rodando ha 62 dias com 40+ criativos ativos',
  'O angulo de luxo acessivel deve superar renda extra',
  '11111111-1111-1111-1111-111111111111',5,5,4,3,4,5,4),
 ('bbbbbbbb-0000-0000-0000-000000000002','Kit Organizador de Geladeira','casa',
  'TikTok Ads','Casa&Cia','Geladeira organizada em 10 minutos',
  'Kit com 8 pecas empilhaveis',59.90,'media','interessante',
  'Criativo de antes/depois com muito engajamento',
  'Antes-depois deve performar melhor que demonstracao',
  '22222222-2222-2222-2222-222222222222',4,4,5,4,3,5,4),
 ('bbbbbbbb-0000-0000-0000-000000000003','Curso de Unhas em Gel','beleza',
  'Biblioteca Meta','Studio Nails','Aprenda a fazer unha em gel e cobre R$80 por cliente',
  'Curso gravado + suporte no grupo',97.00,'baixa','descartada',
  'Muita concorrencia e CPA alto no nicho',
  null,'11111111-1111-1111-1111-111111111111',3,4,2,5,5,3,2);

-- ── OFERTAS ─────────────────────────────────────────────────────────
insert into offers
 (id, name, niche, sub_niche, main_promise, mechanism, target_audience, ticket_price,
  status, health, priority, responsible_user_id, mining_item_id,
  next_action, next_action_due, launch_date)
values
 ('cccccccc-0000-0000-0000-000000000001','Bolsa de Croche de Luxo','moda feminina','acessorios',
  'Bolsa artesanal de luxo por menos de R$50','Producao artesanal exclusiva',
  'Mulheres 25-45, classe C/B, interesse em moda e artesanato',39.90,
  'testando','saudavel','alta','11111111-1111-1111-1111-111111111111',
  'bbbbbbbb-0000-0000-0000-000000000001',
  'Editar 4 videos do angulo luxo', current_date, current_date - 13),
 ('cccccccc-0000-0000-0000-000000000002','Organizador de Geladeira','casa','organizacao',
  'Geladeira organizada em 10 minutos','Kit com 8 pecas empilhaveis',
  'Mulheres 30-55, donas de casa',59.90,
  'escalando','saudavel','alta','22222222-2222-2222-2222-222222222222', null,
  'Subir budget para R$800/dia', current_date + 1, current_date - 40),
 ('cccccccc-0000-0000-0000-000000000003','Caneca Termica Personalizada','presentes','utilidades',
  'Sua foto na caneca em 24h','Impressao sublimatica',
  'Publico geral 20-50',49.90,
  'morta','critico','baixa','11111111-1111-1111-1111-111111111111', null,
  null, null, current_date - 70);

update mining_items set converted_offer_id = 'cccccccc-0000-0000-0000-000000000001'
 where id = 'bbbbbbbb-0000-0000-0000-000000000001';

-- ── ANGULOS DA OFERTA ───────────────────────────────────────────────
insert into angles (id, offer_id, name, description, hypothesis, status, result) values
 ('dddddddd-0000-0000-0000-000000000001','cccccccc-0000-0000-0000-000000000001','Luxo',
  'Bolsa de grife por preco acessivel','Status vende mais que economia neste publico',
  'vencedor','ROAS 2.8 contra 1.3 do angulo renda extra'),
 ('dddddddd-0000-0000-0000-000000000002','cccccccc-0000-0000-0000-000000000001','Renda extra',
  'Revenda e lucre com croche','Publico quer complementar renda','perdedor',
  'CPA 2x acima da media, muito lead desqualificado'),
 ('dddddddd-0000-0000-0000-000000000003','cccccccc-0000-0000-0000-000000000001','Comparacao de preco',
  'R$39,90 contra R$300 da loja','Ancoragem de preco aumenta conversao','testando',null);

-- ── COPY ────────────────────────────────────────────────────────────
insert into scripts (id, offer_id, angle_id, title, status, responsible_user_id) values
 ('eeeeeeee-0000-0000-0000-000000000001','cccccccc-0000-0000-0000-000000000001',
  'dddddddd-0000-0000-0000-000000000001','Copy principal - angulo luxo','em_uso',
  '33333333-3333-3333-3333-333333333333'),
 ('eeeeeeee-0000-0000-0000-000000000002','cccccccc-0000-0000-0000-000000000001',
  'dddddddd-0000-0000-0000-000000000003','Copy comparacao de preco','revisao',
  '33333333-3333-3333-3333-333333333333');

insert into script_versions (script_id, version, hook, body, cta, change_note) values
 ('eeeeeeee-0000-0000-0000-000000000001',1,
  'Voce sabia que essa bolsa custa 300 reais nas lojas de grife?',
  'Eu descobri um atelie que faz a mesma bolsa artesanal, no croche, peca por peca. A diferenca e que voce nao paga pela etiqueta. Sao mulheres brasileiras produzindo em casa, com o mesmo acabamento das marcas que voce ve na vitrine. Cada bolsa leva em media doze horas para ficar pronta. Nao existe producao em massa aqui, e por isso que cada peca e unica.',
  'Chama no WhatsApp e escolhe a sua cor antes que acabe o lote da semana.','Versao inicial'),
 ('eeeeeeee-0000-0000-0000-000000000001',2,
  'Essa bolsa custa 300 reais na loja. Aqui sai por 39,90 e eu vou te explicar o porque.',
  'O segredo e que voce compra direto de quem produz. Sao mulheres brasileiras que fazem cada peca a mao, no croche, em casa. Doze horas de trabalho por bolsa. Voce nao paga vitrine, nao paga shopping, nao paga etiqueta. So paga o trabalho. E o acabamento e o mesmo que voce ve nas marcas caras, porque a tecnica e a mesma. A diferenca esta na conta, nao na bolsa.',
  'Chama no WhatsApp agora e garante a sua cor. O lote dessa semana tem 40 pecas.',
  'Hook mais direto, ancoragem de preco na primeira linha'),
 ('eeeeeeee-0000-0000-0000-000000000002',1,
  'R$300 contra R$39,90. Mesma bolsa.',
  'Coloquei as duas lado a lado e pedi para tres amigas adivinharem qual era a cara. Nenhuma acertou. O croche e o mesmo ponto, o fio e o mesmo algodao egipcio, o forro e o mesmo. A unica diferenca visivel e a etiqueta costurada por dentro.',
  'Quer ver as duas de perto? Chama no WhatsApp que eu mando o video comparativo.','Versao inicial');

-- ── CRIATIVOS ───────────────────────────────────────────────────────
insert into creatives
 (id, offer_id, angle_id, script_id, title, hook, format_id, duration_seconds,
  editor_user_id, responsible_user_id, status)
select v.id, v.offer_id, v.angle_id, v.script_id, v.title, v.hook,
       (select id from creative_formats where slug = v.fmt), v.dur,
       '33333333-3333-3333-3333-333333333333','11111111-1111-1111-1111-111111111111', v.st
from (values
 ('ffffffff-0000-0000-0000-000000000001'::uuid,'cccccccc-0000-0000-0000-000000000001'::uuid,
  'dddddddd-0000-0000-0000-000000000001'::uuid,'eeeeeeee-0000-0000-0000-000000000001'::uuid,
  'UGC luxo - depoimento na rua','Essa bolsa custa 300 na loja','ugc',42,'vencedor'::creative_status),
 ('ffffffff-0000-0000-0000-000000000002','cccccccc-0000-0000-0000-000000000001',
  'dddddddd-0000-0000-0000-000000000002','eeeeeeee-0000-0000-0000-000000000001',
  'Narracao renda extra','Ganhe dinheiro revendendo croche','narracao',38,'perdedor'),
 ('ffffffff-0000-0000-0000-000000000003','cccccccc-0000-0000-0000-000000000001',
  'dddddddd-0000-0000-0000-000000000003','eeeeeeee-0000-0000-0000-000000000002',
  'Story comparacao de preco','R$300 contra R$39,90','story',28,'testando'),
 ('ffffffff-0000-0000-0000-000000000004','cccccccc-0000-0000-0000-000000000001',
  'dddddddd-0000-0000-0000-000000000001','eeeeeeee-0000-0000-0000-000000000001',
  'Selfie - unboxing da bolsa','Chegou e eu nao acreditei','selfie',35,'aguardando_edicao'),
 ('ffffffff-0000-0000-0000-000000000005','cccccccc-0000-0000-0000-000000000001',
  'dddddddd-0000-0000-0000-000000000001',null,
  'Antes e depois - look completo','Montei tres looks com uma bolsa so','antes-depois',45,'editando'),
 ('ffffffff-0000-0000-0000-000000000006','cccccccc-0000-0000-0000-000000000001',
  'dddddddd-0000-0000-0000-000000000003',null,
  'Comparacao lado a lado','Coloquei as duas na mesa','comparacao-preco',31,'revisao'),
 ('ffffffff-0000-0000-0000-000000000007','cccccccc-0000-0000-0000-000000000002',
  null,null,'Antes e depois geladeira','Minha geladeira era um caos','antes-depois',33,'vencedor'),
 ('ffffffff-0000-0000-0000-000000000008','cccccccc-0000-0000-0000-000000000002',
  null,null,'Demonstracao do kit','Olha como encaixa','demonstracao',40,'testando')
) as v(id, offer_id, angle_id, script_id, title, hook, fmt, dur, st);

insert into creative_tags (creative_id, tag_id)
select c.id, t.id from creatives c, tags t
where (c.id = 'ffffffff-0000-0000-0000-000000000001' and t.slug in ('luxo','preco','desejo'))
   or (c.id = 'ffffffff-0000-0000-0000-000000000002' and t.slug in ('renda-extra'))
   or (c.id = 'ffffffff-0000-0000-0000-000000000003' and t.slug in ('preco','comparacao','economia'))
   or (c.id = 'ffffffff-0000-0000-0000-000000000007' and t.slug in ('dor','prova'));

-- ── PAGINAS E CAMPANHAS ─────────────────────────────────────────────
insert into landing_pages (offer_id, name, version, url, status, headline) values
 ('cccccccc-0000-0000-0000-000000000001','PV','V1','https://cboclub.com/bolsa-v1','pausada',
  'A bolsa de croche que parece de grife'),
 ('cccccccc-0000-0000-0000-000000000001','PV','V2','https://cboclub.com/bolsa-v2','no_ar',
  'R$300 na loja. R$39,90 aqui. Mesma bolsa.'),
 ('cccccccc-0000-0000-0000-000000000002','Quiz','V1','https://cboclub.com/geladeira-quiz','no_ar',
  'Descubra o kit ideal para a sua geladeira');

insert into campaigns (id, offer_id, name, platform, account, campaign_code, status, start_date,
                       responsible_user_id) values
 ('99999999-0000-0000-0000-000000000001','cccccccc-0000-0000-0000-000000000001',
  'BOLSA | ABO | Luxo','meta','BM Principal','23851234567890','ativa',current_date - 13,
  '11111111-1111-1111-1111-111111111111'),
 ('99999999-0000-0000-0000-000000000002','cccccccc-0000-0000-0000-000000000002',
  'GELADEIRA | CBO | Escala','meta','BM Principal','23851234567891','ativa',current_date - 40,
  '22222222-2222-2222-2222-222222222222');

-- ── METRICAS DIARIAS: 14 dias ───────────────────────────────────────
insert into daily_metrics
 (date, offer_id, campaign_id, spend, impressions, clicks, leads, sales, revenue, gateway_fees)
select
  d::date,
  'cccccccc-0000-0000-0000-000000000001',
  '99999999-0000-0000-0000-000000000001',
  s.spend,
  (s.spend * 90)::bigint,
  (s.spend * 2.1)::bigint,
  (s.spend / 3.2)::int,
  greatest(0, (s.spend / 14.5)::int),
  round(greatest(0, (s.spend / 14.5)::int) * 39.90, 2),
  round(round(greatest(0, (s.spend / 14.5)::int) * 39.90, 2) * 0.0699, 2)
from generate_series(current_date - 13, current_date, interval '1 day') d
cross join lateral (
  select round(120 + (extract(day from d)::int % 7) * 35 + random() * 60)::numeric(12,2) as spend
) s;

insert into daily_metrics
 (date, offer_id, campaign_id, spend, impressions, clicks, leads, sales, revenue, gateway_fees)
select
  d::date,
  'cccccccc-0000-0000-0000-000000000002',
  '99999999-0000-0000-0000-000000000002',
  s.spend,
  (s.spend * 78)::bigint,
  (s.spend * 1.9)::bigint,
  (s.spend / 4.1)::int,
  greatest(0, (s.spend / 19.0)::int),
  round(greatest(0, (s.spend / 19.0)::int) * 59.90, 2),
  round(round(greatest(0, (s.spend / 19.0)::int) * 59.90, 2) * 0.0699, 2)
from generate_series(current_date - 13, current_date, interval '1 day') d
cross join lateral (
  select round(480 + (extract(day from d)::int % 5) * 70 + random() * 120)::numeric(12,2) as spend
) s;

insert into creative_daily_metrics (creative_id, date, spend, impressions, clicks, leads, sales, revenue)
select c.id, d::date,
       round(40 + random() * 40)::numeric(12,2),
       (2800 + random() * 1800)::bigint,
       (70 + random() * 60)::bigint,
       (12 + random() * 12)::int,
       (2 + random() * 4)::int,
       round((2 + random() * 4)::int * 39.90, 2)
from creatives c
cross join generate_series(current_date - 6, current_date, interval '1 day') d
where c.id in ('ffffffff-0000-0000-0000-000000000001','ffffffff-0000-0000-0000-000000000003');

-- ── TESTES ──────────────────────────────────────────────────────────
insert into experiments
 (offer_id, name, hypothesis, variable_type, status, start_date, end_date,
  responsible_user_id, spend, revenue, leads, sales, result, conclusion, next_action)
values
 ('cccccccc-0000-0000-0000-000000000001','Luxo contra Renda extra',
  'O angulo de luxo converte melhor que renda extra neste publico','angulo','concluido',
  current_date - 12, current_date - 6,'11111111-1111-1111-1111-111111111111',
  980.00, 2712.00, 306, 68,'vencedor',
  'Angulo luxo performou 2,2x melhor que renda extra. CPA de R$14,41 contra R$31,80.',
  'Criar cinco novos criativos baseados no angulo luxo e pausar os de renda extra.'),
 ('cccccccc-0000-0000-0000-000000000001','PV V1 contra PV V2',
  'Ancorar o preco na headline aumenta a conversao da pagina','pagina','rodando',
  current_date - 3, null,'11111111-1111-1111-1111-111111111111',
  420.00, 918.00, 131, 23, null, null, null);

insert into experiment_creatives (experiment_id, creative_id)
select e.id, c.id from experiments e, creatives c
where e.name = 'Luxo contra Renda extra'
  and c.id in ('ffffffff-0000-0000-0000-000000000001','ffffffff-0000-0000-0000-000000000002');

-- ── CHIPS ───────────────────────────────────────────────────────────
insert into chips (id, operator, status, acquisition_date, warmup_start_date, ready_date,
                   activation_date, responsible_user_id, current_offer_id) values
 ('77777777-0000-0000-0000-000000000001','Vivo','ativo',current_date - 45, current_date - 44,
  current_date - 30, current_date - 13,'44444444-4444-4444-4444-444444444444',
  'cccccccc-0000-0000-0000-000000000001'),
 ('77777777-0000-0000-0000-000000000002','Claro','aquecendo',current_date - 6, current_date - 5,
  null, null,'44444444-4444-4444-4444-444444444444', null),
 ('77777777-0000-0000-0000-000000000003','TIM','pronto',current_date - 25, current_date - 24,
  current_date - 8, null,'44444444-4444-4444-4444-444444444444', null),
 ('77777777-0000-0000-0000-000000000004','Vivo','ativo',current_date - 60, current_date - 59,
  current_date - 45, current_date - 40,'44444444-4444-4444-4444-444444444444',
  'cccccccc-0000-0000-0000-000000000002'),
 ('77777777-0000-0000-0000-000000000005','Claro','reserva',current_date - 50, current_date - 49,
  current_date - 35, null,'44444444-4444-4444-4444-444444444444', null),
 ('77777777-0000-0000-0000-000000000006','TIM','indisponivel',current_date - 70, current_date - 69,
  current_date - 55, current_date - 50,'44444444-4444-4444-4444-444444444444', null);

insert into chip_secrets (chip_id, phone_number) values
 ('77777777-0000-0000-0000-000000000001','+55 11 98765-4321'),
 ('77777777-0000-0000-0000-000000000002','+55 11 98765-1122'),
 ('77777777-0000-0000-0000-000000000003','+55 11 98765-3344'),
 ('77777777-0000-0000-0000-000000000004','+55 21 99888-5566'),
 ('77777777-0000-0000-0000-000000000005','+55 21 99888-7788'),
 ('77777777-0000-0000-0000-000000000006','+55 31 97777-9900');

-- ── FINANCEIRO ──────────────────────────────────────────────────────
insert into capital_contributions (partner_id, date, amount, notes) values
 ('aaaaaaaa-0000-0000-0000-000000000001', current_date - 60, 5000.00,'Aporte inicial'),
 ('aaaaaaaa-0000-0000-0000-000000000002', current_date - 60, 5000.00,'Aporte inicial');

insert into expenses (date, category, description, amount, offer_id, recurring) values
 (current_date - 30,'ferramentas','CapCut Pro + ElevenLabs',168.90,null,true),
 (current_date - 30,'chips','6 chips + linhas',420.00,null,false),
 (current_date - 15,'freelancer','Edicao de 8 criativos',600.00,
  'cccccccc-0000-0000-0000-000000000001',false),
 (current_date - 10,'dominios','cboclub.com',40.00,null,false),
 (current_date - 5,'tracking','Utmify',79.00,null,true),
 (current_date - 2,'freelancer','Copywriter - 3 copies',450.00,
  'cccccccc-0000-0000-0000-000000000001',false);

-- ── TAREFAS E DECISOES ──────────────────────────────────────────────
insert into decisions (offer_id, title, description, type, priority, status, responsible_user_id) values
 ('cccccccc-0000-0000-0000-000000000001',
  'Criativo CR-0001 esta 3x acima da media','ROAS de 3,4 contra media de 1,1. Criar variacoes antes que sature.',
  'escala','alta','aberta','11111111-1111-1111-1111-111111111111'),
 ('cccccccc-0000-0000-0000-000000000001',
  'CPA subiu 30% nos ultimos 3 dias','Testar novo hook no angulo luxo.',
  'otimizacao','alta','aberta','11111111-1111-1111-1111-111111111111'),
 ('cccccccc-0000-0000-0000-000000000003',
  'Caneca gastou R$300 sem venda','Revisar oferta ou matar de vez.',
  'corte','media','resolvida','22222222-2222-2222-2222-222222222222'),
 (null,'Comprar mais 18 chips para bater a meta de 50','Temos 32. Meta e 50.',
  'operacional','media','aberta','44444444-4444-4444-4444-444444444444');

insert into tasks (title, offer_id, creative_id, responsible_user_id, status, priority, deadline) values
 ('Editar 4 videos do angulo luxo','cccccccc-0000-0000-0000-000000000001',
  'ffffffff-0000-0000-0000-000000000004','33333333-3333-3333-3333-333333333333','fazer','alta',current_date),
 ('Revisar CR-0006 antes de subir','cccccccc-0000-0000-0000-000000000001',
  'ffffffff-0000-0000-0000-000000000006','11111111-1111-1111-1111-111111111111','revisao','alta',current_date),
 ('Gravar 3 UGC novos','cccccccc-0000-0000-0000-000000000001',null,
  '33333333-3333-3333-3333-333333333333','fazendo','media',current_date + 2),
 ('Aquecer CHIP-002','cccccccc-0000-0000-0000-000000000001',null,
  '44444444-4444-4444-4444-444444444444','fazendo','media',current_date + 8),
 ('Subir budget da Geladeira para R$800','cccccccc-0000-0000-0000-000000000002',null,
  '22222222-2222-2222-2222-222222222222','fazer','alta',current_date + 1),
 ('Escrever copy V3 com prova social','cccccccc-0000-0000-0000-000000000001',null,
  '33333333-3333-3333-3333-333333333333','backlog','baixa',current_date + 5);

reset app.firebase_uid;
commit;
