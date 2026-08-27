-- =====================================================================
-- 0001 — Extensões, schema app e enums
-- =====================================================================
create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

create schema if not exists app;

-- ── Papéis e transversais ───────────────────────────────────────────
create type app_role       as enum ('owner','admin','trafego','criativo','operacao','viewer');
create type priority_level as enum ('baixa','media','alta','urgente');

-- ── Ofertas ─────────────────────────────────────────────────────────
create type offer_status as enum (
  'minerada','pre_analise','aprovada','modelagem','copy','criativos','pagina',
  'configuracao','pronta','testando','validada','escalando','pausada','morta');
create type offer_health as enum ('saudavel','atencao','critico');

-- ── Ângulos / Criativos / Copy ──────────────────────────────────────
create type angle_status as enum ('ideia','testando','vencedor','neutro','perdedor');
create type creative_status as enum (
  'ideia','modelar','copy','aguardando_edicao','editando','revisao','aprovado',
  'pronto_para_teste','testando','vencedor','perdedor','arquivado');
create type script_status as enum ('rascunho','revisao','aprovado','em_uso','arquivado');

-- ── Testes ──────────────────────────────────────────────────────────
create type experiment_status   as enum ('planejado','rodando','pausado','concluido','cancelado');
create type experiment_result   as enum ('vencedor','perdedor','neutro','inconclusivo');
create type experiment_variable as enum (
  'oferta','promessa','preco','pagina','headline','angulo','hook','copy',
  'criativo','cta','publico','campanha','upsell');

-- ── Chips ───────────────────────────────────────────────────────────
create type chip_status as enum ('novo','aquecendo','pronto','ativo','reserva','indisponivel','arquivado');
create type chip_event_type as enum (
  'compra','aquecimento_iniciado','pronto','vinculado_oferta','desvinculado_oferta',
  'reserva','banido','indisponivel','arquivado','nota');

-- ── Mineração ───────────────────────────────────────────────────────
create type mining_status as enum (
  'encontrada','analisar','interessante','aprovada','modelar','descartada','convertida');

-- ── Tráfego / Páginas ───────────────────────────────────────────────
create type traffic_platform    as enum ('meta','google','tiktok','kwai','outro');
create type campaign_status     as enum ('rascunho','ativa','pausada','encerrada');
create type landing_page_status as enum ('rascunho','no_ar','pausada','arquivada');

-- ── Financeiro ──────────────────────────────────────────────────────
create type expense_category as enum (
  'meta_ads','funcionarios','freelancer','chips','ferramentas','dominios',
  'hospedagem','gateway','criativos','infraestrutura','outros');
create type revenue_source as enum (
  'venda_oferta','afiliado','consultoria','reembolso_recebido','outro');

-- ── Gestão ──────────────────────────────────────────────────────────
create type task_status     as enum ('backlog','fazer','fazendo','revisao','concluido');
create type decision_type   as enum ('otimizacao','escala','corte','teste','financeiro','operacional','outro');
create type decision_status as enum ('aberta','em_andamento','resolvida','descartada');
create type sop_category    as enum (
  'mineracao','copy','criativos','pagina','chips','trafego','teste','escala','financeiro','geral');
create type tool_category   as enum (
  'ia','edicao','transcricao','trafego','tracking','hospedagem','dominio',
  'whatsapp','checkout','spy','produtividade','outros');
