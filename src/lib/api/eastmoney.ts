import type { StockQuote, StockSearchResult, StockKLinePoint, MarketIndex, StockRankingItem } from "@/types/stock";
import { MARKET_INDICES } from "@/lib/constants/market";
import type { KLinePeriod } from "@/types/stock";

// 行情数据层的技术思路：
// - 搜索：优先走东方财富搜索接口
// - 实时行情 / K线：优先走腾讯财经接口
// 原因是一些 EastMoney push2 接口在不同网络环境下更容易被拦截，
// 因此这里做了“多源拼装”，对上层页面仍然暴露统一的 TypeScript 类型。

// 东方财富搜索 API (可用)
const SEARCH_BASE = "https://searchapi.eastmoney.com/api/suggest/get";

// 腾讯财经 API (替代被代理拦截的 push2.eastmoney.com)
const TENCENT_QT_BASE = "https://qt.gtimg.cn";
const TENCENT_KLINE_BASE = "https://web.ifzq.gtimg.cn/appstock/app/fqkline/get";

/** 将 market + code 转为腾讯格式: sh600519 / sz002131 */
function buildTencentSymbol(market: number, code: string): string {
  return `${market === 1 ? "sh" : "sz"}${code}`;
}

/** 解析腾讯实时行情响应 (GBK 编码, ~分隔) */
function parseTencentQuote(raw: string): string[] {
  const start = raw.indexOf('"') + 1;
  const end = raw.lastIndexOf('"');
  if (start <= 0 || end <= start) return [];
  return raw.slice(start, end).split("~");
}

/** 获取股票实时行情 (腾讯财经 API) */
export async function fetchStockQuote(market: number, code: string): Promise<StockQuote> {
  const symbol = buildTencentSymbol(market, code);
  const url = `${TENCENT_QT_BASE}/q=${symbol}`;

  // Next.js 服务端 fetch 自带缓存能力；这里通过 revalidate=10 实现轻量 ISR 式数据复用。
  const res = await fetch(url, { next: { revalidate: 10 } });
  const buffer = await res.arrayBuffer();
  const text = new TextDecoder("gbk").decode(buffer);
  const f = parseTencentQuote(text);

  if (f.length < 50 || !f[3] || f[3] === "0.00") {
    throw new Error(`Stock not found: ${code}`);
  }

  // 腾讯 qt 字段索引:
  // [1]name [2]code [3]price [4]preClose [5]open [6]volume(股)
  // [31]change [32]changePercent [33]high [34]low
  // [36]volume2(股) [37]amount(万) [38]turnoverRate
  // [39]PE [44]circulationCap(亿) [45]totalCap(亿) [46]PB
  return {
    code: f[2],
    name: f[1],
    price: parseFloat(f[3]),
    change: parseFloat(f[31]),
    changePercent: parseFloat(f[32]),
    open: parseFloat(f[5]),
    high: parseFloat(f[33]),
    low: parseFloat(f[34]),
    close: parseFloat(f[3]),
    preClose: parseFloat(f[4]),
    volume: parseInt(f[36], 10) || parseInt(f[6], 10),
    amount: (parseFloat(f[37]) || 0) * 10000, // 万→元
    turnoverRate: parseFloat(f[38]) || 0,
    pe: parseFloat(f[39]) || 0,
    pb: parseFloat(f[46]) || 0,
    totalMarketCap: (parseFloat(f[45]) || 0) * 100000000, // 亿→元
    circulationMarketCap: (parseFloat(f[44]) || 0) * 100000000,
    market,
  };
}

