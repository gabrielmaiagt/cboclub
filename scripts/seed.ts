/**
 * Seed de demonstracao (§52).
 *
 *   npm run seed          semeia o projeto apontado em .env.local
 *   npm run seed:emu      semeia os emuladores locais
 *
 * Idempotente: usa ids fixos, entao rodar de novo sobrescreve em vez de
 * duplicar. Cria tambem os usuarios de Auth quando esta no emulador,
 * para dar login imediato.
 */
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local" });
loadEnv({ path: ".env" });

// Flag de argv em vez de variavel de ambiente inline: `VAR=x cmd` nao
// funciona no cmd.exe do Windows, e npm scripts rodam por ali.
const USE_EMULATOR =
  process.argv.includes("--emulator") || process.env.SEED_TARGET === "emulator";

if (USE_EMULATOR) {
  process.env.FIRESTORE_EMULATOR_HOST ??= "127.0.0.1:8080";
  process.env.FIREBASE_AUTH_EMULATOR_HOST ??= "127.0.0.1:9099";
  process.env.FIREBASE_STORAGE_EMULATOR_HOST ??= "127.0.0.1:9199";
}

import { cert, initializeApp, type AppOptions } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

const projectId =
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "cboclub-f815c";

function appOptions(): AppOptions {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!USE_EMULATOR && raw && raw.trim()) {
    const parsed = JSON.parse(raw);
    return {
      credential: cert({
        projectId: parsed.project_id,
        clientEmail: parsed.client_email,
        privateKey: parsed.private_key.replace(/\\n/g, "\n"),
      }),
      projectId,
    };
  }
  return { projectId };
}

initializeApp(appOptions());
const db = getFirestore();
const auth = getAuth();
db.settings({ ignoreUndefinedProperties: true });

const now = FieldValue.serverTimestamp();

