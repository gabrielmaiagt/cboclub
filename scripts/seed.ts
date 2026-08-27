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
  process.env.FIRESTORE_EMULATOR_HOST ??= "127.0.0.1:8480";
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
  {
    id: "offer-decalque",
    code: "OFFER-0005",
    name: "Kit Decalque de Parede",
    niche: "decoração",
    subNiche: "adesivos",
    mainPromise: "Transforme a parede em 15 minutos, sem tinta",
    mechanism: "Adesivo removível 3D",
    targetAudience: "Mulheres 22-40, primeiro apartamento",
    ticketPrice: 34.9,
    status: "pagina",
    health: "atencao",
    priority: "media",
    responsibleId: "seed-gabriel",
    nextAction: "Finalizar headline da página",
    nextActionDue: businessDate(1),
    launchDate: null,
    angles: [
      {
        id: "ang-decalque-facil",
        name: "Facilidade",
        description: "Decore sem sujeira e sem furar a parede",
        hypothesis: "Medo de errar trava a compra; facilidade destrava",
        status: "ideia",
        result: null,
      },
    ],
    pages: [
      {
        id: "pg-decalque-v1",
        name: "PV",
        version: "V1",
        url: null,
        status: "rascunho",
        headline: null,
      },
    ],
    campaigns: [],
    dailySpendBase: 0,
    ticketForMetrics: 34.9,
  },
  {
    id: "offer-pulseira",
    code: "OFFER-0006",
    name: "Pulseira Magnética Terapêutica",
    niche: "saúde",
    subNiche: "bem-estar",
    mainPromise: "Alívio de dores nas articulações sem remédio",
    mechanism: "Ímã terapêutico no pulso",
    targetAudience: "Adultos 45+",
    ticketPrice: 59.9,
    status: "pausada",
    health: "critico",
    priority: "baixa",
    responsibleId: "seed-socio",
    nextAction: "Revisar oferta antes de retomar",
    nextActionDue: null,
    launchDate: businessDate(-20),
    angles: [],
    pages: [],
    campaigns: [],
    dailySpendBase: 0,
    ticketForMetrics: 59.9,
  },
] as const;

/**
 * Wipe completo do Firestore do emulador antes de semear: sem isto,
 * documentos criados por validacoes anteriores sobreviveriam ao reseed e
 * os codigos sequenciais deixariam de ser deterministicos.
 */
async function wipeEmulator() {
  if (!USE_EMULATOR) return;
  const host = process.env.FIRESTORE_EMULATOR_HOST ?? "127.0.0.1:8480";
  const res = await fetch(
    `http://${host}/emulator/v1/projects/${projectId}/databases/(default)/documents`,
    { method: "DELETE" }
  );
  if (!res.ok) {
    throw new Error(`wipe do emulador falhou: HTTP ${res.status}`);
  }
  console.log("  ✓ emulador limpo");
}

// ── MINERACAO minima (Fase 5 tera o modulo completo) ────────────────

const MINING = [
  {
    id: "min-bolsa",
    code: "MIN-0001",
    name: "Bolsa de Crochê Artesanal",
    url: "https://facebook.com/ads/library/?id=111",
    whyInteresting: "Anúncio rodando há 62 dias com 40+ criativos ativos",
    status: "modelada",
    niche: "moda feminina",
    country: "BR",
    targetAudience: "Mulheres 25-45",
    promise: "Bolsa artesanal por menos de R$50",
    mechanism: "Produção em crochê sob encomenda",
    price: 39.9,
    advertiser: "Ateliê Fio de Ouro",
    score: 5,
    convertedOfferId: "offer-bolsa-croche",
  },
  {
    id: "min-pulseira",
    code: "MIN-0002",
    name: "Pulseira Magnética Terapêutica",
    url: "https://facebook.com/ads/library/?id=222",
    whyInteresting: "Escala agressiva no público 45+, checkout simples",
    status: "quero_modelar",
    niche: "saúde",
    country: "BR",
    targetAudience: "Adultos 45+",
    promise: "Alívio de dores nas articulações",
    mechanism: "Ímã terapêutico no pulso",
    price: 59.9,
    advertiser: "MagVida",
    score: 4,
    convertedOfferId: null,
  },
  {
    id: "min-organizador",
    code: "MIN-0003",
    name: "Organizador de Geladeira Modular",
    url: "https://facebook.com/ads/library/?id=777",
    whyInteresting: "Mesmo nicho que já validamos, ver se dá pra escalar em paralelo",
    status: "analisar",
    niche: "casa",
    country: "BR",
    targetAudience: null,
    promise: null,
    mechanism: null,
    price: null,
    advertiser: null,
    score: null,
    convertedOfferId: null,
  },
] as const;

async function seedMining() {
  const batch = db.batch();
  for (const m of MINING) {
    batch.set(db.collection("miningItems").doc(m.id), {
      code: m.code,
      name: m.name,
      url: m.url,
      whyInteresting: m.whyInteresting,
      status: m.status,
      niche: m.niche,
      country: m.country,
      targetAudience: m.targetAudience,
      promise: m.promise,
      mechanism: m.mechanism,
      price: m.price,
      advertiser: m.advertiser,
      score: m.score,
      notes: null,
      convertedOfferId: m.convertedOfferId,
      ...audit(OWNER),
    });
  }
  await batch.commit();
  console.log(`  ✓ ${MINING.length} ofertas mineradas`);
}

