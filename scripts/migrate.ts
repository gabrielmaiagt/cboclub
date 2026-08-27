/**
 * Runner de migrations.
 *
 *   npm run db:migrate        aplica as migrations pendentes
 *   npm run db:seed           aplica o seed
 *   npm run db:reset          derruba o schema, reaplica tudo e semeia
 *
 * Conecta como DONO do schema (DATABASE_URL), nao como app_user.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { Client } from "pg";
import { config as loadEnv } from "dotenv";

// Next.js le .env.local automaticamente; um script tsx avulso nao.
loadEnv({ path: ".env.local" });
loadEnv({ path: ".env" });

const MIGRATIONS_DIR = join(process.cwd(), "db", "migrations");
const SEED_FILE = join(process.cwd(), "db", "seed.sql");

function connectionString(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL nao definida. Copie .env.example para .env.local e preencha."
    );
  }
  return url;
}

async function withClient<T>(fn: (c: Client) => Promise<T>): Promise<T> {
  const client = new Client({ connectionString: connectionString() });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

async function ensureMigrationsTable(c: Client) {
  await c.query(`
    create table if not exists public._migrations (
      name       text primary key,
      applied_at timestamptz not null default now()
    )
  `);
}

async function migrate() {
  await withClient(async (c) => {
    await ensureMigrationsTable(c);
    const { rows } = await c.query<{ name: string }>(
      "select name from public._migrations"
    );
    const applied = new Set(rows.map((r) => r.name));

    const files = readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith(".sql"))
      .sort();

    let count = 0;
    for (const file of files) {
      if (applied.has(file)) continue;
      const sql = readFileSync(join(MIGRATIONS_DIR, file), "utf8");
      process.stdout.write(`  → ${file} ... `);
      try {
        await c.query("begin");
        await c.query(sql);
        await c.query("insert into public._migrations (name) values ($1)", [file]);
        await c.query("commit");
        console.log("ok");
        count++;
      } catch (err) {
        await c.query("rollback");
        console.log("FALHOU");
        throw err;
      }
    }
    console.log(
      count === 0 ? "Nada pendente." : `${count} migration(s) aplicada(s).`
    );
  });
}

async function seed() {
  await withClient(async (c) => {
    const sql = readFileSync(SEED_FILE, "utf8");
    process.stdout.write("  → seed.sql ... ");
    await c.query(sql);
    console.log("ok");
  });
}

async function reset() {
  await withClient(async (c) => {
    console.log("  → derrubando schema public e app");
    await c.query("drop schema if exists public cascade");
    await c.query("drop schema if exists app cascade");
    await c.query("create schema public");
  });
  await migrate();
  await seed();
}

const cmd = process.argv[2];
const actions: Record<string, () => Promise<void>> = { migrate, seed, reset };

if (!actions[cmd]) {
  console.error("Uso: tsx scripts/migrate.ts <migrate|seed|reset>");
  process.exit(1);
}

actions[cmd]()
  .then(() => process.exit(0))
  .catch((err: unknown) => {
    console.error("\n" + (err instanceof Error ? err.message : String(err)));
    process.exit(1);
  });