/** Data de negocio no fuso de Sao Paulo. */
function businessDate(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/** deletedAt SEMPRE explicito: query `where deletedAt == null` depende disso. */
function audit(uid: string) {
  return {
    createdAt: now,
    createdBy: uid,
    updatedAt: now,
    updatedBy: uid,
    deletedAt: null,
  };
}

const USERS = [
  {
    uid: "seed-gabriel",
    email: "gabrielmaiasantos0012@gmail.com",
    fullName: "Gabriel Maia",
    role: "owner",
    password: "cboclub123",
  },
  {
    uid: "seed-socio",
    email: "socio@cboclub.com",
    fullName: "Sócio",
    role: "admin",
    password: "cboclub123",
  },
  {
    uid: "seed-joao",
    email: "joao@cboclub.com",
    fullName: "João Editor",
    role: "criativo",
    password: "cboclub123",
  },
  {
    uid: "seed-maria",
    email: "maria@cboclub.com",
    fullName: "Maria Operação",
    role: "operacao",
    password: "cboclub123",
  },
] as const;

const OWNER = USERS[0].uid;

const OFFERS = [
  {
    id: "offer-bolsa-croche",
    code: "OFFER-0001",
    name: "Bolsa de Crochê de Luxo",
    niche: "moda feminina",
    subNiche: "acessórios",
    mainPromise: "Bolsa artesanal de luxo por menos de R$50",
    mechanism: "Produção artesanal exclusiva",
    targetAudience: "Mulheres 25-45, classe C/B, interesse em moda e artesanato",
    ticketPrice: 39.9,
    status: "testando",
    health: "saudavel",
    priority: "alta",
    responsibleId: "seed-gabriel",
    nextAction: "Editar 4 vídeos do ângulo luxo",
    nextActionDue: businessDate(0),
    launchDate: businessDate(-13),
    angles: [
      {
        id: "ang-luxo",
        name: "Luxo",
        description: "Bolsa de grife por preço acessível",
        hypothesis: "Status vende mais que economia neste público",
        status: "vencedor",
        result: "ROAS 2,8 contra 1,3 do ângulo renda extra",
      },
      {
        id: "ang-renda",
        name: "Renda extra",
        description: "Revenda e lucre com crochê",
        hypothesis: "Público quer complementar renda",
        status: "perdedor",
        result: "CPA 2x acima da média, muito lead desqualificado",
      },
      {
        id: "ang-preco",
        name: "Comparação de preço",
        description: "R$39,90 contra R$300 da loja",
        hypothesis: "Ancoragem de preço aumenta conversão",
        status: "testando",
        result: null,
      },
    ],
    pages: [
      {
        id: "pg-v1",
        name: "PV",
        version: "V1",
        url: "https://cboclub.com/bolsa-v1",
        status: "pausada",
        headline: "A bolsa de crochê que parece de grife",
      },
      {
        id: "pg-v2",
        name: "PV",
        version: "V2",
        url: "https://cboclub.com/bolsa-v2",
        status: "no_ar",
        headline: "R$300 na loja. R$39,90 aqui. Mesma bolsa.",
      },
    ],
    campaigns: [
      {
        id: "cmp-bolsa-abo",
        name: "BOLSA | ABO | Luxo",
        platform: "meta",
        account: "BM Principal",
        externalId: "23851234567890",
        status: "ativa",
        startDate: businessDate(-13),
        responsibleId: "seed-gabriel",
      },
    ],
    dailySpendBase: 140,
    ticketForMetrics: 39.9,
  },
  {
    id: "offer-organizador",
    code: "OFFER-0002",
    name: "Organizador de Geladeira",
    niche: "casa",
    subNiche: "organização",
    mainPromise: "Geladeira organizada em 10 minutos",
    mechanism: "Kit com 8 peças empilháveis",
    targetAudience: "Mulheres 30-55, donas de casa",
    ticketPrice: 59.9,
    status: "escalando",
    health: "saudavel",
    priority: "alta",
    responsibleId: "seed-socio",
    nextAction: "Subir budget para R$800/dia",
    nextActionDue: businessDate(1),
    launchDate: businessDate(-40),
    angles: [
      {
        id: "ang-antes-depois",
        name: "Antes e depois",
        description: "Transformação visível da geladeira",
        hypothesis: "Prova visual converte melhor que demonstração",
        status: "vencedor",
        result: "ROAS 3,1",
      },
    ],
    pages: [
      {
        id: "pg-quiz",
        name: "Quiz",
        version: "V1",
        url: "https://cboclub.com/geladeira-quiz",
        status: "no_ar",
        headline: "Descubra o kit ideal para a sua geladeira",
      },
    ],
    campaigns: [
      {
        id: "cmp-gel-cbo",
        name: "GELADEIRA | CBO | Escala",
        platform: "meta",
        account: "BM Principal",
        externalId: "23851234567891",
        status: "ativa",
        startDate: businessDate(-40),
        responsibleId: "seed-socio",
      },
    ],
    dailySpendBase: 520,
    ticketForMetrics: 59.9,
  },
  {
    id: "offer-caneca",
    code: "OFFER-0003",
    name: "Caneca Térmica Personalizada",
    niche: "presentes",
    subNiche: "utilidades",
    mainPromise: "Sua foto na caneca em 24h",
    mechanism: "Impressão sublimática",
    targetAudience: "Público geral 20-50",
    ticketPrice: 49.9,
    status: "morta",
    health: "critico",
    priority: "baixa",
    responsibleId: "seed-gabriel",
    nextAction: null,
    nextActionDue: null,
    launchDate: businessDate(-70),
    angles: [],
    pages: [],
    campaigns: [],
    dailySpendBase: 0,
    ticketForMetrics: 49.9,
  },
  {
    id: "offer-tapete",
    code: "OFFER-0004",
    name: "Tapete Antiderrapante Infantil",
    niche: "casa",
    subNiche: "infantil",
    mainPromise: "Chão seguro para o bebê engatinhar",
    mechanism: "EVA atóxico com encaixe",
    targetAudience: "Mães de 0-3 anos",
    ticketPrice: 89.9,
    status: "criativos",
    health: "saudavel",
    priority: "media",
    responsibleId: "seed-joao",
    nextAction: "Gravar 3 UGC com depoimento de mãe",
    nextActionDue: businessDate(2),
    launchDate: null,
    angles: [
      {
        id: "ang-seguranca",
        name: "Dor",
        description: "Medo de o bebê se machucar",
        hypothesis: "Medo converte mais que conforto neste nicho",
        status: "ideia",
        result: null,
      },
    ],
    pages: [],
    campaigns: [],
    dailySpendBase: 0,
    ticketForMetrics: 89.9,
  },
] as const;

async function seedUsers() {
  for (const u of USERS) {
    if (USE_EMULATOR) {
      await auth
        .createUser({
          uid: u.uid,
          email: u.email,
          password: u.password,
          displayName: u.fullName,
        })
        .catch(async (err: { code?: string }) => {
          if (err.code === "auth/uid-already-exists") {
            await auth.updateUser(u.uid, {
              email: u.email,
              password: u.password,
              displayName: u.fullName,
            });
          } else {
            throw err;
          }
        });
    }

    await auth.setCustomUserClaims(u.uid, { role: u.role }).catch(() => {
      console.warn(`  ! não foi possível setar claim de ${u.email}`);
    });

    await db.collection("users").doc(u.uid).set(
      {
        email: u.email,
        fullName: u.fullName,
        avatarUrl: null,
        role: u.role,
        active: true,
        claimsUpdatedAt: now,
        createdAt: now,
        updatedAt: now,
      },
      { merge: true }
    );
  }
  console.log(`  ✓ ${USERS.length} usuários`);
}

async function seedSettings() {
  await db.collection("settings").doc("app").set({
    copyWordsPerMinute: 150,
    chipsTarget: 50,
    currency: "BRL",
    defaultCountry: "BR",
    updatedAt: now,
    updatedBy: OWNER,
  });

  await db
    .collection("settings")
    .doc("taxonomy")
    .set({
      creativeFormats: [
        "UGC", "Story", "Selfie", "Narração", "Estático", "Carrossel",
        "Depoimento", "Demonstração", "Antes/Depois", "Comparação de preço",
        "Tela gravada", "POV", "Lista", "Notícias", "Podcast fake", "Reação",
      ].map((name, i) => ({
        slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        name,
        active: true,
        sortOrder: (i + 1) * 10,
      })),
      tags: [
        { slug: "preco", name: "preço", color: "amber" },
        { slug: "renda-extra", name: "renda extra", color: "emerald" },
        { slug: "dor", name: "dor", color: "rose" },
        { slug: "desejo", name: "desejo", color: "fuchsia" },
        { slug: "luxo", name: "luxo", color: "violet" },
        { slug: "curiosidade", name: "curiosidade", color: "sky" },
        { slug: "prova", name: "prova", color: "teal" },
        { slug: "urgencia", name: "urgência", color: "orange" },
        { slug: "polemica", name: "polêmica", color: "red" },
        { slug: "economia", name: "economia", color: "lime" },
        { slug: "comparacao", name: "comparação", color: "cyan" },
      ],
      angleLibrary: [
        { slug: "renda-extra", name: "Renda extra", description: "Ganhar dinheiro com o produto" },
        { slug: "luxo", name: "Luxo", description: "Status e exclusividade" },
        { slug: "economia", name: "Economia", description: "Gastar menos do que gastaria" },
        { slug: "facilidade", name: "Facilidade", description: "Simples de usar ou fazer" },
        { slug: "antes-depois", name: "Antes e depois", description: "Transformação visível" },
        { slug: "curiosidade", name: "Curiosidade", description: "Gatilho de descoberta" },
        { slug: "dor", name: "Dor", description: "Alívio de um problema" },
        { slug: "desejo", name: "Desejo", description: "Vontade de possuir" },
        { slug: "prova-social", name: "Prova social", description: "Outras pessoas já compraram" },
      ],
      updatedAt: now,
      updatedBy: OWNER,
    });

  console.log("  ✓ settings/app e settings/taxonomy");
}

async function seedCounters() {
  await db.collection("counters").doc("offers").set({ seq: OFFERS.length });
  for (const key of ["creatives", "scripts", "experiments", "chips", "mining"]) {
    await db.collection("counters").doc(key).set({ seq: 0 }, { merge: true });
  }
  console.log(`  ✓ counters (offers em ${OFFERS.length})`);
}

async function seedOffers() {
  const batch = db.batch();
  for (const o of OFFERS) {
    const { dailySpendBase, ticketForMetrics, ...offer } = o;
    void dailySpendBase;
    void ticketForMetrics;
    batch.set(db.collection("offers").doc(o.id), {
      ...offer,
      country: "BR",
      language: "pt-BR",
      miningItemId: null,
      validationDate: null,
      scalingDate: o.status === "escalando" ? businessDate(-20) : null,
      notes: null,
      ...audit(OWNER),
    });
  }
  await batch.commit();
  console.log(`  ✓ ${OFFERS.length} ofertas`);
}

/** 14 dias de metricas. Somente dados-base: nada de ROAS persistido. */
async function seedDailyMetrics() {
  let count = 0;
  let batch = db.batch();

  for (const offer of OFFERS) {
    if (!offer.dailySpendBase) continue;

    for (let i = 13; i >= 0; i--) {
      const date = businessDate(-i);
      const variance = 0.75 + Math.random() * 0.6;
      const spend = Math.round(offer.dailySpendBase * variance * 100) / 100;
      const sales = Math.max(0, Math.round(spend / (offer.ticketForMetrics * 0.38)));
      const revenue = Math.round(sales * offer.ticketForMetrics * 100) / 100;

      batch.set(db.collection("dailyMetrics").doc(`${date}_${offer.id}`), {
        date,
        offerId: offer.id,
        spend,
        impressions: Math.round(spend * 88),
        clicks: Math.round(spend * 2.05),
        leads: Math.round(spend / 3.4),
        sales,
        revenue,
        refunds: 0,
        gatewayFees: Math.round(revenue * 0.0699 * 100) / 100,
        additionalCosts: 0,
        notes: null,
        createdAt: now,
        createdBy: OWNER,
        updatedAt: now,
        updatedBy: OWNER,
      });
      count++;

      if (count % 400 === 0) {
        await batch.commit();
        batch = db.batch();
      }
    }
  }

  await batch.commit();
  console.log(`  ✓ ${count} registros de dailyMetrics`);
}

async function seedDecisions() {
  const decisions = [
    {
      id: "dec-1",
      offerId: "offer-bolsa-croche",
      title: "Criativo CR-0001 está 3x acima da média",
      description: "ROAS de 3,4 contra média de 1,1. Criar variações antes que sature.",
      type: "escala",
      priority: "alta",
      status: "aberta",
      responsibleId: "seed-gabriel",
    },
    {
      id: "dec-2",
      offerId: "offer-bolsa-croche",
      title: "CPA subiu 30% nos últimos 3 dias",
      description: "Testar novo hook no ângulo luxo.",
      type: "otimizacao",
      priority: "alta",
      status: "aberta",
      responsibleId: "seed-gabriel",
    },
    {
      id: "dec-3",
      offerId: "offer-caneca",
      title: "Caneca gastou R$300 sem venda",
      description: "Revisar oferta ou matar de vez.",
      type: "corte",
      priority: "media",
      status: "resolvida",
      responsibleId: "seed-socio",
    },
  ];

  const batch = db.batch();
  for (const d of decisions) {
    batch.set(db.collection("decisions").doc(d.id), {
      ...d,
      resolution: d.status === "resolvida" ? "Oferta encerrada." : null,
      resolvedAt: d.status === "resolvida" ? now : null,
      createdAt: now,
      createdBy: OWNER,
      updatedAt: now,
      updatedBy: OWNER,
    });
  }
  await batch.commit();
  console.log(`  ✓ ${decisions.length} decisões`);
}

/** Timeline inicial. Em producao estas entradas nascem das server actions. */
async function seedActivity() {
  const batch = db.batch();
  for (const offer of OFFERS) {
    batch.set(db.collection("activity").doc(), {
      actorId: OWNER,
      actorName: "Gabriel Maia",
      entityType: "offer",
      entityId: offer.id,
      entityCode: offer.code,
      offerId: offer.id,
      action: "created",
      field: null,
      oldValue: null,
      newValue: null,
      description: `Gabriel Maia criou a oferta ${offer.code} — ${offer.name}`,
      createdAt: now,
    });
  }
  await batch.commit();
  console.log(`  ✓ ${OFFERS.length} entradas de activity`);
}

async function main() {
  console.log(
    `\nSemeando ${USE_EMULATOR ? "EMULADORES locais" : `projeto ${projectId}`}\n`
  );
  await seedUsers();
  await seedSettings();
  await seedCounters();
  await seedOffers();
  await seedDailyMetrics();
  await seedDecisions();
  await seedActivity();
  console.log("\nPronto.\n");
  if (USE_EMULATOR) {
    console.log("Login: gabrielmaiasantos0012@gmail.com / cboclub123 (owner)\n");
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("\nFalhou:", err instanceof Error ? err.message : err);
    process.exit(1);
  });