// ── REFERENCIAS externas / swipe file (§8) ──────────────────────────

const REFERENCES = [
  {
    id: "ref-comparacao",
    code: "REF-CR-0001",
    url: "https://facebook.com/ads/library/?id=333",
    whySaved: "Hook de comparação de preço muito forte, 40 dias no ar",
    transcription:
      "Trezentos reais numa bolsa? Eu pagava. Até descobrir que a mesma bolsa, do mesmo crochê, sai por menos de cinquenta direto de quem faz. Passa pro lado que eu te mostro a diferença... porque não tem.",
    miningItemId: "min-bolsa",
    status: "modelado",
    source: "Biblioteca Meta",
  },
  {
    id: "ref-pov-cozinha",
    code: "REF-CR-0002",
    url: "https://tiktok.com/@org/video/444",
    whySaved: "POV de organização viralizou, formato replicável pra geladeira",
    transcription: null,
    miningItemId: null,
    status: "modelar",
    source: "TikTok",
  },
  {
    id: "ref-depoimento-45",
    code: "REF-CR-0003",
    url: "https://facebook.com/ads/library/?id=555",
    whySaved: "Depoimento de senhora 60+ com dor no punho, público engaja",
    transcription: null,
    miningItemId: "min-pulseira",
    status: "salvo",
    source: "Biblioteca Meta",
  },
  {
    id: "ref-descartada",
    code: "REF-CR-0004",
    url: "https://facebook.com/ads/library/?id=666",
    whySaved: "Parecia bom, mas é ângulo de urgência falsa — não usamos",
    transcription: null,
    miningItemId: null,
    status: "descartado",
    source: "Biblioteca Meta",
  },
] as const;

async function seedReferences() {
  const batch = db.batch();
  for (const r of REFERENCES) {
    batch.set(db.collection("creativeReferences").doc(r.id), {
      code: r.code,
      url: r.url,
      storagePath: null,
      transcription: r.transcription,
      whySaved: r.whySaved,
      analysis: null,
      miningItemId: r.miningItemId,
      status: r.status,
      advertiser: null,
      format: null,
      source: r.source,
      notes: null,
      ...audit(OWNER),
    });
  }
  await batch.commit();
  console.log(`  ✓ ${REFERENCES.length} referências externas`);
}

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
  await db.collection("counters").doc("scripts").set({ seq: SCRIPTS.length });
  await db.collection("counters").doc("creatives").set({ seq: CREATIVES.length });
  await db.collection("counters").doc("mining").set({ seq: MINING.length });
  await db
    .collection("counters")
    .doc("references")
    .set({ seq: REFERENCES.length });
  await db.collection("counters").doc("experiments").set({ seq: EXPERIMENTS.length });
  await db.collection("counters").doc("chips").set({ seq: CHIPS.length });
  console.log(
    `  ✓ counters (offers ${OFFERS.length}, scripts ${SCRIPTS.length}, creatives ${CREATIVES.length}, refs ${REFERENCES.length}, tests ${EXPERIMENTS.length}, chips ${CHIPS.length})`
  );
}

// ── COPIES com versionamento (§19, §20) ─────────────────────────────

const WPM = 150;

function versionPayload(
  version: number,
  hook: string | null,
  body: string,
  cta: string | null,
  changeNote: string | null,
  createdBy: string
) {
  const text = [hook, body, cta].filter(Boolean).join(" ");
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  return {
    version,
    hook,
    body,
    cta,
    wordCount,
    estimatedDurationSeconds: Math.ceil((wordCount / WPM) * 60),
    changeNote,
    createdAt: new Date(),
    createdBy,
  };
}

