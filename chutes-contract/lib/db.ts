// Postgres (Supabase) client + persistence helpers for contract analyses.
//
// The app previously stored each analysis in the browser's localStorage under a
// `contract_<id>` key. We now persist them in Supabase Postgres so analyses are
// durable, shared across devices, and scoped to the authenticated Chutes user.
//
// SUPABASE_URI is the Supabase connection string (transaction pooler). We use
// node-postgres directly rather than supabase-js because we only have a Postgres
// URI, not a project URL + anon key.

import { Pool } from "pg";

// Reuse a single pool across hot reloads in development. Without this, Next.js
// would open a new pool on every module reload and exhaust connections.
const globalForPg = globalThis as unknown as {
  __pgPool?: Pool;
  __schemaReady?: Promise<void>;
};

function getPool(): Pool {
  if (!globalForPg.__pgPool) {
    const connectionString = process.env.SUPABASE_URI;
    if (!connectionString) {
      throw new Error("SUPABASE_URI is not set");
    }
    globalForPg.__pgPool = new Pool({
      connectionString,
      // Supabase requires TLS. The pooler presents a cert that isn't in the
      // default CA bundle, so we don't enforce chain verification here.
      ssl: { rejectUnauthorized: false },
      max: 5,
    });
  }
  return globalForPg.__pgPool;
}

/**
 * Lazily create the contracts table. Cached so the DDL only runs once per
 * process. Safe to call before every query.
 */
function ensureSchema(): Promise<void> {
  if (!globalForPg.__schemaReady) {
    globalForPg.__schemaReady = getPool()
      .query(
        `CREATE TABLE IF NOT EXISTS contracts (
           id           TEXT PRIMARY KEY,
           user_sub     TEXT NOT NULL,
           file_name    TEXT,
           data         JSONB NOT NULL,
           analyzed_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
           created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
         );
         CREATE INDEX IF NOT EXISTS contracts_user_sub_idx
           ON contracts (user_sub, analyzed_at DESC);`
      )
      .then(() => undefined)
      .catch((err) => {
        // Reset so a later request can retry schema creation.
        globalForPg.__schemaReady = undefined;
        throw err;
      });
  }
  return globalForPg.__schemaReady;
}

// The analysis payload is the same object the analyze route returns and the
// UI consumes. We keep it as opaque JSON in the `data` column.
export interface StoredAnalysis {
  id: string;
  fileName?: string;
  analyzedAt?: string;
  [key: string]: unknown;
}

/** Insert or update an analysis for a given user. */
export async function saveAnalysis(
  userSub: string,
  analysis: StoredAnalysis
): Promise<void> {
  await ensureSchema();
  const analyzedAt = analysis.analyzedAt
    ? new Date(analysis.analyzedAt)
    : new Date();
  await getPool().query(
    `INSERT INTO contracts (id, user_sub, file_name, data, analyzed_at)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (id) DO UPDATE
       SET data = EXCLUDED.data,
           file_name = EXCLUDED.file_name,
           analyzed_at = EXCLUDED.analyzed_at,
           user_sub = EXCLUDED.user_sub`,
    [
      analysis.id,
      userSub,
      analysis.fileName ?? null,
      JSON.stringify(analysis),
      analyzedAt.toISOString(),
    ]
  );
}

/** List all analyses for a user, newest first. */
export async function listAnalyses(
  userSub: string
): Promise<StoredAnalysis[]> {
  await ensureSchema();
  const { rows } = await getPool().query<{ data: StoredAnalysis }>(
    `SELECT data FROM contracts
      WHERE user_sub = $1
      ORDER BY analyzed_at DESC`,
    [userSub]
  );
  return rows.map((row) => row.data);
}

/** Fetch a single analysis by id, scoped to the owning user. */
export async function getAnalysis(
  userSub: string,
  id: string
): Promise<StoredAnalysis | null> {
  await ensureSchema();
  const { rows } = await getPool().query<{ data: StoredAnalysis }>(
    `SELECT data FROM contracts WHERE id = $1 AND user_sub = $2`,
    [id, userSub]
  );
  return rows[0]?.data ?? null;
}

/**
 * Delete an analysis by id, scoped to the owning user. Returns true if a row
 * was actually removed (false if it didn't exist or belonged to someone else).
 */
export async function deleteAnalysis(
  userSub: string,
  id: string
): Promise<boolean> {
  await ensureSchema();
  const result = await getPool().query(
    `DELETE FROM contracts WHERE id = $1 AND user_sub = $2`,
    [id, userSub]
  );
  return (result.rowCount ?? 0) > 0;
}
