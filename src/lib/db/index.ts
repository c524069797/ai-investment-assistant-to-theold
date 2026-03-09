import { sql } from "@vercel/postgres";

// Ensure tables exist (called on first request)
let initialized = false;

export async function ensureTables() {
  if (initialized) return;

  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      avatar TEXT NOT NULL DEFAULT '👤',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS watchlist (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      code TEXT NOT NULL,
      name TEXT NOT NULL,
      market INTEGER NOT NULL DEFAULT 0,
      type TEXT NOT NULL CHECK (type IN ('stock', 'fund')),
      added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(user_id, code, type)
    )
  `;

  // Seed default users if empty
  const { rowCount } = await sql`SELECT 1 FROM users LIMIT 1`;
  if (rowCount === 0) {
    await sql`INSERT INTO users (id, name, avatar) VALUES ('dad', '爸爸', '👨')`;
    await sql`INSERT INTO users (id, name, avatar) VALUES ('mom', '妈妈', '👩')`;
  }

  initialized = true;
}

// ---- User Operations ----

export async function getAllUsers() {
  await ensureTables();
  const { rows } = await sql`SELECT id, name, avatar, created_at as "createdAt" FROM users ORDER BY created_at`;
  return rows;
}

export async function getUserById(id: string) {
  await ensureTables();
  const { rows } = await sql`SELECT id, name, avatar FROM users WHERE id = ${id}`;
  return rows[0] ?? null;
}

// ---- Watchlist Operations ----

export async function getWatchlist(userId: string) {
  await ensureTables();
  const { rows } = await sql`
    SELECT id, user_id as "userId", code, name, market, type, added_at as "addedAt"
    FROM watchlist
    WHERE user_id = ${userId}
    ORDER BY added_at DESC
  `;
  return rows;
}

export async function addToWatchlist(
  userId: string,
  item: { code: string; name: string; market: number; type: "stock" | "fund" },
) {
  await ensureTables();
  const id = `${userId}-${item.type}-${item.code}`;
  const { rows } = await sql`
    INSERT INTO watchlist (id, user_id, code, name, market, type)
    VALUES (${id}, ${userId}, ${item.code}, ${item.name}, ${item.market}, ${item.type})
    ON CONFLICT (user_id, code, type) DO NOTHING
    RETURNING id, user_id as "userId", code, name, market, type, added_at as "addedAt"
  `;
  if (rows.length > 0) return rows[0];
  // Already exists, return existing
  const existing = await sql`
    SELECT id, user_id as "userId", code, name, market, type, added_at as "addedAt"
    FROM watchlist WHERE user_id = ${userId} AND code = ${item.code} AND type = ${item.type}
  `;
  return existing.rows[0];
}

export async function removeFromWatchlist(
  userId: string,
  code: string,
  type: "stock" | "fund",
) {
  await ensureTables();
  const { rowCount } = await sql`
    DELETE FROM watchlist WHERE user_id = ${userId} AND code = ${code} AND type = ${type}
  `;
  return (rowCount ?? 0) > 0;
}

export async function isInWatchlist(
  userId: string,
  code: string,
  type: "stock" | "fund",
) {
  await ensureTables();
  const { rowCount } = await sql`
    SELECT 1 FROM watchlist WHERE user_id = ${userId} AND code = ${code} AND type = ${type}
  `;
  return (rowCount ?? 0) > 0;
}
