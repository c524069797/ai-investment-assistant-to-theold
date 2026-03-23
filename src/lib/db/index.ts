import { createHash } from "crypto";
import { existsSync, readFileSync } from "fs";
import { resolve } from "path";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { fetchStockQuote } from "@/lib/api/eastmoney";
import { fetchFundEstimate } from "@/lib/api/tiantianfund";
import { hashPassword } from "@/lib/auth";
import { analyzeBigVArticle, type BigVArticleInput } from "@/lib/bigv/analyze";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
let prismaClient = globalForPrisma.prisma ?? null;

function readConnectionStringFromEnvFile() {
  const envFiles = [".env.local", ".env"];

  for (const file of envFiles) {
    const filePath = resolve(process.cwd(), file);
    if (!existsSync(filePath)) {
      continue;
    }

    const content = readFileSync(filePath, "utf8");
    const lines = content.split(/\r?\n/);

    for (const key of ["DATABASE_URL", "POSTGRES_URL"]) {
      const line = lines.find((item) => item.startsWith(`${key}=`));
      if (!line) {
        continue;
      }

      const value = line.slice(key.length + 1).trim();
      return value.replace(/^['\"]|['\"]$/g, "");
    }
  }

  return "";
}

function resolveConnectionString() {
  return process.env.DATABASE_URL || process.env.POSTGRES_URL || readConnectionStringFromEnvFile();
}

function createPrisma() {
  const connectionString = resolveConnectionString();
  if (!connectionString) {
    throw new Error("DATABASE_URL is not configured");
  }

  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

function getPrismaClient() {
  if (prismaClient) {
    return prismaClient;
  }

  prismaClient = createPrisma();

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = prismaClient;
  }

  return prismaClient;
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const value = ((getPrismaClient() as unknown) as Record<PropertyKey, unknown>)[prop];
    if (typeof value === "function") {
      return value.bind(getPrismaClient());
    }

    return value;
  },
});

let seeded = false;

async function ensureSeeded() {
  if (seeded) return;

  try {
    const hash = hashPassword("123456");
    const defaults = [
      { id: "dad", username: "baba", passwordHash: hash, name: "爸爸", avatar: "👨" },
      { id: "mom", username: "mama", passwordHash: hash, name: "妈妈", avatar: "👩" },
    ];

    for (const user of defaults) {
      await prisma.user.upsert({
        where: { username: user.username },
        update: {},
        create: user,
      });
    }
  } catch {
    console.warn("[db] Could not seed users. Ensure tables exist via `prisma db push`.");
  }

  seeded = true;
}