const SCRIPTS = [
  {
    id: "script-luxo",
    code: "CP-0001",
    offerId: "offer-bolsa-croche",
    angleId: "ang-luxo",
    title: "Copy principal — ângulo luxo",
    status: "em_uso",
    responsibleId: "seed-joao",
    versions: [
      versionPayload(
        1,
        "Você sabia que essa bolsa custa 300 reais nas lojas de grife?",
        "Eu descobri um ateliê que faz a mesma bolsa artesanal, no crochê, peça por peça. A diferença é que você não paga pela etiqueta. São mulheres brasileiras produzindo em casa, com o mesmo acabamento das marcas que você vê na vitrine. Cada bolsa leva em média doze horas para ficar pronta. Não existe produção em massa aqui, e é por isso que cada peça é única.",
        "Chama no WhatsApp e escolhe a sua cor antes que acabe o lote da semana.",
        "Versão inicial",
        "seed-joao"
      ),
      versionPayload(
        2,
        "Essa bolsa custa 300 reais na loja. Aqui sai por 39,90 e eu vou te explicar o porquê.",
        "O segredo é que você compra direto de quem produz. São mulheres brasileiras que fazem cada peça à mão, no crochê, em casa. Doze horas de trabalho por bolsa. Você não paga vitrine, não paga shopping, não paga etiqueta. Só paga o trabalho. E o acabamento é o mesmo que você vê nas marcas caras, porque a técnica é a mesma. A diferença está na conta, não na bolsa.",
        "Chama no WhatsApp agora e garante a sua cor. O lote dessa semana tem 40 peças.",
        "Hook mais direto, ancoragem de preço na primeira linha",
        "seed-joao"
      ),
    ],
  },
  {
    id: "script-preco",
    code: "CP-0002",
    offerId: "offer-bolsa-croche",
    angleId: "ang-preco",
    title: "Copy comparação de preço",
    status: "revisao",
    responsibleId: "seed-joao",
    versions: [
      versionPayload(
        1,
        "R$300 contra R$39,90. Mesma bolsa.",
        "Coloquei as duas lado a lado e pedi para três amigas adivinharem qual era a cara. Nenhuma acertou. O crochê é o mesmo ponto, o fio é o mesmo algodão, o forro é o mesmo. A única diferença visível é a etiqueta costurada por dentro.",
        "Quer ver as duas de perto? Chama no WhatsApp que eu mando o vídeo comparativo.",
        "Versão inicial",
        "seed-joao"
      ),
    ],
  },
  {
    id: "script-geladeira",
    code: "CP-0003",
    offerId: "offer-organizador",
    angleId: "ang-antes-depois",
    title: "Copy antes e depois — geladeira",
    status: "aprovado",
    responsibleId: "seed-socio",
    versions: [
      versionPayload(
        1,
        "Minha geladeira era uma vergonha. Olha isso agora.",
        "Dez minutos. Foi o tempo que levei para transformar o caos em organização com o kit de oito peças. Cada pote empilha no outro, tudo transparente, tudo visível. Parei de perder comida vencida no fundo da prateleira e a família inteira acha o que procura.",
        "Chama no WhatsApp e recebe o kit em até 7 dias.",
        "Versão inicial",
        "seed-socio"
      ),
    ],
  },
] as const;

async function seedScripts() {
  for (const s of SCRIPTS) {
    const current = s.versions[s.versions.length - 1];
    await db.collection("scripts").doc(s.id).set({
      code: s.code,
      offerId: s.offerId,
      angleId: s.angleId,
      title: s.title,
      status: s.status,
      currentVersion: current.version,
      responsibleId: s.responsibleId,
      notes: null,
      // Briefing de producao (§4)
      suggestedFormat: s.id === "script-luxo" ? "ugc" : null,
      editingInstructions:
        s.id === "script-luxo"
          ? "Legendas queimadas, corte rápido no hook, mostrar a bolsa nos primeiros 3s."
          : null,
      referenceLinks: null,
      deadline: null,
      // Modelagem (§12): CP-0001 nasceu da referência REF-CR-0001
      sourceReferenceId: s.id === "script-luxo" ? "ref-comparacao" : null,
      current,
      ...audit(OWNER),
    });
    for (const v of s.versions) {
      await db
        .collection("scripts")
        .doc(s.id)
        .collection("versions")
        .doc(`v${v.version}`)
        .set(v);
    }
  }
  console.log(`  ✓ ${SCRIPTS.length} copies com versões`);
}

// ── CRIATIVOS (§14) ─────────────────────────────────────────────────

const CREATIVES = [
  {
    id: "cr-ugc-luxo",
    code: "CR-0001",
    offerId: "offer-bolsa-croche",
    angleId: "ang-luxo",
    scriptId: "script-luxo",
    scriptVersion: 2,
    title: "UGC luxo — depoimento na rua",
    hook: "Essa bolsa custa 300 na loja",
    format: "ugc",
    durationSeconds: 42,
    editorId: "seed-joao",
    responsibleId: "seed-gabriel",
    status: "vencedor",
    tags: ["luxo", "preco", "desejo"],
  },
  {
    id: "cr-narracao-renda",
    code: "CR-0002",
    offerId: "offer-bolsa-croche",
    angleId: "ang-renda",
    scriptId: "script-luxo",
    scriptVersion: 1,
    title: "Narração renda extra",
    hook: "Ganhe dinheiro revendendo crochê",
    format: "narracao",
    durationSeconds: 38,
    editorId: "seed-joao",
    responsibleId: "seed-gabriel",
    status: "perdedor",
    tags: ["renda-extra"],
  },
  {
    id: "cr-story-preco",
    code: "CR-0003",
    offerId: "offer-bolsa-croche",
    angleId: "ang-preco",
    scriptId: "script-preco",
    scriptVersion: 1,
    title: "Story comparação de preço",
    hook: "R$300 contra R$39,90",
    format: "story",
    durationSeconds: 28,
    editorId: "seed-joao",
    responsibleId: "seed-gabriel",
    status: "testando",
    tags: ["preco", "comparacao", "economia"],
  },
  {
    id: "cr-selfie-unboxing",
    code: "CR-0004",
    offerId: "offer-bolsa-croche",
    angleId: "ang-luxo",
    scriptId: null,
    scriptVersion: null,
    title: "Selfie — unboxing da bolsa",
    hook: "Chegou e eu não acreditei",
    format: "selfie",
    durationSeconds: 35,
    editorId: "seed-joao",
    responsibleId: "seed-gabriel",
    status: "aguardando_edicao",
    tags: ["desejo", "prova"],
  },
  {
    id: "cr-antes-depois-look",
    code: "CR-0005",
    offerId: "offer-bolsa-croche",
    angleId: "ang-luxo",
    scriptId: null,
    scriptVersion: null,
    title: "Antes e depois — look completo",
    hook: "Montei três looks com uma bolsa só",
    format: "antes-depois",
    durationSeconds: 45,
    editorId: "seed-joao",
    responsibleId: "seed-gabriel",
    status: "editando",
    tags: ["desejo"],
  },
  {
    id: "cr-comparacao-mesa",
    code: "CR-0006",
    offerId: "offer-bolsa-croche",
    angleId: "ang-preco",
    scriptId: "script-preco",
    scriptVersion: 1,
    title: "Comparação lado a lado",
    hook: "Coloquei as duas na mesa",
    format: "comparacao-de-preco",
    durationSeconds: 31,
    editorId: "seed-joao",
    responsibleId: "seed-gabriel",
    status: "revisao",
    tags: ["comparacao", "preco"],
  },
  {
    id: "cr-gel-antes-depois",
    code: "CR-0007",
    offerId: "offer-organizador",
    angleId: "ang-antes-depois",
    scriptId: "script-geladeira",
    scriptVersion: 1,
    title: "Antes e depois — geladeira",
    hook: "Minha geladeira era um caos",
    format: "antes-depois",
    durationSeconds: 33,
    editorId: "seed-joao",
    responsibleId: "seed-socio",
    status: "vencedor",
    tags: ["dor", "prova"],
  },
  {
    id: "cr-gel-demo",
    code: "CR-0008",
    offerId: "offer-organizador",
    angleId: "ang-antes-depois",
    scriptId: null,
    scriptVersion: null,
    title: "Demonstração do kit",
    hook: "Olha como encaixa",
    format: "demonstracao",
    durationSeconds: 40,
    editorId: "seed-joao",
    responsibleId: "seed-socio",
    status: "testando",
    tags: ["prova"],
  },
] as const;