/** 搜索股票 (东方财富搜索 API，可用) + 批量获取实时行情 */
export async function searchStocks(keyword: string): Promise<StockSearchResult[]> {
  const url = `${SEARCH_BASE}?input=${encodeURIComponent(keyword)}&type=14&token=D43BF722C8E33BDC906FB84D85E326E8&count=20`;

  // 先搜基础信息，再批量补齐实时价格，避免页面侧自己拼多个数据源。
  const res = await fetch(url, { next: { revalidate: 60 } });
  const json = await res.json();

  if (!json.QuotationCodeTable?.Data) {
    return [];
  }

  const A_STOCK_TYPES = ["沪A", "深A", "A股", "创业板", "科创板"];
  const results: StockSearchResult[] = json.QuotationCodeTable.Data.filter(
    (item: Record<string, string>) =>
      A_STOCK_TYPES.includes(item.SecurityTypeName) || item.SecurityTypeName === "指数",
  ).map((item: Record<string, string>) => ({
    code: item.Code,
    name: item.Name,
    market: item.MktNum === "1" ? 1 : 0,
    type: item.SecurityTypeName,
  }));

  // Batch fetch real-time quotes for search results
  if (results.length > 0) {
    try {
      const symbols = results.map((r) => buildTencentSymbol(r.market, r.code)).join(",");
      const qtUrl = `${TENCENT_QT_BASE}/q=${symbols}`;
      const qtRes = await fetch(qtUrl, { next: { revalidate: 10 } });
      const buffer = await qtRes.arrayBuffer();
      const text = new TextDecoder("gbk").decode(buffer);

      const quoteMap = new Map<string, string[]>();
      for (const line of text.split(";")) {
        const f = parseTencentQuote(line);
        if (f.length >= 38 && f[2] && f[3] && f[3] !== "0.00") {
          quoteMap.set(f[2], f);
        }
      }

      return results.map((r) => {
        const f = quoteMap.get(r.code);
        if (!f) return r;
        return {
          ...r,
          price: parseFloat(f[3]),
          change: parseFloat(f[31]),
          changePercent: parseFloat(f[32]),
          amount: (parseFloat(f[37]) || 0) * 10000,
        };
      });
    } catch {
      // Ignore - search results will show without quote data
    }
  }

  return results;
}

/** 搜索热门题材下成交额最大的股票 */
export async function searchTopicStocks(keyword: string, count: number = 10): Promise<StockSearchResult[]> {
  try {
    // Step 1: Search for sector/板块 code, try variations if not found
    let sectorCode = "";
    const searchVariants = [keyword, `${keyword}概念`, `${keyword}设备`, `${keyword}产业`];

    for (const variant of searchVariants) {
      const searchUrl = `${SEARCH_BASE}?input=${encodeURIComponent(variant)}&type=14&token=D43BF722C8E33BDC906FB84D85E326E8&count=10`;
      const searchRes = await fetch(searchUrl, { next: { revalidate: 60 } });
      const searchJson = await searchRes.json();

      if (searchJson.QuotationCodeTable?.Data) {
        const sector = searchJson.QuotationCodeTable.Data.find(
          (item: Record<string, string>) => item.SecurityTypeName === "板块",
        );
        if (sector) {
          sectorCode = sector.Code;
          break;
        }
      }
    }

    if (!sectorCode) {
      return searchStocks(keyword);
    }

  // Step 2: Get sector constituent stocks sorted by amount (f6) descending (po=1)
  // Request extra to account for filtering out delisted/ST stocks
  const requestCount = Math.min(count * 2, 30);
  const listUrl = `https://push2.eastmoney.com/api/qt/clist/get?cb=jQuery&pn=1&pz=${requestCount}&po=1&np=1&fltt=2&invt=2&fid=f6&fs=b:${sectorCode}&fields=f2,f3,f4,f6,f12,f13,f14`;
  const listRes = await fetch(listUrl, {
    headers: {
      Referer: "https://data.eastmoney.com/",
    },
    next: { revalidate: 30 },
  });
  const listText = await listRes.text();

  // Parse JSONP: jQuery({...});
  const jsonMatch = listText.match(/jQuery\((.+)\);?$/);
  if (!jsonMatch) {
    return [];
  }
  const listJson = JSON.parse(jsonMatch[1]);

  if (!listJson.data?.diff) {
    return [];
  }

  return listJson.data.diff
    .filter((item: Record<string, number | string>) =>
      typeof item.f2 === "number" && item.f2 > 0 &&
      typeof item.f6 === "number" && item.f6 > 0 &&
      !String(item.f14).startsWith("退市") &&
      !String(item.f14).startsWith("*ST"),
    )
    .map((item: Record<string, number | string>) => ({
    code: String(item.f12),
    name: String(item.f14),
    market: item.f13 === 1 ? 1 : 0,
    type: keyword,
    price: typeof item.f2 === "number" ? item.f2 : 0,
    change: typeof item.f4 === "number" ? item.f4 : 0,
    changePercent: typeof item.f3 === "number" ? item.f3 : 0,
    amount: typeof item.f6 === "number" ? item.f6 : 0,
  }))
  .slice(0, count);
  } catch {
    // If push2 API fails, fall back to regular search
    return searchStocks(keyword);
  }
}

