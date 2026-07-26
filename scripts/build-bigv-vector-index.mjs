import { createHash } from "crypto";
import { existsSync, readFileSync } from "fs";
import { resolve } from "path";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const repoRoot = process.cwd();

function loadEnvFile(file) {
  const fullPath = resolve(repoRoot, file);
  if (!existsSync(fullPath)) return;

  const lines = readFileSync(fullPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const index = trimmed.indexOf("=");
    const key = trimmed.slice(0, index).trim();
    const rawValue = trimmed.slice(index + 1).trim();
    if (!key || process.env[key]) continue;
    process.env[key] = rawValue.replace(/^['"]|['"]$/g, "");
  }
}

loadEnvFile(".env.local");
loadEnvFile(".env");

function parseArgs() {
  const args = new Map();
  for (const item of process.argv.slice(2)) {
    if (!item.startsWith("--")) continue;
    const [key, value] = item.slice(2).split("=");
    args.set(key, value ?? "true");
  }
  return {
    limit: Number(args.get("limit") || 500),
    sinceDays: Number(args.get("since-days") || 120),
    batchSize: Number(args.get("batch-size") || 16),
    recreate: args.get("recreate") === "true",
    dryRun: args.get("dry-run") === "true",
  };
}

const options = parseArgs();
const collection = process.env.QDRANT_COLLECTION || "bigv_articles";
const qdrantUrl = (process.env.QDRANT_URL || "").replace(/\/$/, "");
const qdrantApiKey = process.env.QDRANT_API_KEY || "";
const embeddingBaseUrl = (process.env.EMBEDDING_BASE_URL || process.env.OPENAI_BASE_URL || "https://api.siliconflow.cn/v1").replace(/\/$/, "");
const embeddingApiKey = process.env.EMBEDDING_API_KEY || process.env.OPENAI_API_KEY || "";
const embeddingModel = process.env.EMBEDDING_MODEL || "BAAI/bge-m3";
const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL || "";

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not configured");
}
if (!qdrantUrl && !options.dryRun) {
  throw new Error("QDRANT_URL is not configured");
}
if (!embeddingApiKey && !options.dryRun) {
  throw new Error("EMBEDDING_API_KEY or OPENAI_API_KEY is not configured");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});

function qdrantHeaders() {
  return {
    "Content-Type": "application/json",
    ...(qdrantApiKey ? { "api-key": qdrantApiKey } : {}),
  };
}

async function qdrantFetch(path, init = {}) {
  const response = await fetch(`${qdrantUrl}${path}`, {
    ...init,
    headers: {
      ...qdrantHeaders(),
      ...(init.headers || {}),
    },
  });

  const text = await response.text();
  const json = text ? JSON.parse(text) : {};
  if (!response.ok) {
    throw new Error(`Qdrant ${response.status}: ${text}`);
  }
  return json;
}

function stableUuid(input) {
  const hash = createHash("sha1").update(input).digest("hex").slice(0, 32);
  const version = `4${hash.slice(13, 16)}`;
  const variant = `${((Number.parseInt(hash[16], 16) & 0x3) | 0x8).toString(16)}${hash.slice(17, 20)}`;
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${version}-${variant}-${hash.slice(20, 32)}`;
}

function chunkArticle(article) {
  const baseText = [
    article.title,
    article.summary,
    article.content,
  ].filter(Boolean).join("\n\n").replace(/\s+/g, " ").trim();

  if (!baseText) return [];

  const chunks = [];
  const maxLength = 1200;
  const overlap = 180;
  for (let start = 0; start < baseText.length; start += maxLength - overlap) {
    const text = baseText.slice(start, start + maxLength).trim();
    if (text.length < 40) continue;
    chunks.push({
      id: stableUuid(`${article.id}:${chunks.length}`),
      articleId: article.id,
      chunkIndex: chunks.length,
      text,
      author: article.author.name,
      title: article.title,
      summary: article.summary,
      category: article.primaryCategory,
      tags: article.tags,
      sentiment: article.sentiment,
      sourceUrl: article.sourceUrl,
      publishedAt: article.publishedAt.toISOString(),
      publishedAtMs: article.publishedAt.getTime(),
    });
  }

  return chunks;
}

async function embedBatch(texts) {
  const response = await fetch(`${embeddingBaseUrl}/embeddings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${embeddingApiKey}`,
    },
    body: JSON.stringify({
      model: embeddingModel,
      input: texts,
    }),
  });

  const json = await response.json();
  const embeddings = json?.data?.map((item) => item.embedding);
  if (!response.ok || !Array.isArray(embeddings) || embeddings.length !== texts.length) {
    throw new Error(json?.error?.message || json?.message || "embedding request failed");
  }
  return embeddings;
}

async function ensureCollection(vectorSize) {
  if (options.recreate) {
    await qdrantFetch(`/collections/${encodeURIComponent(collection)}`, { method: "DELETE" }).catch(() => {});
  }

  const existing = await qdrantFetch(`/collections/${encodeURIComponent(collection)}`).catch(() => null);
  const existingSize = existing?.result?.config?.params?.vectors?.size;
  if (existingSize) {
    if (existingSize !== vectorSize) {
      throw new Error(`Qdrant collection vector size is ${existingSize}, expected ${vectorSize}. Run with --recreate=true to rebuild.`);
    }
    return;
  }

  await qdrantFetch(`/collections/${encodeURIComponent(collection)}`, {
    method: "PUT",
    body: JSON.stringify({
      vectors: {
        size: vectorSize,
        distance: "Cosine",
      },
    }),
  });

  await qdrantFetch(`/collections/${encodeURIComponent(collection)}/index`, {
    method: "PUT",
    body: JSON.stringify({
      field_name: "publishedAtMs",
      field_schema: "integer",
    }),
  }).catch((error) => {
    console.warn(`[bigv-vector] create payload index skipped: ${error.message}`);
  });
}

async function loadArticles() {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - options.sinceDays);

  return prisma.bigVArticle.findMany({
    where: { publishedAt: { gte: cutoff } },
    orderBy: [{ publishedAt: "desc" }, { rankScore: "desc" }],
    take: options.limit,
    include: {
      author: {
        select: { name: true },
      },
    },
  });
}

async function main() {
  const articles = await loadArticles();
  const chunks = articles.flatMap(chunkArticle);
  console.log(`[bigv-vector] articles=${articles.length}, chunks=${chunks.length}, model=${embeddingModel}, collection=${collection}`);

  if (options.dryRun) {
    console.log("[bigv-vector] dry-run enabled, no embeddings or Qdrant writes");
    return;
  }
  if (!chunks.length) {
    return;
  }

  let written = 0;
  for (let index = 0; index < chunks.length; index += options.batchSize) {
    const batch = chunks.slice(index, index + options.batchSize);
    const embeddings = await embedBatch(batch.map((item) => item.text));
    if (index === 0) {
      await ensureCollection(embeddings[0].length);
    }

    await qdrantFetch(`/collections/${encodeURIComponent(collection)}/points?wait=true`, {
      method: "PUT",
      body: JSON.stringify({
        points: batch.map((chunk, chunkIndex) => ({
          id: chunk.id,
          vector: embeddings[chunkIndex],
          payload: chunk,
        })),
      }),
    });

    written += batch.length;
    console.log(`[bigv-vector] upserted ${written}/${chunks.length}`);
  }
}

main()
  .catch((error) => {
    console.error("[bigv-vector] failed:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect().catch(() => {});
  });
