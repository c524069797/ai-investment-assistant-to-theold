import { getBigVArticles } from "@/lib/db";

interface EmbeddingResponse {
  data?: Array<{ embedding?: number[] }>;
  error?: { message?: string };
  message?: string;
}

interface QdrantSearchResponse {
  result?: Array<{
    id: string | number;
    score: number;
    payload?: Record<string, unknown>;
  }>;
  status?: string;
  result_count?: number;
}

export interface BigVKnowledgeHit {
  id: string;
  score: number;
  articleId: string;
  chunkIndex: number;
  author: string;
  title: string;
  summary: string;
  text: string;
  category: string;
  tags: string[];
  sentiment: string;
  sourceUrl?: string;
  publishedAt: string;
  publishedAtMs: number;
}

function normalizeBaseUrl(url?: string) {
  return (url || "https://api.siliconflow.cn/v1").replace(/\/$/, "");
}

function getEmbeddingConfig() {
  return {
    apiKey: process.env.EMBEDDING_API_KEY || process.env.OPENAI_API_KEY || "",
    baseUrl: normalizeBaseUrl(process.env.EMBEDDING_BASE_URL || process.env.OPENAI_BASE_URL),
    model: process.env.EMBEDDING_MODEL || "BAAI/bge-m3",
  };
}

function getQdrantConfig() {
  return {
    url: (process.env.QDRANT_URL || "").replace(/\/$/, ""),
    apiKey: process.env.QDRANT_API_KEY || "",
    collection: process.env.QDRANT_COLLECTION || "bigv_articles",
  };
}