async function seedCreatives() {
  const batch = db.batch();
  for (const c of CREATIVES) {
    const live = c.status === "testando" || c.status === "vencedor" || c.status === "perdedor";
    batch.set(db.collection("creatives").doc(c.id), {
      code: c.code,
      offerId: c.offerId,
      angleId: c.angleId,
      scriptId: c.scriptId,
      scriptVersion: c.scriptVersion,
      title: c.title,
      hook: c.hook,
      format: c.format,
      platform: "meta",
      durationSeconds: c.durationSeconds,
      editorId: c.editorId,
      responsibleId: c.responsibleId,
      status: c.status,
      storagePath: null,
      thumbnailPath: null,
      sourceUrl: null,
      inspirationUrl: null,
      tags: [...c.tags],
      notes: null,
      editedAt: live ? new Date() : null,
      approvedAt: live ? new Date() : null,
      launchedAt: live ? new Date() : null,
      ...audit(OWNER),
    });
  }
  await batch.commit();
  console.log(`  ✓ ${CREATIVES.length} criativos`);
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
  const entry = (
    entityType: string,
    entityId: string,
    entityCode: string,
    offerId: string,
    description: string
  ) =>
    batch.set(db.collection("activity").doc(), {
      actorId: OWNER,
      actorName: "Gabriel Maia",
      entityType,
      entityId,
      entityCode,
      offerId,
      action: "created",
      field: null,
      oldValue: null,
      newValue: null,
      description,
      createdAt: now,
    });

  for (const offer of OFFERS) {
    entry(
      "offer",
      offer.id,
      offer.code,
      offer.id,
      `Gabriel Maia criou a oferta ${offer.code} — ${offer.name}`
    );
  }
  for (const s of SCRIPTS) {
    entry(
      "script",
      s.id,
      s.code,
      s.offerId,
      `Gabriel Maia criou a copy ${s.code} — ${s.title}`
    );
  }
  for (const c of CREATIVES) {
    entry(
      "creative",
      c.id,
      c.code,
      c.offerId,
      `Gabriel Maia criou o criativo ${c.code} — ${c.title}`
    );
  }
  await batch.commit();
  console.log(
    `  ✓ ${OFFERS.length + SCRIPTS.length + CREATIVES.length} entradas de activity`
  );
}

// ── TESTES (§23-§25) ─────────────────────────────────────────────────

