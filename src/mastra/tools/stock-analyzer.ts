import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import {
  searchStocks,
  fetchStockQuote,
  fetchStockKLine,
} from "@/lib/api/eastmoney";
import type { StockKLinePoint } from "@/types/stock";

// ======== Technical Indicator Calculations ========

/** RSI (Relative Strength Index) */
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
  return 100 - 100 / (1 + avgGain / avgLoss);
}

/** Bollinger Bands */
function calculateBollinger(closes: number[], period = 20) {
  if (closes.length < period) return null;
  const recent = closes.slice(-period);
  const mean = recent.reduce((a, b) => a + b, 0) / period;
  const variance =
    recent.reduce((sum, val) => sum + (val - mean) ** 2, 0) / period;
  const stdDev = Math.sqrt(variance);
  return {
    upper: mean + 2 * stdDev,
    middle: mean,
    lower: mean - 2 * stdDev,
    bandwidth: ((4 * stdDev) / mean) * 100,
  };
}

/** Simple Moving Average */
function calculateMA(closes: number[], period: number): number | null {
  if (closes.length < period) return null;
  return closes.slice(-period).reduce((a, b) => a + b, 0) / period;
}

/** EMA (Exponential Moving Average) */
function calculateEMA(data: number[], period: number): number[] {
  const ema: number[] = [];
  if (data.length === 0) return ema;
  const multiplier = 2 / (period + 1);
  ema[0] = data[0];
  for (let i = 1; i < data.length; i++) {
    ema[i] = (data[i] - ema[i - 1]) * multiplier + ema[i - 1];
  }
  return ema;
}

/** MACD */
function calculateMACD(closes: number[]) {
  if (closes.length < 35) return null;
  const ema12 = calculateEMA(closes, 12);
  const ema26 = calculateEMA(closes, 26);
  const dif: number[] = [];
  for (let i = 0; i < closes.length; i++) {
    dif[i] = ema12[i] - ema26[i];
  }
  const dea = calculateEMA(dif, 9);
  const macdHist: number[] = [];
  for (let i = 0; i < dif.length; i++) {
    macdHist[i] = (dif[i] - dea[i]) * 2;
  }

  const currentDIF = dif[dif.length - 1];
  const currentDEA = dea[dea.length - 1];
  const currentHist = macdHist[macdHist.length - 1];
  const prevDIF = dif[dif.length - 2];
  const prevDEA = dea[dea.length - 2];
  const prevHist = macdHist[macdHist.length - 2];

  // Golden cross / Death cross
  const isGoldenCross = prevDIF <= prevDEA && currentDIF > currentDEA;
  const isDeathCross = prevDIF >= prevDEA && currentDIF < currentDEA;

  // Divergence detection (last 60 bars)
  const lookback = Math.min(60, closes.length);
  const recentCloses = closes.slice(-lookback);
  const recentDIF = dif.slice(-lookback);

  let bottomDivergence = false;
  let topDivergence = false;

  // Simple divergence: compare two recent lows/highs
  const midPoint = Math.floor(lookback / 2);
  const firstHalfLow = Math.min(...recentCloses.slice(0, midPoint));
  const secondHalfLow = Math.min(...recentCloses.slice(midPoint));
  const firstHalfDIFLow = Math.min(...recentDIF.slice(0, midPoint));
  const secondHalfDIFLow = Math.min(...recentDIF.slice(midPoint));

  if (secondHalfLow < firstHalfLow && secondHalfDIFLow > firstHalfDIFLow) {
    bottomDivergence = true;
  }

  const firstHalfHigh = Math.max(...recentCloses.slice(0, midPoint));
  const secondHalfHigh = Math.max(...recentCloses.slice(midPoint));
  const firstHalfDIFHigh = Math.max(...recentDIF.slice(0, midPoint));
  const secondHalfDIFHigh = Math.max(...recentDIF.slice(midPoint));

  if (secondHalfHigh > firstHalfHigh && secondHalfDIFHigh < firstHalfDIFHigh) {
    topDivergence = true;
  }

  // Histogram trend
  let histTrend: string;
  if (currentHist > 0 && currentHist > prevHist) histTrend = "红柱放大（多头加速）";
  else if (currentHist > 0 && currentHist < prevHist) histTrend = "红柱缩短（多头衰竭）";
  else if (currentHist < 0 && currentHist < prevHist) histTrend = "绿柱放大（空头加速）";
  else if (currentHist < 0 && currentHist > prevHist) histTrend = "绿柱缩短（空头衰竭）";
  else histTrend = "柱状持平";

  return {
    DIF: currentDIF,
    DEA: currentDEA,
    histogram: currentHist,
    isGoldenCross,
    isDeathCross,
    bottomDivergence,
    topDivergence,
    histTrend,
    position: currentDIF > 0 ? "零轴上方（多头区）" : "零轴下方（空头区）",
  };
}

