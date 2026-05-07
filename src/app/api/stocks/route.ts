import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import {
  fetchStockQuote,
  searchStocks,
  searchTopicStocks,
  fetchStockKLine,
  fetchMarketIndices,
  fetchStockRanking,
} from "@/lib/api/eastmoney";
import type { StockKLinePoint } from "@/types/stock";
import type { StockRankingItem } from "@/types/stock";

// 这个 Route Handler 用 query.action 做轻量路由分发，
// 适合“同一资源域下多种读操作”的场景，例如 quote / kline / indices / ranking。
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const action = searchParams.get("action");

  try {
    switch (action) {
      case "quote": {
        const market = parseInt(searchParams.get("market") ?? "1", 10);
        const code = searchParams.get("code") ?? "";
        if (!code) {
          return NextResponse.json({ error: "Missing code" }, { status: 400 });
        }
        const data = await fetchStockQuote(market, code);
        return NextResponse.json({ success: true, data });
      }

      case "search": {
        const keyword = searchParams.get("keyword") ?? "";
        if (!keyword) {
          return NextResponse.json({ error: "Missing keyword" }, { status: 400 });
        }
        const data = await searchStocks(keyword);
        return NextResponse.json({ success: true, data });
      }

      case "topic": {
        const keyword = searchParams.get("keyword") ?? "";
        const count = parseInt(searchParams.get("count") ?? "10", 10);
        if (!keyword) {
          return NextResponse.json({ error: "Missing keyword" }, { status: 400 });
        }
        const data = await searchTopicStocks(keyword, count);
        return NextResponse.json({ success: true, data });
      }

      case "kline": {
        const market = parseInt(searchParams.get("market") ?? "1", 10);
        const code = searchParams.get("code") ?? "";
        // 这里把字符串收窄为字面量联合类型，
        // 这样 fetchStockKLine 只能接收 daily / weekly / monthly 三种合法值。
        const period = (searchParams.get("period") ?? "daily") as "daily" | "weekly" | "monthly";
        const count = parseInt(searchParams.get("count") ?? "120", 10);
        if (!code) {
          return NextResponse.json({ error: "Missing code" }, { status: 400 });
        }
        const data = await fetchStockKLine(market, code, period, count);
        return NextResponse.json({ success: true, data });
      }

      case "indices": {
        const data = await fetchMarketIndices();
        return NextResponse.json({ success: true, data });
      }

      case "index-analysis": {
        // `[number, string, string][]` 是元组数组：
        // 每一项都严格约束成 [market, code, name] 三段结构，而不是随意长度的数组。
        const targets: [number, string, string][] = [
          [1, "000001", "上证指数"],
          [1, "000300", "沪深300"],
          [0, "399006", "创业板指"],
        ];

        const results = await Promise.all(
          targets.map(async ([market, code, name]) => {
            try {
              const kline = await fetchStockKLine(market, code, "daily", 120);
              if (kline.length < 30) return null;

              const closes = kline.map((k) => k.close);
              const highs = kline.map((k) => k.high);
              const lows = kline.map((k) => k.low);
              const volumes = kline.map((k) => k.volume);
              const currentPrice = closes[closes.length - 1];

              // Moving averages
              const ma5 = calcMA(closes, 5) ?? currentPrice;
              const ma10 = calcMA(closes, 10) ?? currentPrice;
              const ma20 = calcMA(closes, 20) ?? currentPrice;
              const ma60 = calcMA(closes, 60) ?? currentPrice;

              // Bollinger Bands
              const boll = calcBollinger(closes, 20);

              // Recent high/low (20-day and 60-day)
              const recent20High = Math.max(...highs.slice(-20));
              const recent20Low = Math.min(...lows.slice(-20));

              // Volume trend
              const avgVol10 = volumes.slice(-10).reduce((a, b) => a + b, 0) / 10;
              const avgVol5 = volumes.slice(-5).reduce((a, b) => a + b, 0) / 5;
              const volumeTrend = avgVol5 / avgVol10;

              // Build support/resistance levels
              const supports: { price: number; reason: string }[] = [];
              const resistances: { price: number; reason: string }[] = [];

              // MA-based support/resistance
              const maLevels = [
                { value: ma5, label: "5日均线" },
                { value: ma10, label: "10日均线" },
                { value: ma20, label: "20日均线" },
                { value: ma60, label: "60日均线" },
              ];

              for (const ma of maLevels) {
                if (ma.value < currentPrice) {
                  supports.push({ price: Math.round(ma.value * 100) / 100, reason: ma.label + "支撑" });
                } else if (ma.value > currentPrice) {
                  resistances.push({ price: Math.round(ma.value * 100) / 100, reason: ma.label + "压力" });
                }
              }

              // Bollinger support/resistance
              if (boll) {
                if (boll.upper > currentPrice) {
                  resistances.push({ price: Math.round(boll.upper * 100) / 100, reason: "布林上轨压力" });
                }
                if (boll.lower < currentPrice) {
                  supports.push({ price: Math.round(boll.lower * 100) / 100, reason: "布林下轨支撑" });
                }
              }

              // Recent high/low
              if (recent20High > currentPrice * 1.005) {
                resistances.push({ price: Math.round(recent20High * 100) / 100, reason: "20日高点压力" });
              }
              if (recent20Low < currentPrice * 0.995) {
                supports.push({ price: Math.round(recent20Low * 100) / 100, reason: "20日低点支撑" });
              }

              // Sort and deduplicate: supports desc, resistances asc
              const sortedSupports = supports
                .sort((a, b) => b.price - a.price)
                .filter((s, i, arr) => i === 0 || Math.abs(s.price - arr[i - 1].price) / s.price > 0.005)
                .slice(0, 3);
              const sortedResistances = resistances
                .sort((a, b) => a.price - b.price)
                .filter((r, i, arr) => i === 0 || Math.abs(r.price - arr[i - 1].price) / r.price > 0.005)
                .slice(0, 3);

              // Trend judgment
              let trend: string;
              let trendReason: string;
              if (currentPrice > ma20 && ma5 > ma20) {
                trend = "偏多";
                trendReason = "价格站上20日均线，短期均线多头排列";
              } else if (currentPrice < ma20 && ma5 < ma20) {
                trend = "偏空";
                trendReason = "价格跌破20日均线，短期均线空头排列";
              } else {
                trend = "震荡";
                trendReason = "均线交织，多空方向不明";
              }

              // Volume analysis
              let volumeNote: string;
              if (volumeTrend > 1.3) {
                volumeNote = "近5日放量明显，资金活跃";
              } else if (volumeTrend < 0.7) {
                volumeNote = "近5日缩量，观望情绪浓";
              } else {
                volumeNote = "成交量平稳";
              }

              // Key level breakout check
              const breakoutNote: string[] = [];
              if (currentPrice > recent20High * 0.998) {
                breakoutNote.push("接近或突破20日高点，关注能否放量站稳");
              }
              if (currentPrice < recent20Low * 1.002) {
                breakoutNote.push("接近或跌破20日低点，关注是否有支撑");
              }
              if (boll && currentPrice > boll.upper * 0.995) {
                breakoutNote.push("触及布林上轨，短线注意回调风险");
              }
              if (boll && currentPrice < boll.lower * 1.005) {
                breakoutNote.push("触及布林下轨，可能出现超跌反弹");
              }

              return {
                code,
                name,
                currentPrice: Math.round(currentPrice * 100) / 100,
                trend,
                trendReason,
                supports: sortedSupports,
                resistances: sortedResistances,
                volumeNote,
                breakoutNotes: breakoutNote,
                ma: { ma5: Math.round(ma5 * 100) / 100, ma10: Math.round(ma10 * 100) / 100, ma20: Math.round(ma20 * 100) / 100, ma60: Math.round(ma60 * 100) / 100 },
              };
            } catch {
              return null;
            }
          }),
        );

        return NextResponse.json({
          success: true,
          // 这里的 `r is NonNullable<typeof r>` 会把 null 过滤掉，
          // 过滤后的数组类型会自动从 `(Result | null)[]` 收窄成 `Result[]`。
          data: results.filter((r): r is NonNullable<typeof r> => r !== null),
        });
      }

      case "ranking": {
        const count = parseInt(searchParams.get("count") ?? "50", 10);
        const data = await fetchStockRanking(count);
        return NextResponse.json({ success: true, data });
      }

      case "strategy-scan": {
        const mode = searchParams.get("mode") ?? "conservative";
        const count = parseInt(searchParams.get("count") ?? "10", 10);

        const ranking = await fetchStockRanking(50);

        if (mode === "aggressive") {
          const filtered = ranking
            .filter((s) => s.price >= 5 && s.price <= 30)
            .sort((a, b) => b.turnoverRate - a.turnoverRate)
            .slice(0, count);
          return NextResponse.json({ success: true, data: filtered });
        }

        // conservative: batch analyze bottom signals
        const results = await Promise.all(
          ranking.map(async (stock: StockRankingItem) => {
            try {
              const kline = await fetchStockKLine(stock.market, stock.code, "daily", 300);
              if (kline.length < 30) return null;
              const analysis = analyzeBottomSignalsServer(kline);
              return {
                ...stock,
                signalStrength: analysis.signalStrength,
                signals: analysis.signals,
                recommendation: analysis.recommendation,
                rsi: analysis.rsi,
                yearlyPercentile: analysis.yearlyPercentile,
              };
            } catch {
              return null;
            }
          }),
        );

        const sorted = results
          // 类型谓词也可以和业务条件一起写：既去掉 null，也保留有信号强度的结果。
          .filter((r): r is NonNullable<typeof r> => r !== null && r.signalStrength > 0)
          .sort((a, b) => b.signalStrength - a.signalStrength)
          .slice(0, count);

        return NextResponse.json({ success: true, data: sorted });
      }

      case "watchlist-summary": {
        const rawItems = searchParams.get("items") ?? "[]";
        // `as Array<...>` 属于类型断言：
        // 告诉 TS“我知道这个 JSON 解析后应该长这样”，适合接口边界层做快速建模。
        const items = JSON.parse(rawItems) as Array<{ market: number; code: string; name?: string }>;
        const limitedItems = items.slice(0, 6);

        const data = await Promise.all(
          limitedItems.map(async ({ market, code, name }) => {
            const quote = await fetchStockQuote(market, code);
            const kline = await fetchStockKLine(market, code, "daily", 80);
            const [news, dragonTiger, conceptInfo] = await Promise.all([
              fetchWatchlistNews(code, name || quote.name),
              fetchDragonTigerInfo(code),
              fetchStockConceptInfo(market, code),
            ]);
            return buildWatchlistInsight(quote, kline, news, dragonTiger, conceptInfo);
          }),
        );

        return NextResponse.json({ success: true, data });
      }

      case "watchlist-insight": {
        const market = parseInt(searchParams.get("market") ?? "1", 10);
        const code = searchParams.get("code") ?? "";
        const name = searchParams.get("name") ?? "";
        if (!code) {
          return NextResponse.json({ error: "Missing code" }, { status: 400 });
        }

        const quote = await fetchStockQuote(market, code);
        const kline = await fetchStockKLine(market, code, "daily", 80);
        const [news, dragonTiger, conceptInfo] = await Promise.all([
          fetchWatchlistNews(code, name || quote.name),
          fetchDragonTigerInfo(code),
          fetchStockConceptInfo(market, code),
        ]);

        const insight = buildWatchlistInsight(quote, kline, news, dragonTiger, conceptInfo);
        return NextResponse.json({ success: true, data: insight });
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// --- Server-side bottom signal analysis ---

interface KLinePoint {
  close: number;
}

function analyzeBottomSignalsServer(klineData: KLinePoint[]) {
  const closes = klineData.map((d) => d.close);
  const currentPrice = closes[closes.length - 1];

  const rsi = calcRSI(closes, 14);
  const bollinger = calcBollinger(closes, 20);
  const ma250 = calcMA(closes, 250);
  const yearData = closes.slice(-250);
  const sorted = [...yearData].sort((a, b) => a - b);
  const idx = sorted.findIndex((p) => p >= currentPrice);
  const yearlyPercentile = (idx / sorted.length) * 100;

  const signals: string[] = [];
  let signalStrength = 0;

  if (rsi < 30) {
    signals.push(`RSI=${rsi.toFixed(1)} 超卖`);
    signalStrength += 2;
  } else if (rsi < 40) {
    signals.push(`RSI=${rsi.toFixed(1)} 接近超卖`);
    signalStrength += 1;
  }

  if (bollinger && currentPrice <= bollinger.lower) {
    signals.push("触及布林带下轨");
    signalStrength += 2;
  } else if (bollinger && currentPrice <= bollinger.lower * 1.02) {
    signals.push("接近布林带下轨");
    signalStrength += 1;
  }

  if (ma250 !== null) {
    const dist = ((currentPrice - ma250) / ma250) * 100;
    if (Math.abs(dist) < 3) {
      signals.push(`接近250日均线(${dist > 0 ? "+" : ""}${dist.toFixed(1)}%)`);
      signalStrength += 2;
    } else if (dist < -3) {
      signals.push(`低于250日均线(${dist.toFixed(1)}%)`);
      signalStrength += 1;
    }
  }

  if (yearlyPercentile <= 10) {
    signals.push(`年内最低${yearlyPercentile.toFixed(0)}%区间`);
    signalStrength += 2;
  } else if (yearlyPercentile <= 20) {
    signals.push(`年内较低${yearlyPercentile.toFixed(0)}%区间`);
    signalStrength += 1;
  }

  let recommendation: string;
  if (signalStrength >= 5) recommendation = "强烈关注";
  else if (signalStrength >= 3) recommendation = "值得关注";
  else if (signalStrength >= 1) recommendation = "轻度关注";
  else recommendation = "暂无信号";

  return { rsi, yearlyPercentile, signals, signalStrength, recommendation };
}

function calcRSI(closes: number[], period = 14): number {
  if (closes.length < period + 1) return 50;
  let gains = 0, losses = 0;
  for (let i = closes.length - period; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1];
    if (change > 0) gains += change;
    else losses += Math.abs(change);
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  return 100 - 100 / (1 + avgGain / avgLoss);
}

function calcBollinger(closes: number[], period = 20) {
  if (closes.length < period) return null;
  const recent = closes.slice(-period);
  const mean = recent.reduce((a, b) => a + b, 0) / period;
  const variance = recent.reduce((sum, val) => sum + (val - mean) ** 2, 0) / period;
  const stdDev = Math.sqrt(variance);
  return { upper: mean + 2 * stdDev, middle: mean, lower: mean - 2 * stdDev };
}

function calcMA(closes: number[], period: number): number | null {
  if (closes.length < period) return null;
  return closes.slice(-period).reduce((a, b) => a + b, 0) / period;
}

interface WatchlistNewsItem {
  title: string;
  date: string;
  source: string;
  sentiment: "positive" | "negative" | "neutral";
}

interface DragonTigerInfo {
  isOnList: boolean;
  tradeDate?: string;
  reason?: string;
  netBuy?: number;
  buyAmount?: number;
  sellAmount?: number;
}

interface StockConceptInfo {
  concept: string;
  region: string;
}

function normalizeNewsDate(value: string) {
  return value ? value.replace(" 00:00:00", "") : "";
}

function isWithinDays(value: string, days: number) {
  if (!value) return false;
  const ts = new Date(value.replace(/-/g, "/")).getTime();
  if (Number.isNaN(ts)) return false;
  return Date.now() - ts <= days * 24 * 60 * 60 * 1000;
}

function inferNewsSentiment(title: string): "positive" | "negative" | "neutral" {
  const positiveWords = ["增长", "中标", "回购", "签约", "突破", "利好", "增持", "预增", "上涨", "扩产", "合作"];
  const negativeWords = ["减持", "下滑", "问询", "亏损", "处罚", "风险", "暴跌", "终止", "减值", "违约", "诉讼"];

  if (positiveWords.some((word) => title.includes(word))) return "positive";
  if (negativeWords.some((word) => title.includes(word))) return "negative";
  return "neutral";
}

function extractNewsFromResult(json: Record<string, unknown>): WatchlistNewsItem[] {
  const articles =
    (json as { result?: { cmsArticleWebOld?: Array<Record<string, string>> } })?.result?.cmsArticleWebOld ?? [];

  return articles
    .map((article) => {
      const title = (article.title ?? "").replace(/<[^>]+>/g, "");
      const date = normalizeNewsDate(article.date ?? article.showTime ?? "");
      return {
        title,
        date,
        source: article.mediaName ?? article.source ?? "东方财富",
        sentiment: inferNewsSentiment(title),
      };
    })
    .filter((article) => isWithinDays(article.date, 7))
    .slice(0, 6);
}

async function fetchWatchlistNews(code: string, stockName: string): Promise<WatchlistNewsItem[]> {
  const urls = [
    `https://search-api-web.eastmoney.com/search/jsonp?cb=&param=%7B%22uid%22%3A%22%22%2C%22keyword%22%3A%22${code}%22%2C%22type%22%3A%5B%22cmsArticleWebOld%22%5D%2C%22client%22%3A%22web%22%2C%22clientType%22%3A%22web%22%2C%22clientVersion%22%3A%22curr%22%2C%22param%22%3A%7B%22cmsArticleWebOld%22%3A%7B%22searchScope%22%3A%22default%22%2C%22sort%22%3A%22default%22%2C%22pageIndex%22%3A1%2C%22pageSize%22%3A4%2C%22preTag%22%3A%22%22%2C%22postTag%22%3A%22%22%7D%7D%7D`,
    `https://search-api-web.eastmoney.com/search/jsonp?cb=&param=%7B%22uid%22%3A%22%22%2C%22keyword%22%3A%22${encodeURIComponent(stockName)}%22%2C%22type%22%3A%5B%22cmsArticleWebOld%22%5D%2C%22client%22%3A%22web%22%2C%22clientType%22%3A%22web%22%2C%22clientVersion%22%3A%22curr%22%2C%22param%22%3A%7B%22cmsArticleWebOld%22%3A%7B%22searchScope%22%3A%22default%22%2C%22sort%22%3A%22default%22%2C%22pageIndex%22%3A1%2C%22pageSize%22%3A4%2C%22preTag%22%3A%22%22%2C%22postTag%22%3A%22%22%7D%7D%7D`,
  ];

  const responses = await Promise.all(
    urls.map(async (url) => {
      try {
        const res = await fetch(url, {
          headers: {
            Referer: "https://so.eastmoney.com/",
            "User-Agent": "Mozilla/5.0",
          },
          cache: "no-store",
        });
        const text = await res.text();
        const jsonStr = text.replace(/^[^(]*\(/, "").replace(/\);?\s*$/, "");
        const json = jsonStr !== text ? JSON.parse(jsonStr) : JSON.parse(text);
        return extractNewsFromResult(json);
      } catch {
        return [] as WatchlistNewsItem[];
      }
    }),
  );

  const merged = [...responses[0]];
  for (const item of responses[1]) {
    if (!merged.some((news) => news.title === item.title)) {
      merged.push(item);
    }
  }
  return merged.slice(0, 6);
}

async function fetchStockConceptInfo(market: number, code: string): Promise<StockConceptInfo> {
  try {
    const secid = `${market}.${code}`;
    const url = `https://push2.eastmoney.com/api/qt/stock/get?secid=${secid}&fields=f57,f58,f127,f128`;
    const res = await fetch(url, {
      headers: { Referer: "https://quote.eastmoney.com/" },
      cache: "no-store",
    });
    const json = await res.json();
    const data = (json as { data?: Record<string, string> }).data ?? {};
    return {
      concept: data.f127 || "概念待识别",
      region: data.f128 || "地域待识别",
    };
  } catch {
    return { concept: "概念待识别", region: "地域待识别" };
  }
}

async function fetchDragonTigerInfo(code: string): Promise<DragonTigerInfo> {
  try {
    const latestDateUrl = "https://datacenter-web.eastmoney.com/api/data/v1/get?reportName=RPT_BILLBOARD_DAILYDETAILS&columns=TRADE_DATE&sortTypes=-1&sortColumns=TRADE_DATE&pageNumber=1&pageSize=1&source=WEB&client=WEB";
    const stockUrl = `https://datacenter-web.eastmoney.com/api/data/v1/get?reportName=RPT_BILLBOARD_DAILYDETAILS&columns=SECURITY_CODE,TRADE_DATE,EXPLANATION,TOTAL_BUY,TOTAL_SELL,TOTAL_NET&filter=(SECURITY_CODE%3D%22${code}%22)&pageNumber=1&pageSize=1&sortTypes=-1&sortColumns=TRADE_DATE&source=WEB&client=WEB`;

    const [latestDateRes, stockRes] = await Promise.all([
      fetch(latestDateUrl, {
        headers: { Referer: "https://data.eastmoney.com/" },
        cache: "no-store",
      }),
      fetch(stockUrl, {
        headers: { Referer: "https://data.eastmoney.com/" },
        cache: "no-store",
      }),
    ]);

    const latestJson = await latestDateRes.json();
    const stockJson = await stockRes.json();

    const latestDate = String((latestJson as { result?: { data?: Array<Record<string, string>> } })?.result?.data?.[0]?.TRADE_DATE ?? "").replace(" 00:00:00", "");
    const row = (stockJson as { result?: { data?: Array<Record<string, string | number>> } })?.result?.data?.[0];
    if (!row || !latestDate) return { isOnList: false };

    const tradeDate = String(row.TRADE_DATE ?? "").replace(" 00:00:00", "");
    if (tradeDate !== latestDate || !isWithinDays(tradeDate, 4)) {
      return { isOnList: false };
    }

    return {
      isOnList: true,
      tradeDate,
      reason: String(row.EXPLANATION ?? "上榜原因待确认"),
      netBuy: Number(row.TOTAL_NET ?? 0),
      buyAmount: Number(row.TOTAL_BUY ?? 0),
      sellAmount: Number(row.TOTAL_SELL ?? 0),
    };
  } catch {
    return { isOnList: false };
  }
}

function buildWatchlistInsight(
  // `Awaited<ReturnType<typeof fetchStockQuote>>` 也是 TS 很值得学的组合：
  // - ReturnType: 取函数返回值类型
  // - Awaited: 再把 Promise<...> 展开成真正 resolve 后的类型
  quote: Awaited<ReturnType<typeof fetchStockQuote>>,
  kline: StockKLinePoint[],
  news: WatchlistNewsItem[],
  dragonTiger: DragonTigerInfo,
  conceptInfo: StockConceptInfo,
) {
  const closes = kline.map((item) => item.close);
  const highs = kline.map((item) => item.high);
  const lows = kline.map((item) => item.low);
  const volumes = kline.map((item) => item.volume);
  const currentPrice = quote.price;
  const ma5 = calcMA(closes, 5) ?? currentPrice;
  const ma10 = calcMA(closes, 10) ?? currentPrice;
  const ma20 = calcMA(closes, 20) ?? currentPrice;
  const ma60 = calcMA(closes, 60) ?? currentPrice;
  const avgVolume5 = volumes.length >= 5 ? volumes.slice(-5).reduce((sum, val) => sum + val, 0) / 5 : quote.volume;
  const avgVolume20 = volumes.length >= 20 ? volumes.slice(-20).reduce((sum, val) => sum + val, 0) / 20 : quote.volume;
  const volumeRatio = avgVolume20 > 0 ? quote.volume / avgVolume20 : 1;
  const recent20High = highs.length >= 20 ? Math.max(...highs.slice(-20)) : quote.high;
  const recent20Low = lows.length >= 20 ? Math.min(...lows.slice(-20)) : quote.low;
  const boll = calcBollinger(closes, 20);

  const pressureLevels = [
    ma5 > currentPrice ? { price: ma5, reason: "5日均线压力" } : null,
    ma10 > currentPrice ? { price: ma10, reason: "10日均线压力" } : null,
    ma20 > currentPrice ? { price: ma20, reason: "20日均线压力" } : null,
    recent20High > currentPrice ? { price: recent20High, reason: "20日高点压力" } : null,
    boll && boll.upper > currentPrice ? { price: boll.upper, reason: "布林上轨压力" } : null,
  ].filter((item): item is { price: number; reason: string } => Boolean(item)).sort((a, b) => a.price - b.price).slice(0, 3);

  const supportLevels = [
    ma5 < currentPrice ? { price: ma5, reason: "5日均线支撑" } : null,
    ma10 < currentPrice ? { price: ma10, reason: "10日均线支撑" } : null,
    ma20 < currentPrice ? { price: ma20, reason: "20日均线支撑" } : null,
    ma60 < currentPrice ? { price: ma60, reason: "60日均线支撑" } : null,
    recent20Low < currentPrice ? { price: recent20Low, reason: "20日低点支撑" } : null,
    boll && boll.lower < currentPrice ? { price: boll.lower, reason: "布林下轨支撑" } : null,
  ].filter((item): item is { price: number; reason: string } => Boolean(item)).sort((a, b) => b.price - a.price).slice(0, 3);

  const breakoutLevels = [
    { price: recent20High, reason: "突破20日高点确认强势" },
    { price: Math.max(ma20, ma10), reason: "站稳中期均线有助延续反弹" },
  ].filter((item) => item.price >= currentPrice * 0.98).sort((a, b) => a.price - b.price).slice(0, 2);

  const newsSummary = news.length > 0
    ? `近7天收集到 ${news.length} 条相关新闻，其中${news.filter((item) => item.sentiment === "positive").length} 条偏利多。`
    : "近7天未抓取到显著相关新闻，更多依赖量价和技术位置判断。";

  const signalSummary = [
    `${conceptInfo.concept} / ${conceptInfo.region}`,
    quote.changePercent > 0 ? "股价当日偏强" : quote.changePercent < 0 ? "股价承压波动" : "股价平盘震荡",
    volumeRatio > 1.5 ? "伴随明显放量" : volumeRatio < 0.8 ? "成交偏谨慎" : "量能处于常态区间",
    dragonTiger.isOnList ? "且出现前一交易日龙虎榜事件催化" : "当前未出现前一交易日龙虎榜强化信号",
    newsSummary,
  ].join("，");

  let strategyHint = "以观察为主，等待更明确的放量突破或回踩确认。";
  if (dragonTiger.isOnList && Number(dragonTiger.netBuy ?? 0) > 0) {
    strategyHint = "龙虎榜净买入偏正，若后续放量站稳关键压力位，可提高关注级别。";
  } else if (quote.changePercent > 2 && volumeRatio > 1.5) {
    strategyHint = "短线进入放量突破观察区，避免追高，优先等待回踩或二次确认。";
  } else if (quote.changePercent < -2) {
    strategyHint = "短线偏弱，先观察支撑位承接，不宜急于抄底。";
  }

  const volumeNote = volumeRatio > 1.8
    ? "当日成交量显著高于20日均量，市场关注度快速抬升。"
    : volumeRatio > 1.2
      ? "量能温和放大，说明资金开始回流。"
      : volumeRatio < 0.8
        ? "成交缩量，说明场内资金偏观望。"
        : "量能相对平稳，尚未出现极端异动。";

  const largeOrderNote = dragonTiger.isOnList
    ? `龙虎榜数据显示净买入 ${formatLargeAmount(dragonTiger.netBuy ?? 0)}，可视作大资金行为的重要参考。`
    : quote.amount > 1500000000
      ? "成交额较高，盘中可能存在大资金换手或分歧博弈。"
      : "暂未捕捉到足够明确的大单席位信息，需结合后续盘口继续观察。";

  return {
    code: quote.code,
    name: quote.name,
    market: quote.market,
    concept: conceptInfo.concept,
    region: conceptInfo.region,
    price: quote.price,
    change: quote.change,
    changePercent: quote.changePercent,
    turnoverRate: quote.turnoverRate,
    amount: quote.amount,
    volumeRatio,
    avgVolume5,
    avgVolume20,
    pressureLevels,
    supportLevels,
    breakoutLevels,
    signalSummary,
    strategyHint,
    volumeNote,
    largeOrderNote,
    dragonTiger,
    news,
  };
}

function formatLargeAmount(value: number) {
  if (Math.abs(value) >= 100000000) return `${(value / 100000000).toFixed(2)}亿`;
  if (Math.abs(value) >= 10000) return `${(value / 10000).toFixed(2)}万`;
  return value.toFixed(0);
}