const EXPERIMENTS = [
  {
    id: "test-angulo-luxo",
    code: "TEST-0001",
    offerId: "offer-bolsa-croche",
    name: "Ângulo luxo vs renda extra",
    hypothesis: "O ângulo de status/luxo converte melhor que renda extra neste público",
    variable: "angulo",
    status: "concluido",
    responsibleId: "seed-gabriel",
    startDate: businessDate(-12),
    endDate: businessDate(-6),
    spend: 850,
    leads: 120,
    sales: 22,
    revenue: 878,
    result: "vencedor",
    conclusion: "Ângulo luxo performou 2,2x melhor que renda extra em ROAS.",
    nextAction: "Duplicar orçamento nos criativos de ângulo luxo e pausar renda extra.",
  },
  {
    id: "test-headline-preco",
    code: "TEST-0002",
    offerId: "offer-bolsa-croche",
    name: "Headline com comparação de preço",
    hypothesis: "Ancorar o preço de R$300 na headline aumenta CTR da página",
    variable: "headline",
    status: "rodando",
    responsibleId: "seed-gabriel",
    startDate: businessDate(-3),
    endDate: null,
    spend: 210,
    leads: 30,
    sales: 5,
    revenue: 199.5,
    result: null,
    conclusion: null,
    nextAction: null,
  },
  {
    id: "test-cta-urgencia",
    code: "TEST-0003",
    offerId: "offer-organizador",
    name: "CTA com urgência vs CTA padrão",
    hypothesis: "CTA com urgência ('últimas unidades') aumenta taxa de clique",
    variable: "cta",
    status: "rodando",
    responsibleId: "seed-socio",
    startDate: businessDate(-2),
    endDate: null,
    spend: 180,
    leads: 25,
    sales: 6,
    revenue: 359.4,
    result: null,
    conclusion: null,
    nextAction: null,
  },
  {
    id: "test-pagina-decalque",
    code: "TEST-0004",
    offerId: "offer-decalque",
    name: "Página Quiz vs página direta",
    hypothesis: "Quiz qualifica melhor o lead e aumenta a conversão",
    variable: "pagina",
    status: "planejado",
    responsibleId: "seed-gabriel",
    startDate: null,
    endDate: null,
    spend: 0,
    leads: 0,
    sales: 0,
    revenue: 0,
    result: null,
    conclusion: null,
    nextAction: null,
  },
] as const;

async function seedExperiments() {
  const batch = db.batch();
  for (const e of EXPERIMENTS) {
    batch.set(db.collection("experiments").doc(e.id), {
      code: e.code,
      offerId: e.offerId,
      name: e.name,
      hypothesis: e.hypothesis,
      variable: e.variable,
      status: e.status,
      responsibleId: e.responsibleId,
      startDate: e.startDate,
      endDate: e.endDate,
      spend: e.spend,
      leads: e.leads,
      sales: e.sales,
      revenue: e.revenue,
      result: e.result,
      conclusion: e.conclusion,
      nextAction: e.nextAction,
      ...audit(OWNER),
    });
  }
  await batch.commit();
  console.log(`  ✓ ${EXPERIMENTS.length} testes`);
}

// ── CHIPS (§39-§44) ──────────────────────────────────────────────────

interface ChipSeed {
  id: string;
  code: string;
  phone: string;
  operator: string;
  status: string;
  responsibleId: string;
  offerId: string | null;
  acquisitionDate: string | null;
  warmupStartDate: string | null;
  readyDate: string | null;
  activationDate: string | null;
}

const CHIPS: ChipSeed[] = [
  { id: "chip-001", code: "CHIP-001", phone: "+55 11 98001-0001", operator: "Vivo", status: "ativo", responsibleId: "seed-maria", offerId: "offer-bolsa-croche", acquisitionDate: businessDate(-45), warmupStartDate: businessDate(-44), readyDate: businessDate(-30), activationDate: businessDate(-13) },
  { id: "chip-002", code: "CHIP-002", phone: "+55 11 98001-0002", operator: "Vivo", status: "ativo", responsibleId: "seed-maria", offerId: "offer-bolsa-croche", acquisitionDate: businessDate(-45), warmupStartDate: businessDate(-44), readyDate: businessDate(-30), activationDate: businessDate(-13) },
  { id: "chip-003", code: "CHIP-003", phone: "+55 21 98001-0003", operator: "Claro", status: "ativo", responsibleId: "seed-maria", offerId: "offer-organizador", acquisitionDate: businessDate(-60), warmupStartDate: businessDate(-59), readyDate: businessDate(-45), activationDate: businessDate(-40) },
  { id: "chip-004", code: "CHIP-004", phone: "+55 21 98001-0004", operator: "Claro", status: "ativo", responsibleId: "seed-maria", offerId: "offer-organizador", acquisitionDate: businessDate(-60), warmupStartDate: businessDate(-59), readyDate: businessDate(-45), activationDate: businessDate(-40) },
  { id: "chip-005", code: "CHIP-005", phone: "+55 31 98001-0005", operator: "TIM", status: "pronto", responsibleId: "seed-maria", offerId: null, acquisitionDate: businessDate(-25), warmupStartDate: businessDate(-24), readyDate: businessDate(-8), activationDate: null },
  { id: "chip-006", code: "CHIP-006", phone: "+55 31 98001-0006", operator: "TIM", status: "pronto", responsibleId: "seed-maria", offerId: null, acquisitionDate: businessDate(-25), warmupStartDate: businessDate(-24), readyDate: businessDate(-8), activationDate: null },
  { id: "chip-007", code: "CHIP-007", phone: "+55 41 98001-0007", operator: "Vivo", status: "pronto", responsibleId: "seed-maria", offerId: null, acquisitionDate: businessDate(-20), warmupStartDate: businessDate(-19), readyDate: businessDate(-5), activationDate: null },
  { id: "chip-008", code: "CHIP-008", phone: "+55 11 98001-0008", operator: "Claro", status: "aquecendo", responsibleId: "seed-maria", offerId: null, acquisitionDate: businessDate(-10), warmupStartDate: businessDate(-9), readyDate: null, activationDate: null },
  { id: "chip-009", code: "CHIP-009", phone: "+55 11 98001-0009", operator: "Claro", status: "aquecendo", responsibleId: "seed-maria", offerId: null, acquisitionDate: businessDate(-9), warmupStartDate: businessDate(-8), readyDate: null, activationDate: null },
  { id: "chip-010", code: "CHIP-010", phone: "+55 21 98001-0010", operator: "TIM", status: "aquecendo", responsibleId: "seed-maria", offerId: null, acquisitionDate: businessDate(-7), warmupStartDate: businessDate(-6), readyDate: null, activationDate: null },
  { id: "chip-011", code: "CHIP-011", phone: "+55 21 98001-0011", operator: "Vivo", status: "novo", responsibleId: "seed-maria", offerId: null, acquisitionDate: businessDate(-2), warmupStartDate: null, readyDate: null, activationDate: null },
  { id: "chip-012", code: "CHIP-012", phone: "+55 31 98001-0012", operator: "Vivo", status: "novo", responsibleId: "seed-maria", offerId: null, acquisitionDate: businessDate(-1), warmupStartDate: null, readyDate: null, activationDate: null },
  { id: "chip-013", code: "CHIP-013", phone: "+55 41 98001-0013", operator: "Claro", status: "reserva", responsibleId: "seed-maria", offerId: null, acquisitionDate: businessDate(-50), warmupStartDate: businessDate(-49), readyDate: businessDate(-35), activationDate: businessDate(-30) },
  { id: "chip-014", code: "CHIP-014", phone: "+55 51 98001-0014", operator: "TIM", status: "indisponivel", responsibleId: "seed-maria", offerId: null, acquisitionDate: businessDate(-70), warmupStartDate: businessDate(-69), readyDate: businessDate(-55), activationDate: businessDate(-50) },
];

