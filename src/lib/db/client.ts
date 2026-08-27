import { Pool, type PoolClient, type QueryResultRow } from "pg";

/**
 * Pool de conexoes do Cloud SQL.
 *
 * A app conecta como `app_user`, que NAO e dono de nenhuma tabela — por
 * isso a RLS vale integralmente para ela. As migrations usam uma conexao
 * separada (DATABASE_URL, dono do schema) e nao passam por este pool.
 */
declare global {
  // eslint-disable-next-line no-var
  var __pgPool: Pool | undefined;
}

function createPool(): Pool {
  const connectionString = process.env.DATABASE_URL_APP;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL_APP nao definida. Ela deve apontar para o usuario app_user."
    );
  }

  return new Pool({
    connectionString,
    max: Number(process.env.PG_POOL_MAX ?? 10),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
    // Cloud SQL exige TLS. Em desenvolvimento local (Docker) nao ha TLS.
    ssl: process.env.PG_SSL === "false" ? undefined : { rejectUnauthorized: false },
  });
}

export function getPool(): Pool {
  if (!global.__pgPool) global.__pgPool = createPool();
  return global.__pgPool;
}

/**
 * Executa uma funcao dentro de uma transacao com a identidade do usuario
 * injetada na sessao. Toda politica de RLS le esse valor via
 * `app.firebase_uid()`.
 *
 * O `set_config(..., true)` e LOCAL: some no fim da transacao, entao uma
 * conexao devolvida ao pool nunca carrega a identidade de outro usuario.
 */
export async function withUser<T>(
  firebaseUid: string,
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query("begin");
    await client.query("select set_config('app.firebase_uid', $1, true)", [
      firebaseUid,
    ]);
    const result = await fn(client);
    await client.query("commit");
    return result;
  } catch (err) {
    await client.query("rollback").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

/** Atalho para uma unica query autenticada. */
export async function query<T extends QueryResultRow = QueryResultRow>(
  firebaseUid: string,
  text: string,
  params: unknown[] = []
): Promise<T[]> {
  return withUser(firebaseUid, async (client) => {
    const { rows } = await client.query<T>(text, params);
    return rows;
  });
}

/** Primeira linha ou null. */
export async function queryOne<T extends QueryResultRow = QueryResultRow>(
  firebaseUid: string,
  text: string,
  params: unknown[] = []
): Promise<T | null> {
  const rows = await query<T>(firebaseUid, text, params);
  return rows[0] ?? null;
}

/**
 * Conexao SEM identidade de usuario, usada apenas para operacoes de
 * sistema que precisam rodar antes de existir um profile — hoje, criar o
 * profile no primeiro login. Nunca use isto para servir dados ao cliente.
 */
export async function withSystem<T>(
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await getPool().connect();
  try {
    return await fn(client);
  } finally {
    client.release();
  }
}
