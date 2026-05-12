export interface GlobalMarketQuote {
  symbol: string;
  name: string;
  region: string;
  price: number;
  changePercent: number;
}

export interface FinanceHeadline {
  title: string;
  source: string;
  url: string;
  publishedAt: string;
}

export interface GlobalMarketIntelligence {
  targetDate: string;
  generatedAt: string;
  quotes: GlobalMarketQuote[];
  headlines: FinanceHeadline[];
}

export interface DailyMarketBriefing {
  id: string;
  targetDate: string;
  generatedAt: string;
  status: "agent_generated" | "fallback";
  agents: Array<{ id: string; name: string; responsibility: string; status: "completed" | "fallback" }>;
  executiveSummary: string;
  marketPulse: string[];
  riskLevel: "low" | "medium" | "high";
  watchItems: string[];
  headlines: FinanceHeadline[];
  quotes: GlobalMarketQuote[];
  disclosure: string;
}

const GLOBAL_SYMBOLS = [
  { symbol: "^GSPC", name: "标普500", region: "美国" },
  { symbol: "^IXIC", name: "纳斯达克", region: "美国" },
  { symbol: "^DJI", name: "道琼斯", region: "美国" },
  { symbol: "^FTSE", name: "英国富时100", region: "欧洲" },
  { symbol: "^GDAXI", name: "德国DAX", region: "欧洲" },
  { symbol: "^N225", name: "日经225", region: "亚太" },
  { symbol: "^HSI", name: "恒生指数", region: "港股" },
  { symbol: "000001.SS", name: "上证指数", region: "中国A股" },
] as const;

function getPreviousMarketDate(now = new Date()) {
  const date = new Date(now);
  date.setDate(date.getDate() - 1);

  while (date.getDay() === 0 || date.getDay() === 6) {
    date.setDate(date.getDate() - 1);
  }

  return date.toISOString().slice(0, 10);
}

function stripXml(value: string) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .trim();
}

function extractRssItems(xml: string, source: string): FinanceHeadline[] {
  return Array.from(xml.matchAll(/<item>([\s\S]*?)<\/item>/g))
    .slice(0, 8)
    .map((match) => {
      const item = match[1] ?? "";
      const title = stripXml(item.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? "");
      const url = stripXml(item.match(/<link>([\s\S]*?)<\/link>/)?.[1] ?? "");
      const publishedAt = stripXml(item.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] ?? "");

      return { title, source, url, publishedAt };
    })
    .filter((item) => item.title);
}

async function fetchYahooQuotes(): Promise<GlobalMarketQuote[]> {
  const symbols = GLOBAL_SYMBOLS.map((item) => item.symbol).join(",");
  const response = await fetch(`https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbols)}`, {
    headers: {
      "User-Agent": "Mozilla/5.0",
    },
    next: { revalidate: 600 },
  });

  const json = await response.json();
  const results = (json?.quoteResponse?.result ?? []) as Array<Record<string, unknown>>;

  return GLOBAL_SYMBOLS.map((target) => {
    const quote = results.find((item) => item.symbol === target.symbol);
    return {
      symbol: target.symbol,
      name: target.name,
      region: target.region,
      price: Number(quote?.regularMarketPrice ?? 0),
      changePercent: Number(quote?.regularMarketChangePercent ?? 0),
    };
  });
}

