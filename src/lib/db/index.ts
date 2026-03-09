import { sql } from "@vercel/postgres";
import { hashPassword } from "@/lib/auth";

let initialized = false;

export async function ensureTables() {
  if (initialized) return;

  // Check if users table has the username column (new schema)
  // If not, drop old tables and recreate
  try {
    const { rowCount } = await sql`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = 'username'
    `;
    if (rowCount === 0) {
      // Old schema exists without username column — drop and recreate
      await sql`DROP TABLE IF EXISTS watchlist`;
      await sql`DROP TABLE IF EXISTS users`;
    }
  } catch {
    // Tables don't exist yet, that's fine
  }

  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
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
    const hash = hashPassword("123456");
    await sql`INSERT INTO users (id, username, password_hash, name, avatar) VALUES ('dad', 'baba', ${hash}, '爸爸', '👨')`;
    await sql`INSERT INTO users (id, username, password_hash, name, avatar) VALUES ('mom', 'mama', ${hash}, '妈妈', '👩')`;
  }

  initialized = true;
}

// ---- User Operations ----

export async function getAllUsers() {
  await ensureTables();
  const { rows } = await sql`SELECT id, username, name, avatar, created_at as "createdAt" FROM users ORDER BY created_at`;
  return rows;
}

export async function getUserById(id: string) {
  await ensureTables();
  const { rows } = await sql`SELECT id, username, name, avatar FROM users WHERE id = ${id}`;
  return rows[0] ?? null;
}

export async function getUserByUsername(username: string) {
  await ensureTables();
  const { rows } = await sql`SELECT id, username, password_hash as "passwordHash", name, avatar FROM users WHERE username = ${username}`;
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