/** KDJ */
function calculateKDJ(
  klineData: StockKLinePoint[],
  period = 9,
) {
  if (klineData.length < period) return null;

  let prevK = 50;
  let prevD = 50;
  let currentK = 50;
  let currentD = 50;
  let currentJ = 50;

  for (let i = period - 1; i < klineData.length; i++) {
    const windowData = klineData.slice(i - period + 1, i + 1);
    const highN = Math.max(...windowData.map((d) => d.high));
    const lowN = Math.min(...windowData.map((d) => d.low));
    const closeN = klineData[i].close;

    const rsv = highN === lowN ? 50 : ((closeN - lowN) / (highN - lowN)) * 100;
    currentK = (2 / 3) * prevK + (1 / 3) * rsv;
    currentD = (2 / 3) * prevD + (1 / 3) * currentK;
    currentJ = 3 * currentK - 2 * currentD;

    prevK = currentK;
    prevD = currentD;
  }

  // Check for golden/death cross in KDJ (compare last two values)
  // Simplified: use current values
  const isOversold = currentK < 20 && currentD < 20;
  const isOverbought = currentK > 80 && currentD > 80;

  return {
    K: currentK,
    D: currentD,
    J: currentJ,
    isOversold,
    isOverbought,
    zone:
      isOversold
        ? "超卖区（K/D < 20）"
        : isOverbought
          ? "超买区（K/D > 80）"
          : currentK > 50
            ? "多方区（K > 50）"
            : "空方区（K < 50）",
  };
}

/** Volume analysis */
function analyzeVolume(klineData: StockKLinePoint[]) {
  if (klineData.length < 20) return null;

  const recent5 = klineData.slice(-5);
  const recent10 = klineData.slice(-10);
  const recent20 = klineData.slice(-20);

  const avgVol5 = recent5.reduce((s, d) => s + d.volume, 0) / 5;
  const avgVol10 = recent10.reduce((s, d) => s + d.volume, 0) / 10;
  const avgVol20 = recent20.reduce((s, d) => s + d.volume, 0) / 20;
  const todayVol = klineData[klineData.length - 1].volume;
  const todayChange = klineData[klineData.length - 1].changePercent;

  const volRatio5vs20 = avgVol5 / avgVol20;
  const todayVsAvg = todayVol / avgVol20;

  // Volume-price relationship
  let volumePriceRelation: string;
  if (todayVsAvg > 1.5 && todayChange > 0) {
    volumePriceRelation = "放量上涨（量增价涨，趋势健康）";
  } else if (todayVsAvg > 1.5 && todayChange < 0) {
    volumePriceRelation = "放量下跌（量增价跌，恐慌抛售信号）";
  } else if (todayVsAvg < 0.7 && todayChange > 0) {
    volumePriceRelation = "缩量上涨（量缩价涨，上涨动力不足）";
  } else if (todayVsAvg < 0.7 && todayChange < 0) {
    volumePriceRelation = "缩量下跌（量缩价跌，卖压减弱）";
  } else {
    volumePriceRelation = "量价配合正常";
  }

  let volumeTrend: string;
  if (volRatio5vs20 > 1.5) {
    volumeTrend = "近期持续放量";
  } else if (volRatio5vs20 < 0.6) {
    volumeTrend = "近期持续缩量";
  } else {
    volumeTrend = "成交量平稳";
  }

  return {
    todayVolume: todayVol,
    avgVolume5: Math.round(avgVol5),
    avgVolume10: Math.round(avgVol10),
    avgVolume20: Math.round(avgVol20),
    volumeRatio: todayVsAvg,
    volumePriceRelation,
    volumeTrend,
  };
}

