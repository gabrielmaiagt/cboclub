/**
 * Smoke test leve: autentica e confere HTTP 200 + trecho esperado nas
 * rotas passadas por argv. Usado entre macroetapas para nao pagar o
 * custo da suite completa a cada mudanca pequena.
 *
 *   npx tsx scripts/smoke.ts /rota1 "trecho esperado" /rota2 "trecho" ...
 */
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });

const BASE = "http://localhost:3000";
const AUTH = "http://127.0.0.1:9099";
const API_KEY = "AIzaSyDYhFEbrJsAElUetuUmyBRn6QZRvU-aUDU";

async function signIn(): Promise<string> {
  const res = await fetch(
    `${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "gabrielmaiasantos0012@gmail.com",
        password: "cboclub123",
        returnSecureToken: true,
      }),
    }
  );
  const data = (await res.json()) as { idToken?: string };
  if (!data.idToken) throw new Error("login falhou");
  return data.idToken;
}

async function sessionCookie(idToken: string): Promise<string> {
  const res = await fetch(`${BASE}/api/test-session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });
  const match = (res.headers.get("set-cookie") ?? "").match(/x1_session=([^;]+)/);
  if (!match) throw new Error("cookie ausente");
  return match[1];
}

async function main() {
  const idToken = await signIn();
  const cookie = await sessionCookie(idToken);

  const args = process.argv.slice(2);
  let pass = 0;
  let fail = 0;

  for (let i = 0; i < args.length; i += 2) {
    const path = args[i];
    const expect = args[i + 1];
    const res = await fetch(`${BASE}${path}`, {
      headers: { Cookie: `x1_session=${cookie}` },
      redirect: "manual",
    });
    const html = res.status === 200 ? await res.text() : "";
    const ok = res.status === 200 && (!expect || html.includes(expect));
    if (ok) {
      pass++;
      console.log(`  ✓ ${path} (${res.status})`);
    } else {
      fail++;
      console.log(`  ✗ ${path} — HTTP ${res.status}${expect ? `, esperava "${expect}"` : ""}`);
    }
  }

  console.log(`\n${pass} ok, ${fail} falharam\n`);
  process.exit(fail ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
