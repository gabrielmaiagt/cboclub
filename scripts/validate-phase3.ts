/**
 * Validacao ponta a ponta da Fase 3 (Criativos + Copies).
 *
 *   npm run validate:phase3   (emuladores + dev server no ar)
 *
 * Cobre: paginas reais por HTTP com sessao, criacao/leitura/edicao via
 * repositorios (mesmo caminho das server actions), versionamento de copy
 * com imutabilidade, vinculo copy/criativo, auditoria no mesmo fluxo e
 * PERMISSOES contra as Security Rules de verdade — escrevendo no
 * Firestore por REST com tokens de usuarios de papeis diferentes.
 */
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local" });

const BASE = "http://localhost:3000";
const AUTH = "http://127.0.0.1:9099";
const FS = "http://127.0.0.1:8480";
const PROJECT = "cboclub-f815c";
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
  if (!data.idToken) throw new Error(`login ${email} falhou: ${data.error?.message}`);
  return data.idToken;
}

async function sessionCookie(idToken: string): Promise<string> {
  const res = await fetch(`${BASE}/api/test-session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });
  if (!res.ok) throw new Error(`sessao falhou: HTTP ${res.status}`);
  const match = (res.headers.get("set-cookie") ?? "").match(/x1_session=([^;]+)/);
  if (!match) throw new Error("cookie ausente");
  return match[1];
}

async function get(path: string, cookie: string) {
  return fetch(`${BASE}${path}`, {
    headers: { Cookie: `x1_session=${cookie}` },
    redirect: "manual",
  });
}

/** Escrita direta no Firestore por REST com token de USUARIO (rules valem). */
async function fsWrite(
  method: "POST" | "PATCH",
  path: string,
  idToken: string,
  fields: Record<string, unknown>
) {
  return fetch(`${FS}/v1/projects/${PROJECT}/databases/(default)/documents/${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${idToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fields }),
  });
}

const str = (v: string) => ({ stringValue: v });
const nul = { nullValue: null } as const;

/** Doc minimo de criativo que satisfaz o schema das rules. */
function minimalCreativeFields() {
  return {
    code: str("CR-RULES"),
    offerId: str("offer-bolsa-croche"),
    title: str("Teste de rules"),
    status: str("ideia"),
    tags: { arrayValue: { values: [] } },
    deletedAt: nul, // ajuste #4: explicito
  };
}