/** Moving Average System Analysis */
function analyzeMAs(closes: number[]) {
  const ma5 = calculateMA(closes, 5);
  const ma10 = calculateMA(closes, 10);
  const ma20 = calculateMA(closes, 20);
  const ma60 = calculateMA(closes, 60);
  const ma120 = calculateMA(closes, 120);
  const ma250 = calculateMA(closes, 250);
  const currentPrice = closes[closes.length - 1];

  // MA arrangement
  const shortMAs = [ma5, ma10, ma20].filter((m): m is number => m !== null);
  const isLongArrangement =
    shortMAs.length === 3 &&
    shortMAs[0] > shortMAs[1] &&
    shortMAs[1] > shortMAs[2];
  const isShortArrangement =
    shortMAs.length === 3 &&
    shortMAs[0] < shortMAs[1] &&
    shortMAs[1] < shortMAs[2];

  let arrangement: string;
  if (isLongArrangement) arrangement = "多头排列（MA5>MA10>MA20，强势上涨形态）";
  else if (isShortArrangement)
    arrangement = "空头排列（MA5<MA10<MA20，弱势下跌形态）";
  else arrangement = "均线交织（方向不明，震荡整理）";

  // Distance from MA250
  let ma250Status: string | null = null;
  if (ma250 !== null) {
    const dist = ((currentPrice - ma250) / ma250) * 100;
    if (dist > 20) ma250Status = `远高于年线${dist.toFixed(1)}%，注意中期风险`;
    else if (dist > 0) ma250Status = `站上年线${dist.toFixed(1)}%，中期偏多`;
    else if (dist > -10) ma250Status = `略低于年线${Math.abs(dist).toFixed(1)}%，关注能否收复`;
    else ma250Status = `远低于年线${Math.abs(dist).toFixed(1)}%，中期偏弱`;
  }

  // Support & resistance
  const supports: string[] = [];
  const resistances: string[] = [];
  const maLevels = [
    { val: ma5, name: "MA5" },
    { val: ma10, name: "MA10" },
    { val: ma20, name: "MA20" },
    { val: ma60, name: "MA60" },
    { val: ma120, name: "MA120" },
    { val: ma250, name: "MA250(年线)" },
  ];

  for (const ma of maLevels) {
    if (ma.val === null) continue;
    const dist = ((currentPrice - ma.val) / ma.val) * 100;
    if (dist > 0 && dist < 5) {
      supports.push(`${ma.name}: ${ma.val.toFixed(2)}（支撑，距离${dist.toFixed(1)}%）`);
    } else if (dist < 0 && dist > -5) {
      resistances.push(`${ma.name}: ${ma.val.toFixed(2)}（压力，距离${Math.abs(dist).toFixed(1)}%）`);
    }
  }

  return {
    ma5: ma5?.toFixed(2) ?? null,
    ma10: ma10?.toFixed(2) ?? null,
    ma20: ma20?.toFixed(2) ?? null,
    ma60: ma60?.toFixed(2) ?? null,
    ma120: ma120?.toFixed(2) ?? null,
    ma250: ma250?.toFixed(2) ?? null,
    arrangement,
    ma250Status,
    nearbySupports: supports.slice(0, 3),
    nearbyResistances: resistances.slice(0, 3),
  };
}

/** Yearly Percentile */
function calculateYearlyPercentile(closes: number[]): number {
  if (closes.length < 20) return 50;
  const yearData = closes.slice(-250);
  const currentPrice = yearData[yearData.length - 1];
  const sorted = [...yearData].sort((a, b) => a - b);
  const index = sorted.findIndex((p) => p >= currentPrice);
  return (index / sorted.length) * 100;
}