async function withTimeout<T>(promise: Promise<T>, ms: number, message: string) {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

async function embedQuery(query: string) {
  const config = getEmbeddingConfig();
  if (!config.apiKey) {
    throw new Error("EMBEDDING_API_KEY or OPENAI_API_KEY is not configured");
  }

  const response = await withTimeout(
    fetch(`${config.baseUrl}/embeddings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        input: query,
      }),
    }),
    12000,
    "embedding request timeout",
  );

  const json = await response.json() as EmbeddingResponse;
  const embedding = json.data?.[0]?.embedding;
  if (!response.ok || !embedding?.length) {
    throw new Error(json.error?.message || json.message || "embedding request failed");
  }

  return embedding;
}

async function qdrantSearch(vector: number[], options?: { limit?: number; recentDays?: number }) {
  const config = getQdrantConfig();
  if (!config.url) {
    return [];
  }

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - (options?.recentDays ?? 14));

  const response = await withTimeout(
    fetch(`${config.url}/collections/${encodeURIComponent(config.collection)}/points/search`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(config.apiKey ? { "api-key": config.apiKey } : {}),
      },
      body: JSON.stringify({
        vector,
        limit: options?.limit ?? 8,
        with_payload: true,
        score_threshold: 0.15,
        filter: {
          must: [
            {
              key: "publishedAtMs",
              range: { gte: cutoff.getTime() },
            },
          ],
        },
      }),
    }),
    12000,
    "qdrant search timeout",
  );

  const json = await response.json() as QdrantSearchResponse;
  if (!response.ok) {
    throw new Error(`qdrant search failed: ${response.status}`);
  }

  return json.result ?? [];
}

function asString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function asNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function asStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function normalizeHit(hit: Awaited<ReturnType<typeof qdrantSearch>>[number]): BigVKnowledgeHit {
  const payload = hit.payload ?? {};
  return {
    id: String(hit.id),
    score: hit.score,
    articleId: asString(payload.articleId),
    chunkIndex: asNumber(payload.chunkIndex),
    author: asString(payload.author),
    title: asString(payload.title),
    summary: asString(payload.summary),
    text: asString(payload.text),
    category: asString(payload.category),
    tags: asStringArray(payload.tags),
    sentiment: asString(payload.sentiment),
    sourceUrl: asString(payload.sourceUrl) || undefined,
    publishedAt: asString(payload.publishedAt),
    publishedAtMs: asNumber(payload.publishedAtMs),
  };
}

function formatChinaDate(date: Date) {
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function detectRecentDays(query: string) {
  if (/(今天|今日|明天|明日|最新|刚刚|现在|短线|怎么办)/.test(query)) {
    return 10;
  }
  if (/(本周|这周|最近|近期)/.test(query)) {
    return 21;
  }
  return 90;
}

export function shouldInjectBigVKnowledge(query: string) {
  return /(大V|老师|观点|知识库|小蓝|咨询|明天|明日|怎么办|最新|今日|今天|市场|大盘|板块|情绪)/.test(query);
}

export async function searchBigVKnowledge(query: string, options?: { limit?: number; recentDays?: number }) {
  if (!query.trim()) {
    return [];
  }

  try {
    const vector = await embedQuery(query);
    const hits = await qdrantSearch(vector, {
      limit: options?.limit ?? 8,
      recentDays: options?.recentDays ?? detectRecentDays(query),
    });

    const uniqueHits = new Map<string, BigVKnowledgeHit>();
    for (const hit of hits
      .map(normalizeHit)
      .filter((hit) => hit.articleId && hit.publishedAtMs)
      .sort((a, b) => b.publishedAtMs - a.publishedAtMs || b.score - a.score)) {
      const existing = uniqueHits.get(hit.articleId);
      if (!existing || hit.score > existing.score) {
        uniqueHits.set(hit.articleId, hit);
      }
    }

    return [...uniqueHits.values()].slice(0, options?.limit ?? 8);
  } catch (error) {
    console.error("[bigv-vector] vector search failed, fallback to postgres keyword search", error);
    const articles = await getBigVArticles({ keyword: query, limit: options?.limit ?? 6 });
    return articles.map((article) => ({
      id: article.id,
      score: Number(article.rankScore ?? 0),
      articleId: article.id,
      chunkIndex: 0,
      author: article.author.name,
      title: article.title,
      summary: article.summary,
      text: article.content.slice(0, 900),
      category: article.primaryCategory,
      tags: article.tags,
      sentiment: article.sentiment,
      sourceUrl: article.sourceUrl ?? undefined,
      publishedAt: article.publishedAt.toISOString(),
      publishedAtMs: article.publishedAt.getTime(),
    }));
  }
}

export async function buildBigVKnowledgeContext(query: string) {
  if (!shouldInjectBigVKnowledge(query)) {
    return "";
  }

  const hits = await searchBigVKnowledge(query, {
    limit: 8,
    recentDays: detectRecentDays(query),
  });

  if (!hits.length) {
    return "";
  }

  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const latestDate = formatChinaDate(new Date(Math.max(...hits.map((hit) => hit.publishedAtMs))));

  const lines = hits.slice(0, 8).map((hit, index) => {
    const publishedAt = formatChinaDate(new Date(hit.publishedAtMs));
    const tags = hit.tags.length ? `；标签：${hit.tags.join("、")}` : "";
    const source = hit.sourceUrl ? `；来源：${hit.sourceUrl}` : "";
    const body = (hit.summary || hit.text).replace(/\s+/g, " ").slice(0, 360);
    return `${index + 1}. ${publishedAt}｜${hit.author}｜${hit.title}｜情绪：${hit.sentiment || "neutral"}｜${body}${tags}${source}`;
  });

  return [
    "【BigV 向量知识库上下文】",
    `系统当前日期（Asia/Shanghai）：${formatChinaDate(now)}；用户提到“明天”时，按 ${formatChinaDate(tomorrow)} 理解。`,
    `以下观点是按相关性和发布时间从知识库检索得到，最新收录观点日期为 ${latestDate}。回答必须对比发布时间，不能把旧观点说成今天或明天的观点。`,
    "如果观点不是当天发布，要明确说“这是 YYYY-MM-DD 的观点”；如果知识库没有覆盖当天最新观点，要说明数据时效限制。",
    lines.join("\n"),
  ].join("\n");
}
