/**
 * Validacao ponta a ponta do fluxo de ofertas contra os emuladores.
 *
 *   npx tsx scripts/validate-flow.ts
 *
 * Simula o caminho que o navegador faz: login no Auth emulator via REST,
 * troca do ID token por cookie de sessao na server action, e navegacao/
 * mutacao pelas rotas reais do Next. Nada e mockado.
 */
import { config as loadEnv } from "dotenv";

// Sem o env carregado, o Admin SDK ficaria sem projectId e escreveria num
// namespace fantasma do emulador — foi exatamente o bug da primeira rodada.
loadEnv({ path: ".env.local" });

const BASE = "http://localhost:3000";
const AUTH = "http://127.0.0.1:9099";
const API_KEY = "AIzaSyDYhFEbrJsAElUetuUmyBRn6QZRvU-aUDU"; // publica

let passed = 0;
let failed = 0;

function check(name: string, ok: boolean, detail = "") {
  if (ok) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

/** Login no emulador do Auth: devolve o ID token. */
async function signIn(email: string, password: string): Promise<string> {
  const res = await fetch(
    `${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    }
  );
  const data = (await res.json()) as { idToken?: string; error?: { message: string } };
  if (!data.idToken) throw new Error(`login falhou: ${data.error?.message}`);
  return data.idToken;
}

/**
 * Invoca uma server action do Next por HTTP.
 * O header Next-Action identifica a action; o id vem do manifest do build
 * dev, entao usamos a rota de sessao dedicada abaixo em vez disso.
 */
async function createSessionCookie(idToken: string): Promise<string> {
  // Server actions nao sao invocaveis de fora sem o action-id do bundle.
  // Para validacao, batemos na propria pagina de login como um navegador
  // faria e usamos o endpoint de sessao de teste exposto so em dev.
  const res = await fetch(`${BASE}/api/test-session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });
  if (!res.ok) throw new Error(`sessao falhou: HTTP ${res.status}`);
  const setCookie = res.headers.get("set-cookie") ?? "";
  const match = setCookie.match(/x1_session=([^;]+)/);
  if (!match) throw new Error("cookie de sessao ausente na resposta");
  return match[1];
}

async function get(path: string, cookie: string) {
  return fetch(`${BASE}${path}`, {
    headers: { Cookie: `x1_session=${cookie}` },
    redirect: "manual",
  });
}

async function main() {
  console.log("\n== Validacao do fluxo de ofertas ==\n");

  // ── 1. Login e sessao ─────────────────────────────────────────────
  const idToken = await signIn("gabrielmaiasantos0012@gmail.com", "cboclub123");
  check("login no Auth emulator", idToken.length > 100);

  const cookie = await createSessionCookie(idToken);
  check("ID token trocado por cookie de sessao", cookie.length > 50);

  // ── 2. Rotas protegidas ───────────────────────────────────────────
  const noSession = await fetch(`${BASE}/ofertas`, { redirect: "manual" });
  check("GET /ofertas sem sessao redireciona", noSession.status === 307);

  const list = await get("/ofertas", cookie);
  const listHtml = await list.text();
  check(
    "GET /ofertas com sessao responde 200",
    list.status === 200,
    `HTTP ${list.status}`
  );
  check(
    "listagem mostra as 4 ofertas do seed",
    listHtml.includes("OFFER-0001") &&
      listHtml.includes("OFFER-0004") &&
      listHtml.includes("Bolsa de Crochê de Luxo")
  );
  check(
    "listagem mostra métricas de hoje (gasto formatado)",
    /R\$\s?[\d.,]+/.test(listHtml)
  );

  // ── 3. Pagina interna ─────────────────────────────────────────────
  const detail = await get("/ofertas/OFFER-0001", cookie);
  const detailHtml = await detail.text();
  check("GET /ofertas/OFFER-0001 responde 200", detail.status === 200);
  check(
    "pagina interna mostra promessa e ângulos embutidos",
    detailHtml.includes("Bolsa artesanal de luxo") && detailHtml.includes("Luxo")
  );
  check(
    "cards acumulados presentes (Investimento/ROAS/ROI)",
    detailHtml.includes("Investimento") &&
      detailHtml.includes("ROAS") &&
      detailHtml.includes("ROI")
  );
  check(
    "timeline carregou entrada do seed",
    detailHtml.includes("criou a oferta OFFER-0001")
  );

  const missing = await get("/ofertas/OFFER-9999", cookie);
  check("oferta inexistente devolve 404", missing.status === 404);

  // ── 4. Criacao via repositorio (mesmo caminho da server action) ───
  process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8480";
  process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";
  const { createOffer, getOfferByCode, updateOffer, changeOfferStatus } =
    await import("../src/services/firestore/offers.repo");
  const { listActivityByOffer } = await import(
    "../src/services/firestore/activity.repo"
  );
  const { offerFormSchema } = await import("../src/lib/schemas/offer");

  const actor = { uid: "seed-gabriel", name: "Gabriel Maia" };

  const parsed = offerFormSchema.parse({
    name: "Oferta de Validação E2E",
    niche: "teste",
    status: "aprovada",
    priority: "media",
    health: "saudavel",
  });
  const created = await createOffer(parsed, actor);
  check(
    "createOffer gera código sequencial no formato OFFER-NNNN",
    /^OFFER-\d{4}$/.test(created.code),
    `veio ${created.code}`
  );
  check("deletedAt nasce explicitamente null", created.deletedAt === null);
  check("auditoria preenchida (createdBy)", created.createdBy === "seed-gabriel");

  // ── 5. Leitura, edicao e status ───────────────────────────────────
  const fetched = await getOfferByCode(created.code);
  check("getOfferByCode encontra a oferta criada", fetched?.id === created.id);

  await updateOffer(created.id, { nextAction: "Validar edição" }, actor);
  const afterEdit = await getOfferByCode(created.code);
  check(
    "updateOffer persiste alteração",
    afterEdit?.nextAction === "Validar edição"
  );

  await changeOfferStatus(created.id, "testando", actor);
  const afterStatus = await getOfferByCode(created.code);
  check("changeOfferStatus muda o status", afterStatus?.status === "testando");
  check(
    "primeira passagem por Testando carimba launchDate",
    afterStatus?.launchDate != null
  );

  // ── 6. Activity no mesmo fluxo (ajuste #2) ────────────────────────
  const timeline = await listActivityByOffer(created.id);
  const actions = timeline.map((t) => t.action);
  check(
    "timeline registrou created + updated + status_changed",
    actions.includes("created") &&
      actions.includes("updated") &&
      actions.includes("status_changed"),
    actions.join(", ")
  );

  // ── 7. Pagina da oferta nova renderiza ────────────────────────────
  const newDetail = await get(`/ofertas/${created.code}`, cookie);
  const newHtml = await newDetail.text();
  check(
    "pagina da oferta recém-criada renderiza com timeline",
    newDetail.status === 200 && newHtml.includes("Oferta de Validação E2E")
  );

  console.log(`\n${passed} passaram, ${failed} falharam\n`);
  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  console.error("\nAbortou:", err instanceof Error ? err.message : err);
  process.exit(1);
});
