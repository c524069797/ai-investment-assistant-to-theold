import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  searchStocks: vi.fn(),
}));

vi.mock("@/lib/api/eastmoney", () => ({
  searchStocks: mocks.searchStocks,
}));

import { stockNewsTool } from "./stock-news";

interface NewsArticle {
  title: string;
  date: string;
  mediaName?: string;
  url?: string;
}

function searchApiBody(articles: NewsArticle[]) {
  return JSON.stringify({ result: { cmsArticleWebOld: articles } });
}

/**
 * 按 URL 路由的 fetch mock：
 * - search-api + 股票代码 → 个股新闻
 * - search-api + 编码后的股票名 → 财经头条
 * - guba → 股吧降级源
 */
function installFetch(routes: {
  stockNews?: { text: string } | { reject: true };
  headlines?: { text: string } | { reject: true };
  guba?: { json: unknown } | { reject: true };
  code: string;
  name: string;
}) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("guba.eastmoney.com")) {
      if (!routes.guba || "reject" in routes.guba) throw new Error("guba failed");
      const body = routes.guba.json;
      return { ok: true, status: 200, json: async () => body };
    }
    if (url.includes("search-api-web")) {
      const route = url.includes(routes.code) ? routes.stockNews : routes.headlines;
      if (!route || "reject" in route) throw new Error("search api failed");
      const text = route.text;
      return { ok: true, status: 200, text: async () => text };
    }
    throw new Error(`unexpected fetch: ${url}`);
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

async function runTool(query: string) {
  return (stockNewsTool.execute as NonNullable<typeof stockNewsTool.execute>)(
    { query },
    {} as never,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("src/mastra/tools/stock-news.ts", () => {
  it("returns error when name search has no match", async () => {
    mocks.searchStocks.mockResolvedValueOnce([]);

    const result = await runTool("不存在股票");

    expect(result).toEqual({ error: true, message: '未找到与"不存在股票"相关的股票' });
  });

  it("merges news from both sources, strips html and dedupes by title", async () => {
    mocks.searchStocks.mockResolvedValueOnce([{ code: "600519", name: "贵州茅台", market: 1 }]);
    installFetch({
      code: "600519",
      name: "贵州茅台",
      stockNews: {
        // JSONP 包裹形式
        text: `cb(${searchApiBody([
          { title: "<em>贵州茅台</em>发布年报", date: "2026-07-27", mediaName: "证券时报", url: "https://n1" },
          { title: "白酒板块走强", date: "2026-07-26", mediaName: "财联社", url: "https://n2" },
        ])});`,
      },
      headlines: {
        // 纯 JSON 形式；首条与个股新闻标题重复，应被去重
        text: searchApiBody([
          { title: "白酒板块走强", date: "2026-07-26", mediaName: "财联社" },
          { title: "茅台批价企稳", date: "2026-07-25", mediaName: "每经" },
        ]),
      },
    });

    const result = await runTool("600519");

    expect(result).toMatchObject({
      error: false,
      code: "600519",
      name: "贵州茅台",
      newsCount: 3,
    });
    const news = (result as { news: Array<{ index: number; title: string; source: string }> }).news;
    expect(news.map((n) => n.title)).toEqual(["贵州茅台发布年报", "白酒板块走强", "茅台批价企稳"]);
    expect(news[0]).toMatchObject({ index: 1, source: "证券时报" });
  });

  it("falls back to guba forum when news api fails, filtering ads", async () => {
    mocks.searchStocks.mockResolvedValueOnce([{ code: "600519", name: "贵州茅台", market: 1 }]);
    installFetch({
      code: "600519",
      name: "贵州茅台",
      stockNews: { reject: true },
      headlines: { reject: true },
      guba: {
        json: {
          re: [
            { post_title: "茅台三季度业绩讨论", post_publish_time: "2026-07-27 09:00", post_user: { nick_name: "老韭菜" }, post_url: "/news,600519,1.html" },
            { post_title: "广告：开户优惠", post_publish_time: "2026-07-27 08:00" },
          ],
        },
      },
    });

    const result = await runTool("600519");

    expect(result).toMatchObject({ error: false, newsCount: 1 });
    const news = (result as { news: Array<{ title: string; source: string }> }).news;
    expect(news).toEqual([
      { index: 1, title: "茅台三季度业绩讨论", date: "2026-07-27 09:00", source: "老韭菜" },
    ]);
  });

  it("returns friendly message when no news found anywhere", async () => {
    mocks.searchStocks.mockResolvedValueOnce([{ code: "000002", name: "万科A", market: 0 }]);
    installFetch({
      code: "000002",
      name: "万科A",
      stockNews: { text: searchApiBody([]) },
      headlines: { text: searchApiBody([]) },
    });

    const result = await runTool("万科A");

    expect(result).toMatchObject({
      error: false,
      code: "000002",
      name: "万科A",
      news: [],
      message: "暂未获取到 万科A(000002) 的相关新闻",
    });
  });
});