/** Simple Chan Theory analysis (缠论简析) */
function analyzeChanTheory(klineData: StockKLinePoint[]) {
  if (klineData.length < 30) return null;

  const recent = klineData.slice(-60);

  // Find local highs and lows (simplified 笔)
  const pivots: Array<{ type: "high" | "low"; price: number; index: number; date: string }> = [];

  for (let i = 2; i < recent.length - 2; i++) {
    const isHigh =
      recent[i].high > recent[i - 1].high &&
      recent[i].high > recent[i - 2].high &&
      recent[i].high > recent[i + 1].high &&
      recent[i].high > recent[i + 2].high;
    const isLow =
      recent[i].low < recent[i - 1].low &&
      recent[i].low < recent[i - 2].low &&
      recent[i].low < recent[i + 1].low &&
      recent[i].low < recent[i + 2].low;

    if (isHigh) pivots.push({ type: "high", price: recent[i].high, index: i, date: recent[i].date });
    if (isLow) pivots.push({ type: "low", price: recent[i].low, index: i, date: recent[i].date });
  }

  // Filter to alternating high/low pivots (笔)
  const strokes: typeof pivots = [];
  for (const p of pivots) {
    if (strokes.length === 0) {
      strokes.push(p);
    } else {
      const last = strokes[strokes.length - 1];
      if (last.type === p.type) {
        // Same type, keep the more extreme one
        if (p.type === "high" && p.price > last.price) strokes[strokes.length - 1] = p;
        if (p.type === "low" && p.price < last.price) strokes[strokes.length - 1] = p;
      } else {
        strokes.push(p);
      }
    }
  }

  // Determine trend from strokes
  let trend = "震荡";
  if (strokes.length >= 4) {
    const recentHighs = strokes.filter((s) => s.type === "high").slice(-2);
    const recentLows = strokes.filter((s) => s.type === "low").slice(-2);

    if (recentHighs.length === 2 && recentLows.length === 2) {
      const highsRising = recentHighs[1].price > recentHighs[0].price;
      const lowsRising = recentLows[1].price > recentLows[0].price;
      const highsFalling = recentHighs[1].price < recentHighs[0].price;
      const lowsFalling = recentLows[1].price < recentLows[0].price;

      if (highsRising && lowsRising) trend = "上升趋势（高点抬高 + 低点抬高）";
      else if (highsFalling && lowsFalling) trend = "下降趋势（高点降低 + 低点降低）";
      else trend = "震荡整理";
    }
  }

  // Find potential 中枢 (hub) - overlapping price range of segments
  let hub: { high: number; low: number; description: string } | null = null;
  if (strokes.length >= 5) {
    // Look at last 5 strokes for overlapping range
    const lastStrokes = strokes.slice(-5);
    const segHighs = lastStrokes.filter((s) => s.type === "high").map((s) => s.price);
    const segLows = lastStrokes.filter((s) => s.type === "low").map((s) => s.price);

    if (segHighs.length >= 2 && segLows.length >= 2) {
      const hubHigh = Math.min(...segHighs);
      const hubLow = Math.max(...segLows);
      if (hubHigh > hubLow) {
        hub = {
          high: hubHigh,
          low: hubLow,
          description: `中枢区间: ${hubLow.toFixed(2)} - ${hubHigh.toFixed(2)}`,
        };
      }
    }
  }

  // Current price relation to structure
  const currentPrice = recent[recent.length - 1].close;
  let structureSignal: string;
  if (hub) {
    if (currentPrice > hub.high) {
      structureSignal = "股价在中枢上方，若回踩不进入中枢则形成三买信号";
    } else if (currentPrice < hub.low) {
      structureSignal = "股价在中枢下方，关注是否出现背驰（下跌力度衰竭）形成一买信号";
    } else {
      structureSignal = "股价在中枢内部震荡，等待方向选择";
    }
  } else {
    structureSignal = "近期未形成明显中枢结构";
  }

  return {
    strokeCount: strokes.length,
    trend,
    hub: hub
      ? { high: hub.high.toFixed(2), low: hub.low.toFixed(2), description: hub.description }
      : null,
    structureSignal,
    recentPivots: strokes.slice(-4).map((s) => ({
      type: s.type === "high" ? "高点" : "低点",
      price: s.price.toFixed(2),
      date: s.date,
    })),
  };
}

