import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword } from "@/lib/auth";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function createPrisma() {
  const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL || "";
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
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
    console.warn("[db] Could not seed users. Ensure tables exist via `prisma db push`.");
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

// ---- Chat Operations ----

export async function getChatSessions(userId: string) {
  await ensureSeeded();
  return prisma.chatSession.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      createdAt: true,
      updatedAt: true,
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { content: true, role: true },
      },
    },
  });
}

export async function createChatSession(userId: string, title = "新对话") {
  await ensureSeeded();
  return prisma.chatSession.create({
    data: {
      id: `${userId}-chat-${Date.now()}`,
      userId,
      title,
    },
  });
}

export async function getChatSessionById(userId: string, sessionId: string) {
  await ensureSeeded();
  return prisma.chatSession.findFirst({
    where: { id: sessionId, userId },
  });
}

export async function getChatMessages(userId: string, sessionId: string) {
  await ensureSeeded();
  const session = await prisma.chatSession.findFirst({
    where: { id: sessionId, userId },
    select: {
      id: true,
      messages: {
        orderBy: { createdAt: "asc" },
        select: { id: true, role: true, content: true, createdAt: true },
      },
    },
  });

  return session?.messages ?? [];
}

export async function addChatMessage(sessionId: string, role: string, content: string) {
  await ensureSeeded();
  const message = await prisma.chatMessage.create({
    data: {
      id: `${sessionId}-${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      sessionId,
      role,
      content,
    },
  });

  await prisma.chatSession.update({
    where: { id: sessionId },
    data: { updatedAt: new Date() },
  });

  return message;
}

export async function updateChatSessionTitle(sessionId: string, title: string) {
  await ensureSeeded();
  return prisma.chatSession.update({
    where: { id: sessionId },
    data: { title },
  });
}