function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return `****${digits.slice(-4)}`;
}

async function seedChips() {
  const batch = db.batch();
  for (const c of CHIPS) {
    const ref = db.collection("chips").doc(c.id);
    batch.set(ref, {
      code: c.code,
      maskedNumber: maskPhone(c.phone),
      operator: c.operator,
      status: c.status,
      responsibleId: c.responsibleId,
      currentOfferId: c.offerId,
      notes: null,
      acquisitionDate: c.acquisitionDate,
      warmupStartDate: c.warmupStartDate,
      readyDate: c.readyDate,
      activationDate: c.activationDate,
      ...audit(OWNER),
    });
    batch.set(ref.collection("secret").doc("phone"), {
      phoneNumber: c.phone,
      updatedAt: now,
      updatedBy: OWNER,
    });
    batch.set(ref.collection("events").doc(), {
      type: "compra",
      description: "Chip cadastrado",
      offerId: null,
      actorId: OWNER,
      actorName: "Gabriel Maia",
      createdAt: now,
    });
    if (c.offerId) {
      batch.set(ref.collection("events").doc(), {
        type: "vinculado_oferta",
        description: "Vinculado a uma oferta",
        offerId: c.offerId,
        actorId: OWNER,
        actorName: "Gabriel Maia",
        createdAt: now,
      });
    }
  }
  await batch.commit();
  console.log(`  ✓ ${CHIPS.length} chips`);
}

// ── FINANCEIRO (§30-§38) ─────────────────────────────────────────────

const PARTNERS = [
  { id: "partner-gabriel", name: "Gabriel Maia", ownershipPercentage: 50 },
  { id: "partner-socio", name: "Sócio", ownershipPercentage: 50 },
] as const;

async function seedPartners() {
  const batch = db.batch();
  for (const p of PARTNERS) {
    batch.set(db.collection("partners").doc(p.id), {
      name: p.name,
      ownershipPercentage: p.ownershipPercentage,
      active: true,
      createdAt: now,
      updatedAt: now,
    });
  }
  await batch.commit();
  console.log(`  ✓ ${PARTNERS.length} sócios`);
}