/** K-line pattern recognition */
function detectKLinePatterns(klineData: StockKLinePoint[]) {
  if (klineData.length < 3) return [];

  const patterns: string[] = [];
  const last = klineData[klineData.length - 1];
  const prev = klineData[klineData.length - 2];
  const prev2 = klineData[klineData.length - 3];

  const lastBody = Math.abs(last.close - last.open);
  const lastRange = last.high - last.low;
  const lastUpperShadow = last.high - Math.max(last.close, last.open);
  const lastLowerShadow = Math.min(last.close, last.open) - last.low;

  // Hammer (lower shadow > 2x body, small upper shadow)
  if (
    lastLowerShadow > lastBody * 2 &&
    lastUpperShadow < lastBody * 0.5 &&
    last.changePercent < 0
  ) {
    patterns.push("锤子线（长下影线，出现在下跌中可能反转）");
  }

  // Shooting star
  if (
    lastUpperShadow > lastBody * 2 &&
    lastLowerShadow < lastBody * 0.5 &&
    last.changePercent > 0
  ) {
    patterns.push("射击之星（长上影线，出现在上涨末期警惕回调）");
  }

  // Doji
  if (lastBody < lastRange * 0.1 && lastRange > 0) {
    patterns.push("十字星（多空力量均衡，可能变盘）");
  }

  // Bullish engulfing
  if (
    prev.close < prev.open && // prev is bearish
    last.close > last.open && // last is bullish
    last.close > prev.open &&
    last.open < prev.close
  ) {
    patterns.push("看涨吞没（大阳线吞没前日阴线，看涨信号）");
  }

  // Bearish engulfing
  if (
    prev.close > prev.open && // prev is bullish
    last.close < last.open && // last is bearish
    last.open > prev.close &&
    last.close < prev.open
  ) {
    patterns.push("看跌吞没（大阴线吞没前日阳线，看跌信号）");
  }

  // Morning star (simplified)
  if (
    prev2.close < prev2.open && // day 1: bearish
    Math.abs(prev.close - prev.open) < (prev.high - prev.low) * 0.3 && // day 2: small body (star)
    last.close > last.open && // day 3: bullish
    last.close > (prev2.open + prev2.close) / 2 // close above midpoint of day 1
  ) {
    patterns.push("早晨之星（强烈看涨反转形态）");
  }

  // Evening star (simplified)
  if (
    prev2.close > prev2.open &&
    Math.abs(prev.close - prev.open) < (prev.high - prev.low) * 0.3 &&
    last.close < last.open &&
    last.close < (prev2.open + prev2.close) / 2
  ) {
    patterns.push("黄昏之星（强烈看跌反转形态）");
  }

  return patterns;
}

