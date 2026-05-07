// Tiny KV-style helpers backed by Neon Postgres.
// One table, qe_kv, stores arbitrary JSON blobs by key.
import { neon } from "@neondatabase/serverless";

let _sql = null;
let _schemaReady = false;

function getSql() {
  if (_sql) return _sql;
  const url =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.NEON_DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set. Connect a Neon database in the Vercel dashboard.");
  _sql = neon(url);
  return _sql;
}

async function ensureSchema() {
  if (_schemaReady) return;
  const sql = getSql();
  await sql`CREATE TABLE IF NOT EXISTS qe_kv (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;
  _schemaReady = true;
}

export async function kvGet(key) {
  await ensureSchema();
  const sql = getSql();
  const rows = await sql`SELECT value FROM qe_kv WHERE key = ${key}`;
  return rows.length > 0 ? rows[0].value : null;
}

export async function kvSet(key, value) {
  await ensureSchema();
  const sql = getSql();
  const json = JSON.stringify(value);
  await sql`
    INSERT INTO qe_kv (key, value, updated_at)
    VALUES (${key}, ${json}::jsonb, NOW())
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
  `;
}

export function isAuthed(req) {
  const auth = req.headers?.authorization || req.headers?.Authorization || "";
  return auth === "Bearer " + (process.env.QE_PASSCODE || "let-me-in");
}
