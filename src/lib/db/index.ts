import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "db.json");

export interface User {
  id: string;
  name: string;
  avatar: string;
  createdAt: string;
}

export interface WatchlistRecord {
  id: string;
  userId: string;
  code: string;
  name: string;
  market: number;
  type: "stock" | "fund";
  addedAt: string;
}

interface Database {
  users: User[];
  watchlist: WatchlistRecord[];
}

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readDb(): Database {
  ensureDataDir();
  if (!fs.existsSync(DB_FILE)) {
    const initial: Database = {
      users: [
        {
          id: "dad",
          name: "爸爸",
          avatar: "👨",
          createdAt: new Date().toISOString(),
        },
        {
          id: "mom",
          name: "妈妈",
          avatar: "👩",
          createdAt: new Date().toISOString(),
        },
      ],
      watchlist: [],
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), "utf-8");
    return initial;
  }
  const raw = fs.readFileSync(DB_FILE, "utf-8");
  return JSON.parse(raw);
}

function writeDb(db: Database) {
  ensureDataDir();
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf-8");
}

let dbCache: Database | null = null;

function getDb(): Database {
  if (!dbCache) {
    dbCache = readDb();
  }
  return dbCache;
}

function saveDb(db: Database) {
  dbCache = db;
  writeDb(db);
}

// ---- User Operations ----

export function getAllUsers(): User[] {
  return getDb().users;
}

export function getUserById(id: string): User | undefined {
  return getDb().users.find((u) => u.id === id);
}

export function createUser(name: string, avatar: string): User {
  const db = getDb();
  const id = name.toLowerCase().replace(/\s+/g, "-") + "-" + Date.now();
  const user: User = {
    id,
    name,
    avatar,
    createdAt: new Date().toISOString(),
  };
  saveDb({ ...db, users: [...db.users, user] });
  return user;
}

// ---- Watchlist Operations ----

export function getWatchlist(userId: string): WatchlistRecord[] {
  return getDb().watchlist.filter((w) => w.userId === userId);
}

export function addToWatchlist(
  userId: string,
  item: { code: string; name: string; market: number; type: "stock" | "fund" },
): WatchlistRecord {
  const db = getDb();
  const existing = db.watchlist.find(
    (w) => w.userId === userId && w.code === item.code && w.type === item.type,
  );
  if (existing) {
    return existing;
  }
  const record: WatchlistRecord = {
    id: `${userId}-${item.type}-${item.code}`,
    userId,
    ...item,
    addedAt: new Date().toISOString(),
  };
  saveDb({ ...db, watchlist: [...db.watchlist, record] });
  return record;
}

export function removeFromWatchlist(
  userId: string,
  code: string,
  type: "stock" | "fund",
): boolean {
  const db = getDb();
  const filtered = db.watchlist.filter(
    (w) => !(w.userId === userId && w.code === code && w.type === type),
  );
  if (filtered.length === db.watchlist.length) {
    return false;
  }
  saveDb({ ...db, watchlist: filtered });
  return true;
}

export function isInWatchlist(
  userId: string,
  code: string,
  type: "stock" | "fund",
): boolean {
  return getDb().watchlist.some(
    (w) => w.userId === userId && w.code === code && w.type === type,
  );
}
