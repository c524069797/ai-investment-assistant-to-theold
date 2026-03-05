import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { fetchStockKLine, fetchMarketIndices } from "@/lib/api/eastmoney";

/** 计算简易 RSI (14日) */
function calculateRSI(closes: number[], period = 14): number {
  if (closes.length < period + 1) return 50;
  let gains = 0;
  let losses = 0;
  for (let i = closes.length - period; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1];
    if (change > 0) gains += change;
    else losses += Math.abs(change);
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

/** 计算布林带 (20日, 2倍标准差) */
function calculateBollingerBands(closes: number[], period = 20) {
  if (closes.length < period) return null;
  const recent = closes.slice(-period);
  const mean = recent.reduce((a, b) => a + b, 0) / period;
  const variance = recent.reduce((sum, val) => sum + (val - mean) ** 2, 0) / period;
  const stdDev = Math.sqrt(variance);
  return {
    upper: mean + 2 * stdDev,
    middle: mean,
    lower: mean - 2 * stdDev,
  };
}

/** 计算 N 日均线 */
function calculateMA(closes: number[], period: number): number | null {
  if (closes.length < period) return null;
  const recent = closes.slice(-period);
  return recent.reduce((a, b) => a + b, 0) / period;
}

/** 计算近一年最低价的百分位 */
function calculateYearlyPercentile(closes: number[]): number {
  if (closes.length < 20) return 50;
  const yearData = closes.slice(-250);
  const currentPrice = yearData[yearData.length - 1];
  const sorted = [...yearData].sort((a, b) => a - b);
  const index = sorted.findIndex((p) => p >= currentPrice);
  return (index / sorted.length) * 100;
}

export const bottomFinderTool = createTool({
  id: "bottom-finder",
  description: "抄底耐力王策略分析工具。分析股票是否出现超卖信号（RSI、布林带、均线支撑），用于爸爸的均值回归策略。",
  inputSchema: z.object({
    market: z.number().describe("市场代码：1=上海，0=深圳"),
    code: z.string().describe("股票代码，如 600519"),
  }),
  execute: async ({ market, code }) => {
    // Fetch 250+ days of daily data for calculations
    const klineData = await fetchStockKLine(market, code, "daily", 300);

    if (klineData.length < 30) {
      return { error: "数据不足，无法进行技术分析" };
    }

    const closes = klineData.map((d) => d.close);
    const currentPrice = closes[closes.length - 1];

    // Calculate indicators
    const rsi = calculateRSI(closes, 14);
    const bollinger = calculateBollingerBands(closes, 20);
    const ma250 = calculateMA(closes, 250);
    const ma60 = calculateMA(closes, 60);
    const ma20 = calculateMA(closes, 20);
    const yearlyPercentile = calculateYearlyPercentile(closes);

    // Analyze signals
    const signals: string[] = [];
    let signalStrength = 0;

    // RSI < 30 = oversold
    if (rsi < 30) {
      signals.push(`RSI = ${rsi.toFixed(1)}，处于超卖区间（< 30）`);
      signalStrength += 2;
    } else if (rsi < 40) {
      signals.push(`RSI = ${rsi.toFixed(1)}，接近超卖区间`);
      signalStrength += 1;
    }

    // Bollinger Bands lower touch
    if (bollinger) {
      if (currentPrice <= bollinger.lower) {
        signals.push(`股价 ${currentPrice.toFixed(2)} 触及布林带下轨 ${bollinger.lower.toFixed(2)}`);
        signalStrength += 2;
      } else if (currentPrice <= bollinger.lower * 1.02) {
        signals.push(`股价接近布林带下轨 ${bollinger.lower.toFixed(2)}`);
        signalStrength += 1;
      }
    }

    // 250-day MA support
    if (ma250 !== null) {
      const distanceToMA250 = ((currentPrice - ma250) / ma250) * 100;
      if (Math.abs(distanceToMA250) < 3) {
        signals.push(`股价接近250日均线 ${ma250.toFixed(2)}（偏离 ${distanceToMA250.toFixed(1)}%）`);
        signalStrength += 2;
      } else if (distanceToMA250 < -3) {
        signals.push(`股价低于250日均线 ${ma250.toFixed(2)}（偏离 ${distanceToMA250.toFixed(1)}%）`);
        signalStrength += 1;
      }
    }

    // Yearly low percentile
    if (yearlyPercentile <= 10) {
      signals.push(`股价处于近一年最低 ${yearlyPercentile.toFixed(0)}% 区间`);
      signalStrength += 2;
    } else if (yearlyPercentile <= 20) {
      signals.push(`股价处于近一年较低 ${yearlyPercentile.toFixed(0)}% 区间`);
      signalStrength += 1;
    }

    // Determine recommendation
    let recommendation: string;
    if (signalStrength >= 5) {
      recommendation = "强烈关注 — 多个超卖信号同时出现，建议分批小量买入观察";
    } else if (signalStrength >= 3) {
      recommendation = "值得关注 — 有一定超卖迹象，可以列入观察名单";
    } else if (signalStrength >= 1) {
      recommendation = "轻度关注 — 部分指标接近支撑位，继续观望";
    } else {
      recommendation = "暂无明显买入信号 — 当前不满足抄底条件";
    }

    return {
      code,
      currentPrice: currentPrice.toFixed(2),
      indicators: {
        rsi: rsi.toFixed(1),
        bollingerLower: bollinger?.lower.toFixed(2) ?? "数据不足",
        bollingerMiddle: bollinger?.middle.toFixed(2) ?? "数据不足",
        bollingerUpper: bollinger?.upper.toFixed(2) ?? "数据不足",
        ma20: ma20?.toFixed(2) ?? "数据不足",
        ma60: ma60?.toFixed(2) ?? "数据不足",
        ma250: ma250?.toFixed(2) ?? "数据不足",
        yearlyPercentile: `${yearlyPercentile.toFixed(0)}%`,
      },
      signals,
      signalStrength: `${signalStrength}/8`,
      recommendation,
      strategyRules: {
        buyCondition: "RSI < 30 且股价处于近一年最低10%区间 → 分批买入",
        takeProfit: "盈利达到 10% 时卖出",
        addPosition: "买入后下跌超过 5% → 评估基本面后考虑第一次补仓",
      },
      riskWarning: "⚠️ 技术指标仅供参考，投资有风险，请结合基本面综合判断",
    };
  },
});
