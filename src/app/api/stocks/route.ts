import { NextRequest, NextResponse } from "next/server";
import {
  fetchStockQuote,
  searchStocks,
  searchTopicStocks,
  fetchStockKLine,
  fetchMarketIndices,
  fetchStockRanking,
} from "@/lib/api/eastmoney";
import type { StockRankingItem } from "@/types/stock";

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
              const recent60High = Math.max(...highs.slice(-60));
              const recent60Low = Math.min(...lows.slice(-60));

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
          .filter((r): r is NonNullable<typeof r> => r !== null && r.signalStrength > 0)
          .sort((a, b) => b.signalStrength - a.signalStrength)
          .slice(0, count);

        return NextResponse.json({ success: true, data: sorted });
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