/** Generate comprehensive signal summary */
function generateSignalSummary(indicators: {
  rsi: number;
  macd: ReturnType<typeof calculateMACD>;
  kdj: ReturnType<typeof calculateKDJ>;
  bollinger: ReturnType<typeof calculateBollinger>;
  mas: ReturnType<typeof analyzeMAs>;
  volume: ReturnType<typeof analyzeVolume>;
  chanTheory: ReturnType<typeof analyzeChanTheory>;
  patterns: string[];
  yearlyPercentile: number;
  currentPrice: number;
}) {
  const bullishSignals: string[] = [];
  const bearishSignals: string[] = [];
  const neutralSignals: string[] = [];

  // RSI
  if (indicators.rsi < 30) bullishSignals.push(`RSI=${indicators.rsi.toFixed(1)} 超卖`);
  else if (indicators.rsi < 40) bullishSignals.push(`RSI=${indicators.rsi.toFixed(1)} 接近超卖`);
  else if (indicators.rsi > 70) bearishSignals.push(`RSI=${indicators.rsi.toFixed(1)} 超买`);
  else if (indicators.rsi > 60) bearishSignals.push(`RSI=${indicators.rsi.toFixed(1)} 接近超买`);
  else neutralSignals.push(`RSI=${indicators.rsi.toFixed(1)} 中性`);

  // MACD
  if (indicators.macd) {
    if (indicators.macd.isGoldenCross) bullishSignals.push("MACD金叉");
    if (indicators.macd.isDeathCross) bearishSignals.push("MACD死叉");
    if (indicators.macd.bottomDivergence) bullishSignals.push("MACD底背离（强看涨信号）");
    if (indicators.macd.topDivergence) bearishSignals.push("MACD顶背离（强看跌信号）");
    if (indicators.macd.histogram > 0 && !indicators.macd.isGoldenCross && !indicators.macd.topDivergence)
      neutralSignals.push(indicators.macd.histTrend);
    if (indicators.macd.histogram < 0 && !indicators.macd.isDeathCross && !indicators.macd.bottomDivergence)
      neutralSignals.push(indicators.macd.histTrend);
  }

  // KDJ
  if (indicators.kdj) {
    if (indicators.kdj.isOversold) bullishSignals.push("KDJ超卖区");
    if (indicators.kdj.isOverbought) bearishSignals.push("KDJ超买区");
    if (indicators.kdj.J < 0) bullishSignals.push(`J值=${indicators.kdj.J.toFixed(1)} 极端超卖`);
    if (indicators.kdj.J > 100) bearishSignals.push(`J值=${indicators.kdj.J.toFixed(1)} 极端超买`);
  }

  // Bollinger
  if (indicators.bollinger) {
    if (indicators.currentPrice <= indicators.bollinger.lower)
      bullishSignals.push("触及布林带下轨（可能反弹）");
    else if (indicators.currentPrice >= indicators.bollinger.upper)
      bearishSignals.push("触及布林带上轨（可能回调）");
    if (indicators.bollinger.bandwidth < 5)
      neutralSignals.push("布林带缩口（即将变盘）");
  }

  // MA arrangement
  if (indicators.mas) {
    if (indicators.mas.arrangement.includes("多头"))
      bullishSignals.push("均线多头排列");
    else if (indicators.mas.arrangement.includes("空头"))
      bearishSignals.push("均线空头排列");
  }

  // Volume
  if (indicators.volume) {
    if (indicators.volume.volumePriceRelation.includes("放量上涨"))
      bullishSignals.push("放量上涨");
    if (indicators.volume.volumePriceRelation.includes("放量下跌"))
      bearishSignals.push("放量下跌");
    if (indicators.volume.volumePriceRelation.includes("缩量下跌"))
      bullishSignals.push("缩量下跌（卖压减弱）");
  }

  // Chan Theory
  if (indicators.chanTheory) {
    if (indicators.chanTheory.trend.includes("上升"))
      bullishSignals.push("缠论：" + indicators.chanTheory.trend);
    else if (indicators.chanTheory.trend.includes("下降"))
      bearishSignals.push("缠论：" + indicators.chanTheory.trend);
    if (indicators.chanTheory.structureSignal.includes("三买"))
      bullishSignals.push("缠论三买信号附近");
    if (indicators.chanTheory.structureSignal.includes("一买"))
      bullishSignals.push("缠论一买信号区域（注意确认）");
  }

  // Yearly percentile
  if (indicators.yearlyPercentile <= 10)
    bullishSignals.push(`年内最低${indicators.yearlyPercentile.toFixed(0)}%区间（极低估值）`);
  else if (indicators.yearlyPercentile <= 20)
    bullishSignals.push(`年内较低${indicators.yearlyPercentile.toFixed(0)}%区间`);
  else if (indicators.yearlyPercentile >= 90)
    bearishSignals.push(`年内最高${indicators.yearlyPercentile.toFixed(0)}%区间（估值偏高）`);
  else if (indicators.yearlyPercentile >= 80)
    bearishSignals.push(`年内较高${indicators.yearlyPercentile.toFixed(0)}%区间`);

  // K-line patterns
  for (const p of indicators.patterns) {
    if (p.includes("看涨") || p.includes("锤子") || p.includes("早晨"))
      bullishSignals.push(p);
    else if (p.includes("看跌") || p.includes("射击") || p.includes("黄昏"))
      bearishSignals.push(p);
    else neutralSignals.push(p);
  }

  // Overall assessment
  const bullScore = bullishSignals.length;
  const bearScore = bearishSignals.length;
  let overallAssessment: string;
  let signalDirection: string;

  if (bullScore >= bearScore + 3) {
    signalDirection = "偏多";
    overallAssessment = "多个看涨信号共振，技术面偏多，可考虑关注或轻仓参与";
  } else if (bearScore >= bullScore + 3) {
    signalDirection = "偏空";
    overallAssessment = "多个看跌信号出现，技术面偏空，建议观望或注意风险控制";
  } else if (bullScore > bearScore) {
    signalDirection = "中性偏多";
    overallAssessment = "看涨信号略占优，但信号不够强烈，建议谨慎关注";
  } else if (bearScore > bullScore) {
    signalDirection = "中性偏空";
    overallAssessment = "看跌信号略占优，建议保持观望为主";
  } else {
    signalDirection = "中性";
    overallAssessment = "多空信号均衡，方向不明，建议等待明确信号";
  }

  return {
    bullishSignals,
    bearishSignals,
    neutralSignals,
    signalDirection,
    overallAssessment,
  };
}