/** 腾讯 K 线周期映射 */
const TENCENT_KLINE_PERIOD: Record<KLinePeriod, string> = {
  // `Record<KLinePeriod, string>` 表示：
  // KLinePeriod 联合类型里的每个成员，都必须在这里有对应值。
  // 少一个 key 或写错 key，TS 都会直接报错。
  daily: "day",
  weekly: "week",
  monthly: "month",
};

/** 获取 K 线数据 (腾讯财经 API) */
export async function fetchStockKLine(
  market: number,
  code: string,
  period: KLinePeriod = "daily",
  count: number = 120,
): Promise<StockKLinePoint[]> {
  const symbol = buildTencentSymbol(market, code);

  // 统一把外部 K 线格式转换成项目自己的 StockKLinePoint，
  // 这样图表组件、技术分析工具、API 路由都能复用同一种数据结构。
  const tPeriod = TENCENT_KLINE_PERIOD[period];
  // 腾讯 K 线 API: param=symbol,period,startDate,,count,qfq(前复权)
  const url = `${TENCENT_KLINE_BASE}?param=${symbol},${tPeriod},,,${count},qfq`;

  const res = await fetch(url, { next: { revalidate: 60 } });
  const json = await res.json();

  // 响应格式: data.{symbol}.qfq{period} (前复权) 或 data.{symbol}.{period} (不复权)
  const stockData = json.data?.[symbol] ?? {};
  const klines: string[][] = stockData[`qfq${tPeriod}`] ?? stockData[tPeriod] ?? [];

  if (!Array.isArray(klines) || klines.length === 0) {
    return [];
  }

  // 腾讯 K 线字段: [date, open, close, high, low, volume]
  return klines.map((k, i) => {
    const open = parseFloat(k[1]);
    const close = parseFloat(k[2]);
    const high = parseFloat(k[3]);
    const low = parseFloat(k[4]);
    const vol = parseFloat(k[5]);
    // 涨跌幅: 相对前一根 K 线的 close (更准确)，首根用 open
    const prevClose = i > 0 ? parseFloat(klines[i - 1][2]) : open;
    const changePercent = prevClose > 0 ? ((close - prevClose) / prevClose) * 100 : 0;
    return {
      date: k[0],
      open,
      close,
      high,
      low,
      volume: Math.round(vol),
      amount: 0, // 腾讯 K 线 API 不返回成交额
      changePercent,
    };
  });
}