const LEDGER_ENTRIES = [
  { id: "ledger-aporte-gabriel", kind: "contribution", amount: 5000, date: businessDate(-90), partnerId: "partner-gabriel", period: null, notes: "Aporte inicial", description: null, category: null, offerId: null, recurring: false, receiptPath: null, countsInPnl: false, source: null },
  { id: "ledger-aporte-socio", kind: "contribution", amount: 5000, date: businessDate(-90), partnerId: "partner-socio", period: null, notes: "Aporte inicial", description: null, category: null, offerId: null, recurring: false, receiptPath: null, countsInPnl: false, source: null },
  { id: "ledger-exp-ferramentas", kind: "expense", amount: 168.9, date: businessDate(-20), partnerId: null, period: null, notes: null, description: "CapCut Pro + ElevenLabs", category: "ferramentas", offerId: null, recurring: true, receiptPath: null, countsInPnl: true, source: null },
  { id: "ledger-exp-chips", kind: "expense", amount: 420, date: businessDate(-30), partnerId: null, period: null, notes: null, description: "Compra de 14 chips", category: "chips", offerId: null, recurring: false, receiptPath: null, countsInPnl: true, source: null },
  { id: "ledger-exp-freelancer", kind: "expense", amount: 600, date: businessDate(-15), partnerId: null, period: null, notes: null, description: "Edição de 8 criativos", category: "freelancer", offerId: "offer-bolsa-croche", recurring: false, receiptPath: null, countsInPnl: true, source: null },
  { id: "ledger-exp-dominio", kind: "expense", amount: 40, date: businessDate(-10), partnerId: null, period: null, notes: null, description: "cboclub.com", category: "dominios", offerId: null, recurring: false, receiptPath: null, countsInPnl: true, source: null },
  { id: "ledger-exp-tracking", kind: "expense", amount: 79, date: businessDate(-5), partnerId: null, period: null, notes: null, description: "Utmify", category: "ferramentas", offerId: null, recurring: true, receiptPath: null, countsInPnl: true, source: null },
  { id: "ledger-exp-copy", kind: "expense", amount: 450, date: businessDate(-2), partnerId: null, period: null, notes: null, description: "Copywriter — 3 copies", category: "freelancer", offerId: "offer-bolsa-croche", recurring: false, receiptPath: null, countsInPnl: true, source: null },
  { id: "ledger-exp-metaads", kind: "expense", amount: 3200, date: businessDate(-1), partnerId: null, period: null, notes: "Já contabilizado via métricas diárias — não soma de novo no P&L", description: "Fatura Meta Ads consolidada", category: "meta_ads", offerId: null, recurring: false, receiptPath: null, countsInPnl: false, source: null },
  { id: "ledger-rev-consultoria", kind: "revenue", amount: 800, date: businessDate(-8), partnerId: null, period: null, notes: null, description: "Consultoria pontual para outra operação", category: null, offerId: null, recurring: false, receiptPath: null, countsInPnl: true, source: "consultoria" },
  { id: "ledger-dist-gabriel", kind: "distribution", amount: 600, date: businessDate(-3), partnerId: "partner-gabriel", period: businessDate(-3).slice(0, 7), notes: null, description: null, category: null, offerId: null, recurring: false, receiptPath: null, countsInPnl: false, source: null },
] as const;

async function seedLedger() {
  const batch = db.batch();
  for (const e of LEDGER_ENTRIES) {
    batch.set(db.collection("ledger").doc(e.id), {
      kind: e.kind,
      amount: e.amount,
      date: e.date,
      description: e.description,
      notes: e.notes,
      category: e.category,
      offerId: e.offerId,
      recurring: e.recurring,
      receiptPath: e.receiptPath,
      countsInPnl: e.countsInPnl,
      source: e.source,
      partnerId: e.partnerId,
      period: e.period,
      deletedAt: null,
      createdAt: now,
      createdBy: OWNER,
    });
  }
  await batch.commit();
  console.log(`  ✓ ${LEDGER_ENTRIES.length} lançamentos financeiros`);
}

const RECURRING_COSTS = [
  { id: "rec-capcut", name: "CapCut Pro", category: "edicao", amount: 49.9, frequency: "mensal", nextChargeDate: businessDate(12), responsibleId: "seed-gabriel" },
  { id: "rec-elevenlabs", name: "ElevenLabs", category: "ia", amount: 119, frequency: "mensal", nextChargeDate: businessDate(5), responsibleId: "seed-gabriel" },
  { id: "rec-utmify", name: "Utmify", category: "tracking", amount: 79, frequency: "mensal", nextChargeDate: businessDate(8), responsibleId: "seed-gabriel" },
  { id: "rec-dominio", name: "Registro.br", category: "dominio", amount: 40, frequency: "anual", nextChargeDate: businessDate(200), responsibleId: "seed-gabriel" },
] as const;

async function seedRecurringCosts() {
  const batch = db.batch();
  for (const r of RECURRING_COSTS) {
    batch.set(db.collection("recurringCosts").doc(r.id), {
      name: r.name,
      category: r.category,
      amount: r.amount,
      frequency: r.frequency,
      nextChargeDate: r.nextChargeDate,
      responsibleId: r.responsibleId,
      active: true,
      createdAt: now,
      updatedAt: now,
    });
  }
  await batch.commit();
  console.log(`  ✓ ${RECURRING_COSTS.length} custos recorrentes`);
}

// ── GESTAO (§45-§51) ─────────────────────────────────────────────────