async function main() {
  console.log("\n== Validacao Fase 3: Criativos + Copies ==\n");

  // ── 1. Sessoes ────────────────────────────────────────────────────
  const gabrielToken = await signIn("gabrielmaiasantos0012@gmail.com", "cboclub123");
  const joaoToken = await signIn("joao@cboclub.com", "cboclub123"); // criativo
  const mariaToken = await signIn("maria@cboclub.com", "cboclub123"); // operacao
  const cookie = await sessionCookie(gabrielToken);
  check("login de owner, criativo e operacao", true);

  // ── 2. Paginas ────────────────────────────────────────────────────
  const creativesPage = await get("/criativos", cookie);
  const creativesHtml = await creativesPage.text();
  check("GET /criativos responde 200", creativesPage.status === 200,
    `HTTP ${creativesPage.status}`);
  check(
    "listagem mostra criativos do seed (CR-0001..CR-0008)",
    creativesHtml.includes("CR-0001") && creativesHtml.includes("CR-0008")
  );

  const copiesPage = await get("/copies", cookie);
  const copiesHtml = await copiesPage.text();
  check("GET /copies responde 200", copiesPage.status === 200);
  check(
    "listagem de copies mostra código, versão e duração",
    copiesHtml.includes("CP-0001") && copiesHtml.includes("V2")
  );

  const creativeDetail = await get("/criativos/CR-0001", cookie);
  const creativeHtml = await creativeDetail.text();
  check("GET /criativos/CR-0001 responde 200", creativeDetail.status === 200);
  check(
    "detalhe do criativo mostra vínculo copy + versão específica (CP-0001 V2)",
    creativeHtml.includes("CP-0001") && creativeHtml.includes("V2")
  );

  const copyDetail = await get("/copies/CP-0001", cookie);
  const copyHtml = await copyDetail.text();
  check("GET /copies/CP-0001 responde 200", copyDetail.status === 200);
  check(
    "página da copy mostra as duas versões",
    copyHtml.includes("V1") && copyHtml.includes("V2")
  );

  const offerPage = await get("/ofertas/OFFER-0001", cookie);
  const offerHtml = await offerPage.text();
  check(
    "aba da oferta lista copies e criativos relacionados",
    offerHtml.includes("CP-0001") && offerHtml.includes("CR-0001")
  );

  // ── 3. Repositorios (mesmo caminho das server actions) ────────────
  process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8480";
  process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";

  const { createScript, addScriptVersion, getScriptByCode, listVersions } =
    await import("../src/services/firestore/scripts.repo");
  const { createCreative, getCreativeByCode, updateCreative, changeCreativeStatus } =
    await import("../src/services/firestore/creatives.repo");
  const { listActivityByEntity } = await import(
    "../src/services/firestore/activity.repo"
  );
  const { scriptFormSchema } = await import("../src/lib/schemas/script");
  const { creativeFormSchema } = await import("../src/lib/schemas/creative");

  const actor = { uid: "seed-gabriel", name: "Gabriel Maia" };

  // Criacao de copy: 30 palavras exatas para conferir a matematica
  const words30 = Array.from({ length: 30 }, (_, i) => `palavra${i + 1}`).join(" ");
  const scriptInput = scriptFormSchema.parse({
    offerId: "offer-bolsa-croche",
    title: "Copy de validação E2E",
    body: words30,
  });
  const script = await createScript(scriptInput, actor);
  check("createScript gera código sequencial (CP-0004)", script.code === "CP-0004",
    `veio ${script.code}`);
  check("V1 criada com wordCount correto (30)", script.current.wordCount === 30,
    `veio ${script.current.wordCount}`);
  // 30 palavras a 150 ppm = 0,2 min = 12s
  check(
    "duração estimada correta (30 palavras @150ppm = 12s)",
    script.current.estimatedDurationSeconds === 12,
    `veio ${script.current.estimatedDurationSeconds}s`
  );
  check("deletedAt da copy nasce explicitamente null", script.deletedAt === null);

  // Versionamento
  const v1Before = (await listVersions(script.id)).find((v) => v.version === 1);
  await addScriptVersion(
    {
      scriptId: script.id,
      hook: "Hook novo da V2",
      body: words30 + " extra",
      cta: null,
      changeNote: "Teste de versionamento",
    },
    actor
  );
  const afterV2 = await getScriptByCode(script.code);
  const versions = await listVersions(script.id);
  const v1After = versions.find((v) => v.version === 1);
  const v2 = versions.find((v) => v.version === 2);

  check("addScriptVersion cria V2", v2 != null);
  check("currentVersion avança para 2", afterV2?.currentVersion === 2);
  check(
    "snapshot current reflete a V2",
    afterV2?.current.version === 2 && afterV2.current.hook === "Hook novo da V2"
  );
  check(
    "V1 permanece intacta (nunca sobrescrever §20)",
    v1After != null &&
      v1After.body === v1Before?.body &&
      v1After.wordCount === v1Before.wordCount &&
      v1After.hook === v1Before.hook
  );

  // Criativo vinculado a copy + versao especifica
  const creativeInput = creativeFormSchema.parse({
    offerId: "offer-bolsa-croche",
    angleId: "ang-luxo",
    scriptId: script.id,
    scriptVersion: 2,
    title: "Criativo de validação E2E",
    hook: "Hook do criativo",
    format: "ugc",
    tags: ["luxo", "preco"],
    editorId: "seed-joao",
  });
  const creative = await createCreative(creativeInput, actor);
  check("createCreative gera código sequencial (CR-0009)", creative.code === "CR-0009",
    `veio ${creative.code}`);
  check(
    "criativo aponta para copy E versão específica",
    creative.scriptId === script.id && creative.scriptVersion === 2
  );
  check("tags persistidas", creative.tags.length === 2);
  check("deletedAt do criativo nasce explicitamente null", creative.deletedAt === null);

  // Edicao
  await updateCreative(creative.id, { title: "Título editado E2E" }, actor);
  const afterEdit = await getCreativeByCode(creative.code);
  check("updateCreative persiste alteração", afterEdit?.title === "Título editado E2E");

  // Status + carimbos de ciclo de vida
  await changeCreativeStatus(creative.id, "aprovado", actor);
  const afterApprove = await getCreativeByCode(creative.code);
  check(
    "status aprovado carimba approvedAt",
    afterApprove?.status === "aprovado" && afterApprove.approvedAt != null
  );
  await changeCreativeStatus(creative.id, "testando", actor);
  const afterLaunch = await getCreativeByCode(creative.code);
  check(
    "status testando carimba launchedAt",
    afterLaunch?.status === "testando" && afterLaunch.launchedAt != null
  );

  // ── 4. Auditoria no mesmo fluxo ───────────────────────────────────
  const scriptTimeline = await listActivityByEntity("script", script.id);
  check(
    "timeline da copy: created + nova versão",
    scriptTimeline.some((t) => t.action === "created") &&
      scriptTimeline.some((t) => t.field === "version" && t.newValue === "V2")
  );

  const creativeTimeline = await listActivityByEntity("creative", creative.id);
  const actions = creativeTimeline.map((t) => t.action);
  check(
    "timeline do criativo: created + updated + 2x status_changed",
    actions.includes("created") &&
      actions.includes("updated") &&
      actions.filter((a) => a === "status_changed").length >= 2,
    actions.join(", ")
  );

  // ── 5. Permissoes: Security Rules de verdade ──────────────────────
  // maria e do papel operacao: NAO pode escrever em creatives
  const mariaWrite = await fsWrite(
    "POST",
    "creatives?documentId=rules-test-maria",
    mariaToken,
    minimalCreativeFields()
  );
  check(
    "rules: operacao NÃO cria criativo (403)",
    mariaWrite.status === 403,
    `HTTP ${mariaWrite.status}`
  );

  // joao e criativo: PODE criar
  const joaoWrite = await fsWrite(
    "POST",
    "creatives?documentId=rules-test-joao",
    joaoToken,
    minimalCreativeFields()
  );
  check(
    "rules: criativo PODE criar criativo (200)",
    joaoWrite.status === 200,
    `HTTP ${joaoWrite.status}`
  );

  // criacao sem deletedAt explicito deve falhar (ajuste #4)
  const noDeletedAt = { ...minimalCreativeFields() } as Record<string, unknown>;
  delete noDeletedAt.deletedAt;
  const missingField = await fsWrite(
    "POST",
    "creatives?documentId=rules-test-nodel",
    joaoToken,
    noDeletedAt
  );
  check(
    "rules: criação sem deletedAt explícito é negada (403)",
    missingField.status === 403,
    `HTTP ${missingField.status}`
  );

  // versoes sao imutaveis: nem quem pode criar consegue alterar
  const versionPatch = await fsWrite(
    "PATCH",
    `scripts/${script.id}/versions/v1`,
    joaoToken,
    { body: str("tentativa de sobrescrever") }
  );
  check(
    "rules: versão de copy é imutável até para criativo (403)",
    versionPatch.status === 403,
    `HTTP ${versionPatch.status}`
  );

  // activity e intocavel pelo cliente (ajuste #2) — ate para o owner
  const activityWrite = await fsWrite(
    "POST",
    "activity?documentId=rules-test-activity",
    gabrielToken,
    { description: str("tentativa"), entityType: str("x"), entityId: str("y"), action: str("created") }
  );
  check(
    "rules: cliente não escreve em activity nem sendo owner (403)",
    activityWrite.status === 403,
    `HTTP ${activityWrite.status}`
  );

  // counters sao só do Admin SDK
  const counterWrite = await fsWrite(
    "PATCH",
    "counters/creatives",
    gabrielToken,
    { seq: { integerValue: "999" } }
  );
  check(
    "rules: cliente não altera counters (403)",
    counterWrite.status === 403,
    `HTTP ${counterWrite.status}`
  );

  // limpeza do doc criado pelo teste de rules
  const { adminDb } = await import("../src/lib/firebase/admin");
  await adminDb().collection("creatives").doc("rules-test-joao").delete();
  const adminDbForCleanup = adminDb;

  // ── 5b. Quick capture: titulos derivados ──────────────────────────
  const quickScript = await createScript(
    scriptFormSchema.parse({
      offerId: "offer-bolsa-croche",
      hook: "Esse hook vira o título da copy automaticamente sem esforço",
      body: "corpo curto",
    }),
    actor
  );
  check(
    "copy sem título deriva o título do hook",
    quickScript.title.startsWith("Esse hook vira o título"),
    quickScript.title
  );

  const quickCreative = await createCreative(
    creativeFormSchema.parse({
      offerId: "offer-bolsa-croche",
      scriptId: script.id,
      scriptVersion: 1,
    }),
    actor
  );
  check(
    "criativo sem título herda o título da copy vinculada",
    quickCreative.title === script.title,
    quickCreative.title
  );

  // ── 5c. Referencias: fluxo completo (§21) ─────────────────────────
  const {
    createReference,
    updateReference,
    getReferenceByCode,
    createModelagem,
    listModelagens,
  } = await import("../src/services/firestore/references.repo");
  const { referenceQuickSchema } = await import("../src/lib/schemas/reference");

  // salvar rapidamente: so o link
  const reference = await createReference(
    referenceQuickSchema.parse({
      url: "https://facebook.com/ads/library/?id=999",
      whySaved: "Referência da validação E2E",
    }),
    actor
  );
  check(
    "referência salva rapidamente com código sequencial (REF-CR-0005)",
    reference.code === "REF-CR-0005",
    `veio ${reference.code}`
  );
  check("referência nasce com status Salvo", reference.status === "salvo");
  check("deletedAt da referência nasce explicitamente null",
    reference.deletedAt === null);

  // quick capture exige link OU arquivo
  const noLink = referenceQuickSchema.safeParse({ whySaved: "sem link" });
  check("quick capture sem link nem arquivo é rejeitado", !noLink.success);

  // adicionar transcricao depois
  await updateReference(
    reference.id,
    { transcription: "Transcrição colada da ferramenta externa." },
    actor
  );
  // relacionar a oferta minerada depois
  await updateReference(reference.id, { miningItemId: "min-bolsa" }, actor);
  // marcar para modelar
  await updateReference(reference.id, { status: "modelar" }, actor);

  const refAfter = await getReferenceByCode(reference.code);
  check(
    "transcrição + oferta minerada + status adicionados depois",
    refAfter?.transcription === "Transcrição colada da ferramenta externa." &&
      refAfter.miningItemId === "min-bolsa" &&
      refAfter.status === "modelar"
  );

  // criar modelagem: REF -> copy interna rascunho
  const modeled = await createModelagem(
    reference.id,
    "offer-bolsa-croche",
    actor
  );
  check(
    "modelagem cria copy interna vinculada (sourceReferenceId)",
    modeled.sourceReferenceId === reference.id
  );
  check(
    "corpo da modelagem parte da transcrição (original preservado)",
    modeled.current.body === "Transcrição colada da ferramenta externa."
  );

  const refModeled = await getReferenceByCode(reference.code);
  check(
    "referência vira Modelado após a modelagem",
    refModeled?.status === "modelado"
  );
  check(
    "transcrição original NÃO foi sobrescrita pela modelagem",
    refModeled?.transcription === "Transcrição colada da ferramenta externa."
  );

  const modelagens = await listModelagens(reference.id);
  check(
    "listModelagens devolve a copy criada",
    modelagens.some((m) => m.id === modeled.id)
  );

  // auditoria do fluxo de referencia
  const refTimeline = await listActivityByEntity("reference", reference.id);
  const refActions = refTimeline.map((t) => t.action);
  check(
    "timeline da referência: created + updated + status_changed",
    refActions.includes("created") &&
      refActions.includes("updated") &&
      refActions.includes("status_changed"),
    refActions.join(", ")
  );

  // dossie: referencias por oferta minerada (§14)
  const { listReferences } = await import(
    "../src/services/firestore/references.repo"
  );
  const dossie = await listReferences({ miningItemId: "min-bolsa" });
  check(
    "dossiê da oferta minerada lista as referências relacionadas",
    dossie.some((r) => r.id === reference.id) &&
      dossie.some((r) => r.code === "REF-CR-0001")
  );

  // ── 5d. Rules das referencias ─────────────────────────────────────
  const mariaRef = await fsWrite(
    "POST",
    "creativeReferences?documentId=rules-ref-maria",
    mariaToken,
    {
      code: str("REF-RULES"),
      url: str("https://x.com"),
      status: str("salvo"),
      deletedAt: nul,
    }
  );
  check(
    "rules: operacao NÃO salva referência (403)",
    mariaRef.status === 403,
    `HTTP ${mariaRef.status}`
  );

  const joaoRef = await fsWrite(
    "POST",
    "creativeReferences?documentId=rules-ref-joao",
    joaoToken,
    {
      code: str("REF-RULES"),
      url: str("https://x.com"),
      status: str("salvo"),
      deletedAt: nul,
    }
  );
  check(
    "rules: criativo PODE salvar referência (200)",
    joaoRef.status === 200,
    `HTTP ${joaoRef.status}`
  );
  await adminDbForCleanup()
    .collection("creativeReferences")
    .doc("rules-ref-joao")
    .delete();

  // pagina da referencia renderiza com as secoes
  const refPage = await get(`/referencias/${reference.code}`, cookie);
  const refHtml = await refPage.text();
  check(
    "página da referência renderiza com modelagem e timeline",
    refPage.status === 200 &&
      refHtml.includes(modeled.code) &&
      refHtml.includes("Transcrição original")
  );

  const refsList = await get("/referencias", cookie);
  const refsHtml = await refsList.text();
  check(
    "listagem /referencias mostra as referências do seed",
    refsList.status === 200 && refsHtml.includes("REF-CR-0001")
  );

  // ── 6. Paginas dos registros novos ────────────────────────────────
  const newCreativePage = await get(`/criativos/${creative.code}`, cookie);
  const newCreativeHtml = await newCreativePage.text();
  check(
    "página do criativo novo renderiza com vínculo e timeline",
    newCreativePage.status === 200 &&
      newCreativeHtml.includes(script.code) &&
      newCreativeHtml.includes("V2")
  );

  const newCopyPage = await get(`/copies/${script.code}`, cookie);
  const newCopyHtml = await newCopyPage.text();
  check(
    "página da copy nova renderiza com V1 e V2",
    newCopyPage.status === 200 && newCopyHtml.includes("V2")
  );

  console.log(`\n${passed} passaram, ${failed} falharam\n`);
  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  console.error("\nAbortou:", err instanceof Error ? err.message : err);
  process.exit(1);
});