export async function getAllUsers() {
  await ensureSeeded();
  return prisma.user.findMany({
    select: { id: true, username: true, name: true, avatar: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
}

export async function createUser(input: { name: string; avatar: string }) {
  await ensureSeeded();
  const name = input.name.trim();
  const avatar = input.avatar.trim() || "🙂";
  const suffix = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const hash = hashPassword("123456");

  return prisma.user.create({
    data: {
      id: `user-${suffix}`,
      username: `user-${suffix}`,
      passwordHash: hash,
      name,
      avatar,
    },
    select: { id: true, username: true, name: true, avatar: true, createdAt: true },
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

function resolveStockMarket(code: string) {
  return code.startsWith("6") ? 1 : 0;
}

export async function getWatchlist(userId: string) {
  await ensureSeeded();
  const items = await prisma.watchlist.findMany({
    where: { userId },
    orderBy: { addedAt: "desc" },
  });

  return Promise.all(
    items.map(async (item) => {
      if (item.type === "fund") {
        try {
          const estimate = await fetchFundEstimate(item.code);
          return {
            ...item,
            name: estimate.name,
            market: 0,
          };
        } catch {
          return {
            ...item,
            name: item.code,
            market: 0,
          };
        }
      }

      const market = resolveStockMarket(item.code);
      try {
        const quote = await fetchStockQuote(market, item.code);
        return {
          ...item,
          name: quote.name,
          market,
        };
      } catch {
        return {
          ...item,
          name: item.code,
          market,
        };
      }
    }),
  );
}

export async function addToWatchlist(
  userId: string,
  item: { code: string; type: string },
) {
  await ensureSeeded();
  const id = `${userId}-${item.type}-${item.code}`;
  return prisma.watchlist.upsert({
    where: { id },
    create: { id, userId, code: item.code, type: item.type },
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

export async function ensureChatSession(userId: string, sessionId: string, title = "新对话") {
  await ensureSeeded();
  const existing = await prisma.chatSession.findFirst({
    where: { id: sessionId, userId },
  });
  if (existing) return existing;

  return prisma.chatSession.create({
    data: {
      id: sessionId,
      userId,
      title,
    },
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

export async function deleteChatSession(userId: string, sessionId: string) {
  await ensureSeeded();
  const session = await prisma.chatSession.findFirst({
    where: { id: sessionId, userId },
    select: { id: true },
  });
  if (!session) return false;

  await prisma.chatMessage.deleteMany({ where: { sessionId } });
  await prisma.chatSession.delete({ where: { id: sessionId } });
  return true;
}

function createBigVArticleId(authorName: string, title: string, publishedAt: Date) {
  const base = `${authorName}-${title}-${publishedAt.toISOString()}`;
  return `bigv-${createHash("sha1").update(base).digest("hex").slice(0, 20)}`;
}

function createBigVAuthorId(name: string) {
  return `bigv-author-${createHash("sha1").update(name).digest("hex").slice(0, 16)}`;
}

export async function cleanupExpiredBigVArticles() {
  await ensureSeeded();
  await prisma.bigVArticle.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
}

export async function importBigVArticles(articles: BigVArticleInput[]) {
  await ensureSeeded();
  await cleanupExpiredBigVArticles();

  const results = [] as Array<{
    id: string;
    title: string;
    author: { name: string; category: string; avatar: string | null };
    summary: string;
    primaryCategory: string;
    tags: string[];
    sentiment: string;
    score: number;
    rankScore: number;
    publishedAt: Date;
  }>;

  for (const item of articles) {
    const authorName = item.authorName.trim();
    const analyzed = analyzeBigVArticle(item);
    const author = await prisma.bigVAuthor.upsert({
      where: { name: authorName },
      update: { category: analyzed.primaryCategory },
      create: {
        id: createBigVAuthorId(authorName),
        name: authorName,
        slug: authorName,
        category: analyzed.primaryCategory,
        avatar: "🧠",
      },
    });

    const article = await prisma.bigVArticle.upsert({
      where: { id: createBigVArticleId(authorName, item.title, analyzed.publishedAt) },
      update: {
        title: item.title.trim(),
        content: item.content.trim(),
        images: item.images ?? [],
        sourceUrl: item.sourceUrl,
        summary: analyzed.summary,
        primaryCategory: analyzed.primaryCategory,
        tags: analyzed.tags,
        sentiment: analyzed.sentiment,
        score: analyzed.score,
        rankScore: analyzed.rankScore,
        publishedAt: analyzed.publishedAt,
        expiresAt: analyzed.expiresAt,
      },
      create: {
        id: createBigVArticleId(authorName, item.title, analyzed.publishedAt),
        authorId: author.id,
        title: item.title.trim(),
        content: item.content.trim(),
        images: item.images ?? [],
        sourceUrl: item.sourceUrl,
        summary: analyzed.summary,
        primaryCategory: analyzed.primaryCategory,
        tags: analyzed.tags,
        sentiment: analyzed.sentiment,
        score: analyzed.score,
        rankScore: analyzed.rankScore,
        publishedAt: analyzed.publishedAt,
        expiresAt: analyzed.expiresAt,
      },
      select: {
        id: true,
        title: true,
        summary: true,
        primaryCategory: true,
        tags: true,
        sentiment: true,
        score: true,
        rankScore: true,
        publishedAt: true,
        author: {
          select: { name: true, category: true, avatar: true },
        },
      },
    });

    results.push(article);
  }

  return results.sort((a, b) => b.rankScore - a.rankScore);
}

export async function getBigVArticles(params?: {
  author?: string;
  category?: string;
  tag?: string;
  keyword?: string;
  limit?: number;
}) {
  await ensureSeeded();
  await cleanupExpiredBigVArticles();

  const limit = params?.limit ?? 30;
  const keyword = params?.keyword?.trim();

  return prisma.bigVArticle.findMany({
    where: {
      ...(params?.author ? { author: { name: params.author } } : {}),
      ...(params?.category ? { primaryCategory: params.category } : {}),
      ...(params?.tag ? { tags: { has: params.tag } } : {}),
      ...(keyword
        ? {
            OR: [
              { title: { contains: keyword, mode: "insensitive" } },
              { content: { contains: keyword, mode: "insensitive" } },
              { author: { name: { contains: keyword, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    orderBy: [
      { publishedAt: "desc" },
      { rankScore: "desc" },
    ],
    take: limit,
    select: {
      id: true,
      title: true,
      content: true,
      images: true,
      sourceUrl: true,
      summary: true,
      primaryCategory: true,
      tags: true,
      sentiment: true,
      score: true,
      rankScore: true,
      publishedAt: true,
      author: {
        select: { id: true, name: true, slug: true, avatar: true, category: true, bio: true },
      },
    },
  });
}

export async function getBigVArticleById(id: string) {
  await ensureSeeded();
  await cleanupExpiredBigVArticles();

  return prisma.bigVArticle.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      content: true,
      images: true,
      sourceUrl: true,
      summary: true,
      primaryCategory: true,
      tags: true,
      sentiment: true,
      score: true,
      rankScore: true,
      publishedAt: true,
      author: {
        select: { id: true, name: true, slug: true, avatar: true, category: true, bio: true },
      },
    },
  });
}

export async function getBigVFilters() {
  await ensureSeeded();
  await cleanupExpiredBigVArticles();

  const [authors, categories, tags] = await Promise.all([
    prisma.bigVAuthor.findMany({
      orderBy: { updatedAt: "desc" },
      select: { name: true, avatar: true, category: true },
    }),
    prisma.bigVArticle.findMany({
      distinct: ["primaryCategory"],
      select: { primaryCategory: true },
      orderBy: { primaryCategory: "asc" },
    }),
    prisma.bigVArticle.findMany({
      select: { tags: true },
      orderBy: { publishedAt: "desc" },
      take: 60,
    }),
  ]);

  return {
    authors,
    categories: categories.map((item) => item.primaryCategory),
    tags: [...new Set(tags.flatMap((item) => item.tags))].slice(0, 20),
  };
}