/** A股热门股票池 (沪深300核心成分 + 中证500活跃个股) */
// `as const` 会把二维数组里的值固定成只读字面量，
// 避免被推断成宽泛的 `(string | number)[][]`。
const STOCK_POOL = [
  // 沪深300 大盘蓝筹 [market, code]
  [1,"600519"],[0,"000858"],[1,"601318"],[0,"000651"],[0,"000333"],
  [1,"600036"],[1,"601166"],[0,"002714"],[1,"601398"],[0,"000001"],
  [0,"000002"],[1,"600030"],[1,"601601"],[0,"300750"],[0,"002230"],
  [1,"601288"],[1,"600900"],[0,"000725"],[0,"002415"],[1,"600276"],
  [0,"000568"],[1,"601888"],[1,"600809"],[0,"000063"],[0,"300059"],
  [1,"600887"],[1,"601012"],[1,"600048"],[0,"002304"],[1,"600585"],
  [0,"000776"],[1,"601225"],[1,"600104"],[0,"002352"],[0,"300124"],
  [0,"000338"],[1,"601668"],[1,"600438"],[0,"002475"],[0,"300015"],
  [1,"600050"],[0,"300308"],[0,"002594"],[0,"002049"],[1,"601669"],
  [1,"600309"],[0,"000100"],[1,"603501"],[0,"300274"],[1,"601899"],
] as const;

/** 获取A股排行榜 (按成交额降序) - 批量查询腾讯行情 */
export async function fetchStockRanking(count: number = 50): Promise<StockRankingItem[]> {
  const symbols = STOCK_POOL.map(([m, c]) => buildTencentSymbol(m, c)).join(",");
  const url = `${TENCENT_QT_BASE}/q=${symbols}`;

  const res = await fetch(url, { next: { revalidate: 30 } });
  const buffer = await res.arrayBuffer();
  const text = new TextDecoder("gbk").decode(buffer);

  const results: StockRankingItem[] = [];
  for (const line of text.split(";")) {
    const f = parseTencentQuote(line);
    if (f.length < 50 || !f[3] || f[3] === "0.00") continue;

    const market = line.includes("v_sh") ? 1 : 0;
    results.push({
      code: f[2],
      name: f[1],
      market,
      price: parseFloat(f[3]),
      changePercent: parseFloat(f[32]),
      volume: parseInt(f[36], 10) || parseInt(f[6], 10),
      amount: (parseFloat(f[37]) || 0) * 10000,
      turnoverRate: parseFloat(f[38]) || 0,
      industry: "",
      pe: parseFloat(f[39]) || 0,
      pb: parseFloat(f[46]) || 0,
      totalMarketCap: (parseFloat(f[45]) || 0) * 100000000,
    });
  }

  return results
    .sort((a, b) => b.amount - a.amount)
    .slice(0, count);
}

/** 获取大盘指数 (腾讯财经 API) */
export async function fetchMarketIndices(): Promise<MarketIndex[]> {
  // 指数列表集中放在 constants 中，页面层只管“我要哪些指数”，数据源细节留在这里。
  const symbols = MARKET_INDICES.map(([m, c]) => buildTencentSymbol(m, c)).join(",");
  const url = `${TENCENT_QT_BASE}/q=${symbols}`;

  try {
    const res = await fetch(url, { next: { revalidate: 15 } });
    const buffer = await res.arrayBuffer();
    const text = new TextDecoder("gbk").decode(buffer);

    const results: MarketIndex[] = [];
    const lines = text.split(";");

    for (let i = 0; i < MARKET_INDICES.length; i++) {
      const [, expectedCode, expectedName] = MARKET_INDICES[i];
      const f = lines[i] ? parseTencentQuote(lines[i]) : [];

      if (f.length >= 38) {
        results.push({
          code: f[2] || expectedCode,
          name: f[1] || expectedName,
          price: parseFloat(f[3]) || 0,
          change: parseFloat(f[31]) || 0,
          changePercent: parseFloat(f[32]) || 0,
          volume: parseInt(f[36], 10) || parseInt(f[6], 10) || 0,
          amount: (parseFloat(f[37]) || 0) * 10000,
        });
      } else {
        results.push({
          code: expectedCode,
          name: expectedName,
          price: 0, change: 0, changePercent: 0, volume: 0, amount: 0,
        });
      }
    }

    return results;
  } catch {
    return MARKET_INDICES.map(([, code, name]) => ({
      code, name, price: 0, change: 0, changePercent: 0, volume: 0, amount: 0,
    }));
  }
}