async function fetchFinanceHeadlines(): Promise<FinanceHeadline[]> {
  const feeds = [
    { source: "Yahoo Finance", url: "https://feeds.finance.yahoo.com/rss/2.0/headline?s=%5EGSPC,%5EIXIC,%5EDJI,000001.SS&region=US&lang=en-US" },
    { source: "CNBC Markets", url: "https://www.cnbc.com/id/100003114/device/rss/rss.html" },
  ];

  const settled = await Promise.allSettled(
    feeds.map(async (feed) => {
      const response = await fetch(feed.url, {
        headers: { "User-Agent": "Mozilla/5.0" },
        next: { revalidate: 900 },
      });
      const xml = await response.text();
      return extractRssItems(xml, feed.source);
    }),
  );

  const merged = settled.flatMap((item) => (item.status === "fulfilled" ? item.value : []));
  const seen = new Set<string>();

  return merged.filter((item) => {
    const key = item.title.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 10);
}

function getFallbackQuotes(): GlobalMarketQuote[] {
  return GLOBAL_SYMBOLS.map((item) => ({
    symbol: item.symbol,
    name: item.name,
    region: item.region,
    price: 0,
    changePercent: 0,
  }));
}

function getFallbackHeadlines(): FinanceHeadline[] {
  return [
    {
      title: "外部新闻源暂时不可用，系统已切换为风险观察模式",
      source: "系统状态",
      url: "",
      publishedAt: new Date().toISOString(),
    },
  ];
}

export async function collectGlobalMarketIntelligence(): Promise<GlobalMarketIntelligence> {
  const [quotesResult, headlinesResult] = await Promise.allSettled([
    fetchYahooQuotes(),
    fetchFinanceHeadlines(),
  ]);

  return {
    targetDate: getPreviousMarketDate(),
    generatedAt: new Date().toISOString(),
    quotes: quotesResult.status === "fulfilled" && quotesResult.value.length ? quotesResult.value : getFallbackQuotes(),
    headlines: headlinesResult.status === "fulfilled" && headlinesResult.value.length ? headlinesResult.value : getFallbackHeadlines(),
  };
}

function classifyRisk(quotes: GlobalMarketQuote[]): DailyMarketBriefing["riskLevel"] {
  const valid = quotes.filter((item) => item.price > 0);
  if (!valid.length) return "medium";

  const avg = valid.reduce((sum, item) => sum + item.changePercent, 0) / valid.length;
  const weakCount = valid.filter((item) => item.changePercent <= -1).length;

  if (avg <= -1 || weakCount >= 3) return "high";
  if (avg >= 0.6 && weakCount === 0) return "low";
  return "medium";
}

export function buildFallbackDailyBriefing(
  intelligence: GlobalMarketIntelligence,
  agentText = "",
): DailyMarketBriefing {
  const validQuotes = intelligence.quotes.filter((item) => item.price > 0);
  const strongest = [...validQuotes].sort((a, b) => b.changePercent - a.changePercent)[0];
  const weakest = [...validQuotes].sort((a, b) => a.changePercent - b.changePercent)[0];
  const riskLevel = classifyRisk(intelligence.quotes);
  const headlineText = intelligence.headlines.slice(0, 3).map((item) => item.title).join("；");

  return {
    id: `daily-briefing-${intelligence.targetDate}`,
    targetDate: intelligence.targetDate,
    generatedAt: intelligence.generatedAt,
    status: agentText ? "agent_generated" : "fallback",
    agents: [
      { id: "global-market-scout", name: "全球市场侦察 Agent", responsibility: "接收隔夜全球主要指数、区域市场表现和跨市场线索。", status: "completed" },
      { id: "finance-news-analyst", name: "财经新闻分析 Agent", responsibility: "筛选前一日财经新闻并抽取潜在影响。", status: agentText ? "completed" : "fallback" },
      { id: "daily-briefing-coordinator", name: "晨报协调 Agent", responsibility: "合并行情、新闻与风险提示，生成可执行晨报。", status: agentText ? "completed" : "fallback" },
    ],
    executiveSummary: agentText || `隔夜全球市场已完成接收。${strongest ? `${strongest.name} 相对较强（${strongest.changePercent.toFixed(2)}%）` : "主要指数数据暂未完整返回"}，${weakest ? `${weakest.name} 相对承压（${weakest.changePercent.toFixed(2)}%）` : "需继续观察欧美与亚太联动"}。${headlineText ? `新闻侧重点：${headlineText}` : "新闻侧暂无显著增量。"} `,
    marketPulse: [
      strongest ? `相对强势：${strongest.name} ${strongest.changePercent.toFixed(2)}%` : "相对强势：等待外部行情源恢复",
      weakest ? `相对承压：${weakest.name} ${weakest.changePercent.toFixed(2)}%` : "相对承压：等待外部行情源恢复",
      riskLevel === "high" ? "风险状态：隔夜波动偏大，A股开盘优先看低开修复和北向/港股联动。" : "风险状态：先按中性情景处理，观察开盘一小时资金选择。",
    ],
    riskLevel,
    watchItems: [
      "美股科技股与纳斯达克方向是否延续，影响A股AI、半导体、算力方向。",
      "港股与人民币资产情绪是否同步修复，影响A股开盘风险偏好。",
      "大宗商品、美元和利率预期是否扰动周期、金融与高股息板块。",
    ],
    headlines: intelligence.headlines.slice(0, 6),
    quotes: intelligence.quotes,
    disclosure: "本晨报由多 Agent 编排生成，仅用于盘前信息整理和风险观察，不构成投资建议。",
  };
}