// ======== Main Tool ========

export const stockAnalyzerTool = createTool({
  id: "stock-analyzer",
  description:
    "综合股票技术分析工具。当用户问到任何个股（如'茅台怎么样'、'600519如何'、'分析一下XX股票'）时，必须调用此工具。自动获取实时行情、K线数据，计算RSI、MACD、布林带、KDJ、均线系统、成交量分析、缠论结构、K线形态等全部技术指标，并生成综合研判。",
  inputSchema: z.object({
    query: z
      .string()
      .describe("股票代码或名称，例如 '600519' 或 '贵州茅台'"),
  }),
  execute: async ({ query }) => {
    // 1. Resolve stock code
    const isCode = /^\d{6}$/.test(query);
    let market: number;
    let code: string;
    let stockName: string;

    if (isCode) {
      market = query.startsWith("6") ? 1 : 0;
      code = query;
      stockName = query;
    } else {
      const results = await searchStocks(query);
      if (results.length === 0) {
        return { error: true, message: `未找到与"${query}"相关的股票` };
      }
      market = results[0].market;
      code = results[0].code;
      stockName = results[0].name;
    }

    // 2. Fetch data in parallel
    const [quote, klineDaily] = await Promise.all([
      fetchStockQuote(market, code).catch(() => null),
      fetchStockKLine(market, code, "daily", 300).catch(() => []),
    ]);

    if (!quote) {
      return { error: true, message: `无法获取 ${stockName}(${code}) 的实时行情` };
    }

    if (klineDaily.length < 30) {
      return {
        error: false,
        quote: {
          code: quote.code,
          name: quote.name,
          price: quote.price,
          changePercent: `${quote.changePercent > 0 ? "+" : ""}${quote.changePercent.toFixed(2)}%`,
          volume: `${(quote.volume / 10000).toFixed(0)}万手`,
          amount: `${(quote.amount / 100000000).toFixed(2)}亿`,
          pe: quote.pe.toFixed(2),
          pb: quote.pb.toFixed(2),
          marketCap: `${(quote.totalMarketCap / 100000000).toFixed(0)}亿`,
        },
        message: "K线数据不足，无法进行完整技术分析",
      };
    }

    // 3. Calculate all technical indicators
    const closes = klineDaily.map((d) => d.close);
    const currentPrice = closes[closes.length - 1];

    const rsi = calculateRSI(closes, 14);
    const bollinger = calculateBollinger(closes, 20);
    const macd = calculateMACD(closes);
    const kdj = calculateKDJ(klineDaily, 9);
    const mas = analyzeMAs(closes);
    const volume = analyzeVolume(klineDaily);
    const chanTheory = analyzeChanTheory(klineDaily);
    const yearlyPercentile = calculateYearlyPercentile(closes);
    const patterns = detectKLinePatterns(klineDaily);

    // 4. Generate signal summary
    const signals = generateSignalSummary({
      rsi,
      macd,
      kdj,
      bollinger,
      mas,
      volume,
      chanTheory,
      patterns,
      yearlyPercentile,
      currentPrice,
    });

    // 5. Recent K-line summary (last 5 days)
    const recentKLine = klineDaily.slice(-5).map((d) => ({
      date: d.date,
      open: d.open.toFixed(2),
      close: d.close.toFixed(2),
      high: d.high.toFixed(2),
      low: d.low.toFixed(2),
      changePercent: `${d.changePercent > 0 ? "+" : ""}${d.changePercent.toFixed(2)}%`,
      volume: `${(d.volume / 10000).toFixed(0)}万手`,
    }));

    return {
      error: false,
      // Basic quote info
      quote: {
        code: quote.code,
        name: quote.name,
        price: quote.price,
        change: quote.change,
        changePercent: `${quote.changePercent > 0 ? "+" : ""}${quote.changePercent.toFixed(2)}%`,
        open: quote.open,
        high: quote.high,
        low: quote.low,
        preClose: quote.preClose,
        volume: `${(quote.volume / 10000).toFixed(0)}万手`,
        amount: `${(quote.amount / 100000000).toFixed(2)}亿`,
        turnoverRate: `${quote.turnoverRate.toFixed(2)}%`,
        pe: quote.pe.toFixed(2),
        pb: quote.pb.toFixed(2),
        marketCap: `${(quote.totalMarketCap / 100000000).toFixed(0)}亿`,
      },
      // Technical indicators
      indicators: {
        rsi: { value: rsi.toFixed(1), interpretation: rsi < 30 ? "超卖区" : rsi > 70 ? "超买区" : rsi < 50 ? "偏空" : "偏多" },
        macd: macd
          ? {
              DIF: macd.DIF.toFixed(3),
              DEA: macd.DEA.toFixed(3),
              histogram: macd.histogram.toFixed(3),
              position: macd.position,
              histTrend: macd.histTrend,
              goldenCross: macd.isGoldenCross,
              deathCross: macd.isDeathCross,
              bottomDivergence: macd.bottomDivergence,
              topDivergence: macd.topDivergence,
            }
          : null,
        bollinger: bollinger
          ? {
              upper: bollinger.upper.toFixed(2),
              middle: bollinger.middle.toFixed(2),
              lower: bollinger.lower.toFixed(2),
              bandwidth: `${bollinger.bandwidth.toFixed(1)}%`,
              pricePosition:
                currentPrice >= bollinger.upper
                  ? "触及上轨"
                  : currentPrice <= bollinger.lower
                    ? "触及下轨"
                    : currentPrice > bollinger.middle
                      ? "中轨上方"
                      : "中轨下方",
            }
          : null,
        kdj: kdj
          ? {
              K: kdj.K.toFixed(1),
              D: kdj.D.toFixed(1),
              J: kdj.J.toFixed(1),
              zone: kdj.zone,
            }
          : null,
        movingAverages: mas,
        volume,
        yearlyPercentile: `${yearlyPercentile.toFixed(0)}%`,
      },
      // Chan Theory
      chanTheory,
      // K-line patterns
      kLinePatterns: patterns.length > 0 ? patterns : ["近期无明显K线形态"],
      // Recent K-line data
      recentKLine,
      // Signal summary
      signalSummary: signals,
      // Risk warning
      riskWarning:
        "以上分析基于历史数据和技术指标，仅供参考。技术分析有其局限性，请务必结合基本面、政策面、资金面等综合判断。投资有风险，入市需谨慎。",
    };
  },
});
