import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getBigVArticles: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  getBigVArticles: mocks.getBigVArticles,
}));

import {
  buildBigVKnowledgeContext,
  searchBigVKnowledge,
  shouldInjectBigVKnowledge,
} from "./vector-search";

interface MockRoute {
  ok?: boolean;
  status?: number;
  body: unknown;
}

type FetchLike = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>;

/** 按 URL 路由的 fetch mock：/embeddings 与 /points/search 各自返回配置的响应 */
function installFetch(routes: { embedding?: MockRoute; qdrant?: MockRoute }) {
  const fetchMock = vi.fn<FetchLike>(async (input) => {
    const url = String(input);
    const route = url.includes("/embeddings")
      ? routes.embedding
      : url.includes("/points/search")
        ? routes.qdrant
        : undefined;
    if (!route) throw new Error(`unexpected fetch: ${url}`);
    return {
      ok: route.ok ?? true,
      status: route.status ?? 200,
      json: async () => route.body,
    };
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function qdrantHit(overrides: { id?: string; score?: number; payload?: Record<string, unknown> } = {}) {
  return {
    id: overrides.id ?? "point-1",
    score: overrides.score ?? 0.8,
    payload: {
      articleId: "a1",
      chunkIndex: 0,
      author: "但斌",
      title: "白酒板块观点",
      summary: "看好白酒长期价值",
      text: "白酒板块正文内容",
      category: "白酒",
      tags: ["白酒", "消费"],
      sentiment: "bullish",
      sourceUrl: "https://example.com/a1",
      publishedAt: "2026-07-27T02:00:00.000Z",
      publishedAtMs: new Date("2026-07-27T02:00:00.000Z").getTime(),
      ...overrides.payload,
    },
  };
}

const EMBEDDING_OK: MockRoute = { body: { data: [{ embedding: [0.1, 0.2, 0.3] }] } };

beforeEach(() => {
  vi.stubEnv("EMBEDDING_API_KEY", "test-embed-key");
  vi.stubEnv("EMBEDDING_BASE_URL", "https://embed.test/v1");
  vi.stubEnv("QDRANT_URL", "https://qdrant.test");
  vi.stubEnv("QDRANT_API_KEY", "test-qdrant-key");
  vi.stubEnv("QDRANT_COLLECTION", "bigv_articles");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("shouldInjectBigVKnowledge", () => {
  it("matches queries mentioning 大V/老师/市场类关键词", () => {
    expect(shouldInjectBigVKnowledge("但斌老师今天怎么看")).toBe(true);
    expect(shouldInjectBigVKnowledge("明天大盘会怎么走")).toBe(true);
    expect(shouldInjectBigVKnowledge("最新市场情绪如何")).toBe(true);
  });

  it("does not match plain quote queries", () => {
    expect(shouldInjectBigVKnowledge("帮我查茅台股价")).toBe(false);
    expect(shouldInjectBigVKnowledge("600519")).toBe(false);
  });
});

describe("searchBigVKnowledge", () => {
  it("returns [] for blank query without any network call", async () => {
    const fetchMock = installFetch({});

    const result = await searchBigVKnowledge("   ");

    expect(result).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("embeds query then searches qdrant with score threshold and time filter", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-28T12:00:00+08:00"));
    const fetchMock = installFetch({
      embedding: EMBEDDING_OK,
      qdrant: { body: { result: [qdrantHit()] } },
    });

    const result = await searchBigVKnowledge("但斌观点", { recentDays: 10, limit: 5 });

    const [embedUrl, embedInit] = fetchMock.mock.calls[0];
    expect(String(embedUrl)).toBe("https://embed.test/v1/embeddings");
    expect(JSON.parse(String(embedInit?.body))).toMatchObject({
      model: "BAAI/bge-m3",
      input: "但斌观点",
    });
    expect((embedInit?.headers as Record<string, string>).Authorization).toBe("Bearer test-embed-key");

    const [qdrantUrl, qdrantInit] = fetchMock.mock.calls[1];
    expect(String(qdrantUrl)).toBe("https://qdrant.test/collections/bigv_articles/points/search");
    const body = JSON.parse(String(qdrantInit?.body));
    expect(body).toMatchObject({ vector: [0.1, 0.2, 0.3], limit: 5, score_threshold: 0.15 });
    const cutoff = new Date("2026-07-28T12:00:00+08:00");
    cutoff.setDate(cutoff.getDate() - 10);
    expect(body.filter.must[0].range.gte).toBe(cutoff.getTime());

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ articleId: "a1", author: "但斌", score: 0.8 });
  });

  it("uses tighter time window for 今天/最新 style queries", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-28T12:00:00+08:00"));
    const fetchMock = installFetch({
      embedding: EMBEDDING_OK,
      qdrant: { body: { result: [] } },
    });

    await searchBigVKnowledge("今天市场怎么办");

    const body = JSON.parse(String(fetchMock.mock.calls[1][1]?.body));
    const cutoff = new Date("2026-07-28T12:00:00+08:00");
    cutoff.setDate(cutoff.getDate() - 10);
    expect(body.filter.must[0].range.gte).toBe(cutoff.getTime());
  });

  it("dedupes chunks by articleId keeping highest score and sorts by recency", async () => {
    const older = new Date("2026-07-25T00:00:00Z").getTime();
    const newer = new Date("2026-07-27T00:00:00Z").getTime();
    installFetch({
      embedding: EMBEDDING_OK,
      qdrant: {
        body: {
          result: [
            qdrantHit({ id: "p1", score: 0.6, payload: { articleId: "a1", chunkIndex: 0, publishedAtMs: older } }),
            qdrantHit({ id: "p2", score: 0.9, payload: { articleId: "a1", chunkIndex: 2, publishedAtMs: older } }),
            qdrantHit({ id: "p3", score: 0.5, payload: { articleId: "a2", publishedAtMs: newer } }),
            // 缺 articleId 的脏数据应被丢弃
            qdrantHit({ id: "p4", score: 0.99, payload: { articleId: "", publishedAtMs: newer } }),
          ],
        },
      },
    });

    const result = await searchBigVKnowledge("市场观点");

    expect(result.map((hit) => hit.articleId)).toEqual(["a2", "a1"]);
    expect(result.find((hit) => hit.articleId === "a1")?.score).toBe(0.9);
  });

  it("returns [] when qdrant is not configured", async () => {
    vi.stubEnv("QDRANT_URL", "");
    const fetchMock = installFetch({ embedding: EMBEDDING_OK });

    const result = await searchBigVKnowledge("大盘怎么办");

    expect(result).toEqual([]);
    // 只调了 embedding，没有 qdrant 请求，也没有走 postgres 降级
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(mocks.getBigVArticles).not.toHaveBeenCalled();
  });

  it("falls back to postgres keyword search when embedding is not configured", async () => {
    vi.stubEnv("EMBEDDING_API_KEY", "");
    vi.stubEnv("OPENAI_API_KEY", "");
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    installFetch({});
    mocks.getBigVArticles.mockResolvedValueOnce([
      {
        id: "article-1",
        rankScore: 3,
        author: { name: "小蓝" },
        title: "军工热点",
        summary: "军工板块催化",
        content: "正文".repeat(1000),
        primaryCategory: "军工",
        tags: ["军工"],
        sentiment: "bullish",
        sourceUrl: null,
        publishedAt: new Date("2026-07-20T00:00:00Z"),
      },
    ]);

    const result = await searchBigVKnowledge("军工怎么看", { limit: 6 });

    expect(mocks.getBigVArticles).toHaveBeenCalledWith({ keyword: "军工怎么看", limit: 6 });
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      articleId: "article-1",
      author: "小蓝",
      score: 3,
      category: "军工",
      sourceUrl: undefined,
    });
    // 正文截断到 900 字符
    expect(result[0].text).toHaveLength(900);
    expect(consoleSpy).toHaveBeenCalled();
  });

  it("falls back when qdrant responds with an error status", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    installFetch({
      embedding: EMBEDDING_OK,
      qdrant: { ok: false, status: 500, body: {} },
    });
    mocks.getBigVArticles.mockResolvedValueOnce([]);

    const result = await searchBigVKnowledge("今日板块情绪");

    expect(mocks.getBigVArticles).toHaveBeenCalledWith({ keyword: "今日板块情绪", limit: 6 });
    expect(result).toEqual([]);
    expect(consoleSpy).toHaveBeenCalled();
  });
});

describe("buildBigVKnowledgeContext", () => {
  it("returns empty string when query does not need knowledge injection", async () => {
    const fetchMock = installFetch({});

    await expect(buildBigVKnowledgeContext("帮我查茅台股价")).resolves.toBe("");

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns empty string when there are no hits", async () => {
    installFetch({ embedding: EMBEDDING_OK, qdrant: { body: { result: [] } } });

    await expect(buildBigVKnowledgeContext("明天大盘怎么走")).resolves.toBe("");
  });

  it("builds a dated context block from hits", async () => {
    installFetch({
      embedding: EMBEDDING_OK,
      qdrant: { body: { result: [qdrantHit()] } },
    });

    const context = await buildBigVKnowledgeContext("老师们最新观点");

    expect(context).toContain("【BigV 向量知识库上下文】");
    expect(context).toContain("最新收录观点日期为 2026/07/27");
    expect(context).toContain("1. 2026/07/27｜但斌｜白酒板块观点｜情绪：bullish");
    expect(context).toContain("标签：白酒、消费");
    expect(context).toContain("来源：https://example.com/a1");
  });
});
