import { PrismaClient } from "@prisma/client";
import { withAccelerate } from "@prisma/extension-accelerate";
import { hashPassword } from "@/lib/auth";

const globalForPrisma = globalThis as unknown as { prisma: ReturnType<typeof createPrisma> };

function createPrisma() {
  return new PrismaClient({
    accelerateUrl: process.env.DATABASE_URL,
  }).$extends(withAccelerate());
}

export const prisma = globalForPrisma.prisma ?? createPrisma();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// ---- Schema initialization ----

let seeded = false;

async function ensureSeeded() {
  if (seeded) return;
  try {
    const count = await prisma.user.count();
    if (count === 0) {
      const hash = hashPassword("123456");
      await prisma.user.createMany({
        data: [
          { id: "dad", username: "baba", passwordHash: hash, name: "爸爸", avatar: "👨" },
          { id: "mom", username: "mama", passwordHash: hash, name: "妈妈", avatar: "👩" },
        ],
      });
    }
  } catch {
    // Table might not exist yet — prisma db push needed
    console.warn("[db] Could not seed users. Run `prisma db push` to create tables.");
  }
  seeded = true;
}

// ---- User Operations ----

export async function getAllUsers() {
  await ensureSeeded();
  return prisma.user.findMany({
    select: { id: true, username: true, name: true, avatar: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
}

export async function getUserById(id: string) {
  await ensureSeeded();
  return prisma.user.findUnique({
    where: { id },
    select: { id: true, username: true, name: true, avatar: true },
  });
}

export async function getUserByUsername(username: string) {
  await ensureSeeded();
  return prisma.user.findUnique({
    where: { username },
    select: { id: true, username: true, passwordHash: true, name: true, avatar: true },
  });
}

// ---- Watchlist Operations ----

export async function getWatchlist(userId: string) {
  await ensureSeeded();
  return prisma.watchlist.findMany({
    where: { userId },
    orderBy: { addedAt: "desc" },
  });
}

export async function addToWatchlist(
  userId: string,
  item: { code: string; name: string; market: number; type: string },
) {
  await ensureSeeded();
  const id = `${userId}-${item.type}-${item.code}`;
  return prisma.watchlist.upsert({
    where: { id },
    create: { id, userId, code: item.code, name: item.name, market: item.market, type: item.type },
    update: {},
  });
}

export async function removeFromWatchlist(
  userId: string,
  code: string,
  type: string,
) {
  await ensureSeeded();
  try {
    await prisma.watchlist.deleteMany({ where: { userId, code, type } });
    return true;
  } catch {
    return false;
  }
}