const TASKS = [
  { id: "task-editar-videos", title: "Editar 4 vídeos do ângulo luxo", responsibleId: "seed-joao", deadline: businessDate(0), status: "fazendo", priority: "alta", offerId: "offer-bolsa-croche", creativeId: null, decisionId: null, description: null },
  { id: "task-revisar-cr006", title: "Revisar CR-0006 antes de subir", responsibleId: "seed-gabriel", deadline: businessDate(0), status: "fazer", priority: "alta", offerId: "offer-bolsa-croche", creativeId: null, decisionId: null, description: null },
  { id: "task-headline-decalque", title: "Finalizar headline da página do decalque", responsibleId: "seed-gabriel", deadline: businessDate(1), status: "fazer", priority: "media", offerId: "offer-decalque", creativeId: null, decisionId: null, description: null },
  { id: "task-aquecer-chips", title: "Acompanhar aquecimento dos chips 008-010", responsibleId: "seed-maria", deadline: businessDate(3), status: "fazendo", priority: "media", offerId: null, creativeId: null, decisionId: null, description: null },
  { id: "task-budget-organizador", title: "Subir budget da Geladeira para R$800/dia", responsibleId: "seed-socio", deadline: businessDate(1), status: "fazer", priority: "alta", offerId: "offer-organizador", creativeId: null, decisionId: null, description: null },
  { id: "task-vencida", title: "Cadastrar comprovante da fatura Meta Ads", responsibleId: "seed-gabriel", deadline: businessDate(-2), status: "fazer", priority: "baixa", offerId: null, creativeId: null, decisionId: null, description: null },
  { id: "task-concluida", title: "Revisar SOP de aquecimento de chip", responsibleId: "seed-maria", deadline: businessDate(-5), status: "concluido", priority: "baixa", offerId: null, creativeId: null, decisionId: null, description: null },
] as const;

async function seedTasks() {
  const batch = db.batch();
  for (const t of TASKS) {
    batch.set(db.collection("tasks").doc(t.id), {
      title: t.title,
      description: t.description,
      status: t.status,
      priority: t.priority,
      responsibleId: t.responsibleId,
      deadline: t.deadline,
      offerId: t.offerId,
      creativeId: t.creativeId,
      decisionId: t.decisionId,
      completedAt: t.status === "concluido" ? now : null,
      ...audit(OWNER),
    });
  }
  await batch.commit();
  console.log(`  ✓ ${TASKS.length} tarefas`);
}

const TOOLS = [
  { id: "tool-capcut", name: "CapCut Pro", category: "edicao", url: "https://capcut.com", monthlyCost: 49.9, renewalDate: businessDate(12), responsibleId: "seed-gabriel" },
  { id: "tool-elevenlabs", name: "ElevenLabs", category: "ia", url: "https://elevenlabs.io", monthlyCost: 119, renewalDate: businessDate(5), responsibleId: "seed-gabriel" },
  { id: "tool-spy", name: "Spy Tool", category: "spy", url: null, monthlyCost: 197, renewalDate: businessDate(20), responsibleId: "seed-gabriel" },
  { id: "tool-utmify", name: "Utmify", category: "tracking", url: "https://utmify.com.br", monthlyCost: 79, renewalDate: businessDate(8), responsibleId: "seed-gabriel" },
  { id: "tool-transcricao", name: "Ferramenta de transcrição externa", category: "transcricao", url: null, monthlyCost: 0, renewalDate: null, responsibleId: "seed-joao" },
] as const;

async function seedTools() {
  const batch = db.batch();
  for (const t of TOOLS) {
    batch.set(db.collection("tools").doc(t.id), {
      name: t.name,
      category: t.category,
      url: t.url,
      monthlyCost: t.monthlyCost,
      renewalDate: t.renewalDate,
      responsibleId: t.responsibleId,
      active: true,
      createdAt: now,
      updatedAt: now,
    });
  }
  await batch.commit();
  console.log(`  ✓ ${TOOLS.length} ferramentas`);
}

const PROCESSES = [
  { id: "proc-subir-oferta", title: "Como subir uma oferta", category: "escala", content: "1. Minerar e validar hipótese\n2. Transformar em oferta interna\n3. Definir ângulos e escrever copy\n4. Produzir criativos\n5. Criar página\n6. Separar chips\n7. Marcar como Pronta\n8. Iniciar teste" },
  { id: "proc-aquecer-chip", title: "Como aquecer um chip", category: "chips", content: "Dia 1-3: conversas manuais.\nDia 4-7: grupos e status.\nDia 8-14: volume gradual.\nSó marcar Pronto após 14 dias sem restrição." },
  { id: "proc-editar-criativo", title: "Como editar um criativo", category: "criativos", content: "Abra a Copy vinculada, leia o briefing (hook, instruções, formato sugerido). Legenda queimada, corte no hook nos 3 primeiros segundos, CTA claro no fim." },
  { id: "proc-registrar-metricas", title: "Como registrar métricas do dia", category: "trafego", content: "Todo fim de dia: abra a oferta, aba Tráfego, registre gasto, leads, vendas e receita. Leva menos de 1 minuto por oferta." },
] as const;

async function seedProcesses() {
  const batch = db.batch();
  for (const p of PROCESSES) {
    batch.set(db.collection("sops").doc(p.id), {
      title: p.title,
      category: p.category,
      content: p.content,
      active: true,
      createdAt: now,
      updatedAt: now,
    });
  }
  await batch.commit();
  console.log(`  ✓ ${PROCESSES.length} processos`);
}

async function main() {
  console.log(
    `\nSemeando ${USE_EMULATOR ? "EMULADORES locais" : `projeto ${projectId}`}\n`
  );
  await wipeEmulator();
  await seedUsers();
  await seedSettings();
  await seedCounters();
  await seedOffers();
  await seedMining();
  await seedReferences();
  await seedScripts();
  await seedCreatives();
  await seedExperiments();
  await seedChips();
  await seedPartners();
  await seedLedger();
  await seedRecurringCosts();
  await seedTasks();
  await seedTools();
  await seedProcesses();
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
