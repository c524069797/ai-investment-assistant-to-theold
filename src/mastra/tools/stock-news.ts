import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { searchStocks } from "@/lib/api/eastmoney";

/** Fetch stock news from EastMoney */
async function fetchStockNews(
  code: string,
  pageSize = 8,
): Promise<Array<{ title: string; date: string; source: string; url: string }>> {
  // EastMoney news API for individual stocks
  const url = `https://search-api-web.eastmoney.com/search/jsonp?cb=&param=%7B%22uid%22%3A%22%22%2C%22keyword%22%3A%22${code}%22%2C%22type%22%3A%5B%22cmsArticleWebOld%22%5D%2C%22client%22%3A%22web%22%2C%22clientType%22%3A%22web%22%2C%22clientVersion%22%3A%22curr%22%2C%22param%22%3A%7B%22cmsArticleWebOld%22%3A%7B%22searchScope%22%3A%22default%22%2C%22sort%22%3A%22default%22%2C%22pageIndex%22%3A1%2C%22pageSize%22%3A${pageSize}%2C%22preTag%22%3A%22%22%2C%22postTag%22%3A%22%22%7D%7D%7D`;

  try {
    const res = await fetch(url, {
      headers: {
        Referer: "https://so.eastmoney.com/",
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      next: { revalidate: 300 },
    });
    const text = await res.text();
    // Parse JSONP-like response (may come with or without callback wrapper)
    const jsonStr = text.replace(/^[^(]*\(/, "").replace(/\);?\s*$/, "");
    if (!jsonStr || jsonStr === text) {
      // Try parsing as pure JSON
      const json = JSON.parse(text);
      return extractNewsFromResult(json);
    }
    const json = JSON.parse(jsonStr);
    return extractNewsFromResult(json);
  } catch {
    // Fallback: try EastMoney guba (stock forum) API
    return fetchGubaNews(code, pageSize);
  }
}

function extractNewsFromResult(
  json: Record<string, unknown>,
): Array<{ title: string; date: string; source: string; url: string }> {
  const articles =
    (json as { result?: { cmsArticleWebOld?: Array<Record<string, string>> } })
      ?.result?.cmsArticleWebOld ?? [];
  return articles.slice(0, 8).map((a) => ({
    title: (a.title ?? "").replace(/<[^>]+>/g, ""),
    date: a.date ?? a.showTime ?? "",
    source: a.mediaName ?? a.source ?? "东方财富",
    url: a.url ?? a.articleUrl ?? "",
  }));
}

/** Fallback: fetch from EastMoney Guba (stock forum) */
async function fetchGubaNews(
  code: string,
  pageSize: number,
): Promise<Array<{ title: string; date: string; source: string; url: string }>> {
  const url = `https://guba.eastmoney.com/interface/GetData.aspx?param={"code":"${code}","count":${pageSize},"type":"0"}&path=guba/list&_=${Date.now()}`;

  try {
    const res = await fetch(url, {
      headers: {
        Referer: `https://guba.eastmoney.com/list,${code}.html`,
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      },
      next: { revalidate: 300 },
    });
    const json = await res.json();
    const list = (json as { re?: Array<Record<string, unknown>> })?.re ?? [];

    return list
      .filter(
        (item) =>
          item.post_title &&
          !(item.post_title as string).includes("广告") &&
          !(item.post_title as string).includes("推荐"),
      )
      .slice(0, pageSize)
      .map((item) => ({
        title: (item.post_title as string) ?? "",
        date: (item.post_publish_time as string) ?? (item.post_last_time as string) ?? "",
        source: (item.post_user as Record<string, string> | undefined)?.nick_name ?? "股吧",
        url: `https://guba.eastmoney.com${(item.post_url as string) ?? ""}`,
      }));
  } catch {
    return [];
  }
}

/** Fetch financial news headlines from EastMoney finance page */
async function fetchFinanceHeadlines(
  stockName: string,
  pageSize = 5,
): Promise<Array<{ title: string; date: string; source: string }>> {
  // Use EastMoney search with stock name for broader news coverage
  const url = `https://search-api-web.eastmoney.com/search/jsonp?cb=&param=%7B%22uid%22%3A%22%22%2C%22keyword%22%3A%22${encodeURIComponent(stockName)}%22%2C%22type%22%3A%5B%22cmsArticleWebOld%22%5D%2C%22client%22%3A%22web%22%2C%22clientType%22%3A%22web%22%2C%22clientVersion%22%3A%22curr%22%2C%22param%22%3A%7B%22cmsArticleWebOld%22%3A%7B%22searchScope%22%3A%22default%22%2C%22sort%22%3A%22default%22%2C%22pageIndex%22%3A1%2C%22pageSize%22%3A${pageSize}%2C%22preTag%22%3A%22%22%2C%22postTag%22%3A%22%22%7D%7D%7D`;

  try {
    const res = await fetch(url, {
      headers: {
        Referer: "https://so.eastmoney.com/",
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      },
      next: { revalidate: 300 },
    });
    const text = await res.text();
    const jsonStr = text.replace(/^[^(]*\(/, "").replace(/\);?\s*$/, "");
    const json = jsonStr !== text ? JSON.parse(jsonStr) : JSON.parse(text);
    return extractNewsFromResult(json).map((n) => ({
      title: n.title,
      date: n.date,
      source: n.source,
    }));
  } catch {
    return [];
  }
}

export const stockNewsTool = createTool({
  id: "stock-news",
  description:
    "获取个股相关新闻资讯。当用户询问某只股票时，配合 stockAnalyzer 一起调用，提供最新的新闻面信息，帮助用户综合判断。",
  inputSchema: z.object({
    query: z
      .string()
      .describe("股票代码或名称，例如 '600519' 或 '贵州茅台'"),
  }),
  execute: async ({ query }) => {
    // Resolve stock code and name
    const isCode = /^\d{6}$/.test(query);
    let code: string;
    let stockName: string;

    if (isCode) {
      code = query;
      stockName = query;
      // Try to get actual name
      const results = await searchStocks(query);
      if (results.length > 0) {
        stockName = results[0].name;
      }
    } else {
      const results = await searchStocks(query);
      if (results.length === 0) {
        return { error: true, message: `未找到与"${query}"相关的股票` };
      }
      code = results[0].code;
      stockName = results[0].name;
    }

    // Fetch news from multiple sources in parallel
    const [stockNews, headlines] = await Promise.all([
      fetchStockNews(code, 8),
      fetchFinanceHeadlines(stockName, 5),
    ]);

    // Merge and deduplicate
    const allNews = [...stockNews];
    for (const h of headlines) {
      if (!allNews.some((n) => n.title === h.title)) {
        allNews.push({ ...h, url: "" });
      }
    }

    if (allNews.length === 0) {
      return {
        error: false,
        code,
        name: stockName,
        news: [],
        message: `暂未获取到 ${stockName}(${code}) 的相关新闻`,
      };
    }

    return {
      error: false,
      code,
      name: stockName,
      newsCount: allNews.length,
      news: allNews.slice(0, 10).map((n, i) => ({
        index: i + 1,
        title: n.title,
        date: n.date,
        source: n.source,
      })),
      note: "以上新闻来自公开渠道，请注意甄别信息真伪，结合多方来源综合判断",
    };
  },
});
