import type { LessonChart } from "@/types/education";

// --- Simulated price data generators ---

function generatePriceData(
  startPrice: number,
  days: number,
  trend: "up" | "down" | "sideways" | "volatile",
  seed = 42,
): { dates: string[]; opens: number[]; closes: number[]; highs: number[]; lows: number[]; volumes: number[] } {
  const dates: string[] = [];
  const opens: number[] = [];
  const closes: number[] = [];
  const highs: number[] = [];
  const lows: number[] = [];
  const volumes: number[] = [];

  let price = startPrice;
  let s = seed;
  const rand = () => {
    s = (s * 16807 + 0) % 2147483647;
    return s / 2147483647;
  };

  const baseDate = new Date(2025, 0, 2);

  for (let i = 0; i < days; i++) {
    const d = new Date(baseDate);
    d.setDate(d.getDate() + i);
    if (d.getDay() === 0 || d.getDay() === 6) continue;

    dates.push(`${d.getMonth() + 1}/${d.getDate()}`);

    const drift =
      trend === "up" ? 0.002 : trend === "down" ? -0.002 : trend === "volatile" ? 0 : 0.0005;
    const volatility = trend === "volatile" ? 0.03 : 0.015;

    const change = drift + (rand() - 0.5) * 2 * volatility;
    const open = price;
    const close = price * (1 + change);
    const high = Math.max(open, close) * (1 + rand() * 0.008);
    const low = Math.min(open, close) * (1 - rand() * 0.008);
    const vol = Math.round((800 + rand() * 600) * (1 + Math.abs(change) * 20));

    opens.push(Math.round(open * 100) / 100);
    closes.push(Math.round(close * 100) / 100);
    highs.push(Math.round(high * 100) / 100);
    lows.push(Math.round(low * 100) / 100);
    volumes.push(vol);

    price = close;
  }

  return { dates, opens, closes, highs, lows, volumes };
}

function calcMA(data: number[], period: number): (number | null)[] {
  return data.map((_, i) => {
    if (i < period - 1) return null;
    const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
    return Math.round((sum / period) * 100) / 100;
  });
}

function calcBollingerBands(
  closes: number[],
  period: number,
): { upper: (number | null)[]; middle: (number | null)[]; lower: (number | null)[] } {
  const upper: (number | null)[] = [];
  const middle: (number | null)[] = [];
  const lower: (number | null)[] = [];

  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) {
      upper.push(null);
      middle.push(null);
      lower.push(null);
      continue;
    }
    const slice = closes.slice(i - period + 1, i + 1);
    const mean = slice.reduce((a, b) => a + b, 0) / period;
    const variance = slice.reduce((sum, val) => sum + (val - mean) ** 2, 0) / period;
    const stdDev = Math.sqrt(variance);
    middle.push(Math.round(mean * 100) / 100);
    upper.push(Math.round((mean + 2 * stdDev) * 100) / 100);
    lower.push(Math.round((mean - 2 * stdDev) * 100) / 100);
  }

  return { upper, middle, lower };
}

function calcMACD(
  closes: number[],
): { dif: number[]; dea: number[]; histogram: number[] } {
  const ema = (data: number[], period: number): number[] => {
    const result: number[] = [];
    const k = 2 / (period + 1);
    result[0] = data[0];
    for (let i = 1; i < data.length; i++) {
      result[i] = data[i] * k + result[i - 1] * (1 - k);
    }
    return result;
  };

  const ema12 = ema(closes, 12);
  const ema26 = ema(closes, 26);
  const dif = ema12.map((v, i) => Math.round((v - ema26[i]) * 100) / 100);
  const dea = ema(dif, 9).map((v) => Math.round(v * 100) / 100);
  const histogram = dif.map((v, i) => Math.round((v - dea[i]) * 2 * 100) / 100);

  return { dif, dea, histogram };
}

function calcRSI(closes: number[], period = 14): number[] {
  const result: number[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (i < period) {
      result.push(50);
      continue;
    }
    let gains = 0;
    let losses = 0;
    for (let j = i - period + 1; j <= i; j++) {
      const change = closes[j] - closes[j - 1];
      if (change > 0) gains += change;
      else losses += Math.abs(change);
    }
    const avgGain = gains / period;
    const avgLoss = losses / period;
    if (avgLoss === 0) {
      result.push(100);
      continue;
    }
    result.push(Math.round((100 - 100 / (1 + avgGain / avgLoss)) * 100) / 100);
  }
  return result;
}

function calcKDJ(
  closes: number[],
  highs: number[],
  lows: number[],
  period = 9,
): { k: number[]; d: number[]; j: number[] } {
  const kArr: number[] = [];
  const dArr: number[] = [];
  const jArr: number[] = [];

  let prevK = 50;
  let prevD = 50;

  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) {
      kArr.push(50);
      dArr.push(50);
      jArr.push(50);
      continue;
    }
    const highSlice = highs.slice(i - period + 1, i + 1);
    const lowSlice = lows.slice(i - period + 1, i + 1);
    const highN = Math.max(...highSlice);
    const lowN = Math.min(...lowSlice);
    const rsv = highN === lowN ? 50 : ((closes[i] - lowN) / (highN - lowN)) * 100;
    const k = (2 / 3) * prevK + (1 / 3) * rsv;
    const d = (2 / 3) * prevD + (1 / 3) * k;
    const j = 3 * k - 2 * d;

    kArr.push(Math.round(k * 100) / 100);
    dArr.push(Math.round(d * 100) / 100);
    jArr.push(Math.round(j * 100) / 100);

    prevK = k;
    prevD = d;
  }

  return { k: kArr, d: dArr, j: jArr };
}

// --- Crossover detection utility ---

interface CrossPoint {
  index: number;
  type: "golden" | "death";
  value: number;
}

function findCrossovers(fast: number[], slow: number[], startIdx = 0): CrossPoint[] {
  const crosses: CrossPoint[] = [];
  for (let i = Math.max(startIdx, 1); i < fast.length; i++) {
    const prevDiff = fast[i - 1] - slow[i - 1];
    const currDiff = fast[i] - slow[i];
    if (prevDiff <= 0 && currDiff > 0) {
      crosses.push({ index: i, type: "golden", value: fast[i] });
    } else if (prevDiff >= 0 && currDiff < 0) {
      crosses.push({ index: i, type: "death", value: fast[i] });
    }
  }
  return crosses;
}

// Color constants
const UP_COLOR = "#ef5350";
const DOWN_COLOR = "#26a69a";
const GOLDEN_COLOR = "#cf1322";
const DEATH_COLOR = "#389e0d";
const ANNOTATION_BG = "rgba(255,255,255,0.9)";

// --- Chart configurations per lesson ---

export function getBollingerCharts(): LessonChart[] {
  const data = generatePriceData(25, 90, "volatile", 101);
  const boll = calcBollingerBands(data.closes, 20);

  // Find touch points: price near upper/lower band
  const touchUpper: { idx: number; price: number }[] = [];
  const touchLower: { idx: number; price: number }[] = [];

  for (let i = 20; i < data.closes.length; i++) {
    const u = boll.upper[i];
    const l = boll.lower[i];
    if (u !== null && data.highs[i] >= u * 0.998) {
      // Avoid clustering: only if last touch was > 5 bars ago
      if (touchUpper.length === 0 || i - touchUpper[touchUpper.length - 1].idx > 5) {
        touchUpper.push({ idx: i, price: data.highs[i] });
      }
    }
    if (l !== null && data.lows[i] <= l * 1.002) {
      if (touchLower.length === 0 || i - touchLower[touchLower.length - 1].idx > 5) {
        touchLower.push({ idx: i, price: data.lows[i] });
      }
    }
  }

  // Build markPoint data
  const markPointData: Record<string, unknown>[] = [];
  for (const t of touchUpper.slice(0, 3)) {
    markPointData.push({
      coord: [data.dates[t.idx], t.price],
      value: "触及上轨\n注意回调",
      symbol: "pin",
      symbolSize: 50,
      symbolRotate: 0,
      itemStyle: { color: DEATH_COLOR },
      label: { fontSize: 10, color: "#fff", lineHeight: 13 },
    });
  }
  for (const t of touchLower.slice(0, 3)) {
    markPointData.push({
      coord: [data.dates[t.idx], t.price],
      value: "触及下轨\n关注反弹",
      symbol: "pin",
      symbolSize: 50,
      symbolRotate: 180,
      symbolOffset: [0, "50%"],
      itemStyle: { color: GOLDEN_COLOR },
      label: { fontSize: 10, color: "#fff", lineHeight: 13, rotate: 180 },
    });
  }

  // Find band squeeze (narrowest bandwidth)
  let minBW = Infinity;
  let squeezeIdx = -1;
  for (let i = 20; i < data.closes.length - 5; i++) {
    const u = boll.upper[i] as number;
    const l = boll.lower[i] as number;
    const bw = u - l;
    if (bw < minBW) {
      minBW = bw;
      squeezeIdx = i;
    }
  }

  return [
    {
      id: "boll-main",
      title: "布林线示例 — 股价与上轨/中轨/下轨（标注触轨信号）",
      option: {
        tooltip: { trigger: "axis", axisPointer: { type: "cross" } },
        legend: { data: ["日K", "上轨", "中轨", "下轨"], top: 0 },
        grid: { left: "12%", right: "5%", top: 40, bottom: 30 },
        xAxis: { type: "category", data: data.dates, axisLabel: { fontSize: 11 } },
        yAxis: { type: "value", scale: true, axisLabel: { fontSize: 11 } },
        series: [
          {
            name: "日K",
            type: "candlestick",
            data: data.dates.map((_, i) => [data.opens[i], data.closes[i], data.lows[i], data.highs[i]]),
            itemStyle: { color: UP_COLOR, color0: DOWN_COLOR, borderColor: UP_COLOR, borderColor0: DOWN_COLOR },
            markPoint: { data: markPointData },
            markArea: squeezeIdx > 0 ? {
              silent: true,
              data: [[
                { xAxis: data.dates[squeezeIdx - 3], itemStyle: { color: "rgba(255,165,0,0.12)" } },
                { xAxis: data.dates[squeezeIdx + 3] },
              ]],
              label: {
                show: true,
                position: "insideTop",
                formatter: "缩口 → 变盘信号",
                fontSize: 11,
                color: "#e65100",
                fontWeight: "bold",
                backgroundColor: ANNOTATION_BG,
                padding: [2, 6],
                borderRadius: 3,
              },
            } : undefined,
          },
          {
            name: "上轨",
            type: "line",
            data: boll.upper,
            lineStyle: { color: "#e57373", width: 1, type: "dashed" },
            symbol: "none",
          },
          {
            name: "中轨",
            type: "line",
            data: boll.middle,
            lineStyle: { color: "#ffa726", width: 1.5 },
            symbol: "none",
          },
          {
            name: "下轨",
            type: "line",
            data: boll.lower,
            lineStyle: { color: "#66bb6a", width: 1, type: "dashed" },
            symbol: "none",
          },
        ],
      },
    },
  ];
}

export function getMACDCharts(): LessonChart[] {
  const data = generatePriceData(18, 120, "volatile", 202);
  const macd = calcMACD(data.closes);

  // Find golden/death crosses between DIF and DEA
  const crosses = findCrossovers(macd.dif, macd.dea, 26);

  const macdMarkPoints = crosses.slice(0, 6).map((c) => ({
    coord: [data.dates[c.index], c.value],
    value: c.type === "golden" ? "金叉" : "死叉",
    symbol: "arrow",
    symbolSize: 14,
    symbolRotate: c.type === "golden" ? 0 : 180,
    itemStyle: { color: c.type === "golden" ? GOLDEN_COLOR : DEATH_COLOR },
    label: {
      show: true,
      formatter: c.type === "golden" ? "⬆ 金叉买入" : "⬇ 死叉卖出",
      fontSize: 11,
      fontWeight: "bold",
      color: c.type === "golden" ? GOLDEN_COLOR : DEATH_COLOR,
      position: c.type === "golden" ? "top" : "bottom",
      backgroundColor: ANNOTATION_BG,
      padding: [2, 6],
      borderRadius: 3,
      borderColor: c.type === "golden" ? GOLDEN_COLOR : DEATH_COLOR,
      borderWidth: 1,
    },
  }));

  // Find histogram color transition points (green→red = buy signal)
  const histTransitions: { idx: number; type: "buy" | "sell" }[] = [];
  for (let i = 27; i < macd.histogram.length; i++) {
    if (macd.histogram[i - 1] < 0 && macd.histogram[i] >= 0) {
      histTransitions.push({ idx: i, type: "buy" });
    } else if (macd.histogram[i - 1] >= 0 && macd.histogram[i] < 0) {
      histTransitions.push({ idx: i, type: "sell" });
    }
  }

  // Add zero line annotation
  return [
    {
      id: "macd-main",
      title: "MACD 指标示例 — 金叉/死叉标注",
      option: {
        tooltip: { trigger: "axis", axisPointer: { type: "cross" } },
        legend: { data: ["日K", "DIF", "DEA", "MACD柱"], top: 0 },
        grid: [
          { left: "12%", right: "5%", top: 40, height: "38%" },
          { left: "12%", right: "5%", top: "58%", height: "35%" },
        ],
        xAxis: [
          { type: "category", data: data.dates, axisLabel: { fontSize: 11 }, gridIndex: 0 },
          { type: "category", data: data.dates, axisLabel: { fontSize: 11 }, gridIndex: 1 },
        ],
        yAxis: [
          { type: "value", scale: true, axisLabel: { fontSize: 11 }, gridIndex: 0 },
          { type: "value", scale: true, axisLabel: { fontSize: 11 }, gridIndex: 1 },
        ],
        series: [
          {
            name: "日K",
            type: "candlestick",
            data: data.dates.map((_, i) => [data.opens[i], data.closes[i], data.lows[i], data.highs[i]]),
            itemStyle: { color: UP_COLOR, color0: DOWN_COLOR, borderColor: UP_COLOR, borderColor0: DOWN_COLOR },
            xAxisIndex: 0,
            yAxisIndex: 0,
          },
          {
            name: "DIF",
            type: "line",
            data: macd.dif,
            lineStyle: { color: "#1677ff", width: 1.5 },
            symbol: "none",
            xAxisIndex: 1,
            yAxisIndex: 1,
            markPoint: { data: macdMarkPoints },
          },
          {
            name: "DEA",
            type: "line",
            data: macd.dea,
            lineStyle: { color: "#ff9800", width: 1.5 },
            symbol: "none",
            xAxisIndex: 1,
            yAxisIndex: 1,
          },
          {
            name: "MACD柱",
            type: "bar",
            data: macd.histogram.map((v) => ({
              value: v,
              itemStyle: { color: v >= 0 ? UP_COLOR : DOWN_COLOR },
            })),
            xAxisIndex: 1,
            yAxisIndex: 1,
            markLine: {
              silent: true,
              symbol: "none",
              lineStyle: { color: "#999", type: "dashed", width: 1 },
              data: [{ yAxis: 0, label: { formatter: "零轴", fontSize: 10, position: "insideEndTop" } }],
            },
          },
        ],
      },
    },
  ];
}

export function getKLinePatternCharts(): LessonChart[] {
  const hammerData = {
    dates: ["D1", "D2", "D3", "D4", "D5", "D6", "D7", "D8"],
    data: [
      [20.0, 19.2, 18.8, 20.1],
      [19.0, 18.3, 17.9, 19.1],
      [18.2, 17.5, 17.1, 18.3],
      [17.4, 17.6, 16.2, 17.7], // HAMMER
      [17.5, 18.2, 17.4, 18.3],
      [18.2, 18.9, 18.1, 19.0],
      [18.8, 19.5, 18.7, 19.6],
      [19.4, 20.1, 19.3, 20.2],
    ],
  };

  const morningStarData = {
    dates: ["D1", "D2", "D3", "D4", "D5", "D6", "D7"],
    data: [
      [22.0, 21.0, 20.8, 22.1],
      [21.0, 20.0, 19.8, 21.1],
      [19.8, 18.5, 18.2, 19.9], // BIG bearish
      [18.4, 18.5, 18.0, 18.6], // DOJI
      [18.6, 19.8, 18.5, 20.0], // BIG bullish
      [19.9, 20.5, 19.8, 20.6],
      [20.5, 21.2, 20.4, 21.3],
    ],
  };

  return [
    {
      id: "kline-hammer",
      title: "锤子线示例 — 下跌末期出现长下影线反转",
      option: {
        tooltip: { trigger: "axis", axisPointer: { type: "cross" } },
        grid: { left: "12%", right: "8%", top: 30, bottom: 30 },
        xAxis: { type: "category", data: hammerData.dates },
        yAxis: { type: "value", scale: true, min: 15.5 },
        series: [
          {
            type: "candlestick",
            data: hammerData.data,
            itemStyle: { color: UP_COLOR, color0: DOWN_COLOR, borderColor: UP_COLOR, borderColor0: DOWN_COLOR },
            markPoint: {
              data: [
                {
                  coord: ["D4", 16.0],
                  value: "",
                  symbol: "arrow",
                  symbolSize: 16,
                  symbolRotate: 0,
                  itemStyle: { color: GOLDEN_COLOR },
                  label: {
                    show: true,
                    formatter: "锤子线\n长下影线=多方反击\n买入信号",
                    fontSize: 11,
                    color: GOLDEN_COLOR,
                    fontWeight: "bold",
                    position: "bottom",
                    backgroundColor: ANNOTATION_BG,
                    padding: [4, 8],
                    borderRadius: 4,
                    borderColor: GOLDEN_COLOR,
                    borderWidth: 1,
                    lineHeight: 15,
                  },
                },
                {
                  coord: ["D5", 18.4],
                  value: "",
                  symbol: "pin",
                  symbolSize: 1,
                  label: {
                    show: true,
                    formatter: "确认阳线 →\n反转成立",
                    fontSize: 10,
                    color: "#1677ff",
                    position: "top",
                    backgroundColor: ANNOTATION_BG,
                    padding: [2, 6],
                    borderRadius: 3,
                    lineHeight: 14,
                  },
                },
              ],
            },
            markLine: {
              silent: true,
              symbol: "none",
              data: [
                [
                  { coord: ["D1", 20.0], lineStyle: { color: "#999", type: "dashed", width: 1 } },
                  { coord: ["D3", 17.5] },
                ],
              ],
              label: { formatter: "下跌趋势", fontSize: 10, color: "#999" },
            },
          },
        ],
      },
    },
    {
      id: "kline-morning-star",
      title: "早晨之星示例 — 大阴线 + 十字星 + 大阳线",
      option: {
        tooltip: { trigger: "axis", axisPointer: { type: "cross" } },
        grid: { left: "12%", right: "8%", top: 30, bottom: 30 },
        xAxis: { type: "category", data: morningStarData.dates },
        yAxis: { type: "value", scale: true, min: 17.5 },
        series: [
          {
            type: "candlestick",
            data: morningStarData.data,
            itemStyle: { color: UP_COLOR, color0: DOWN_COLOR, borderColor: UP_COLOR, borderColor0: DOWN_COLOR },
            markArea: {
              silent: true,
              data: [
                [
                  { xAxis: "D3", itemStyle: { color: "rgba(22,119,255,0.1)" } },
                  { xAxis: "D5" },
                ],
              ],
            },
            markPoint: {
              data: [
                {
                  coord: ["D3", 19.9],
                  symbol: "pin",
                  symbolSize: 1,
                  label: {
                    show: true,
                    formatter: "①大阴线",
                    fontSize: 11,
                    color: DEATH_COLOR,
                    fontWeight: "bold",
                    position: "top",
                    backgroundColor: ANNOTATION_BG,
                    padding: [2, 6],
                    borderRadius: 3,
                  },
                },
                {
                  coord: ["D4", 17.8],
                  symbol: "arrow",
                  symbolSize: 14,
                  itemStyle: { color: "#1677ff" },
                  label: {
                    show: true,
                    formatter: "②十字星\n(犹豫信号)",
                    fontSize: 11,
                    color: "#1677ff",
                    fontWeight: "bold",
                    position: "bottom",
                    backgroundColor: ANNOTATION_BG,
                    padding: [2, 6],
                    borderRadius: 3,
                    lineHeight: 14,
                  },
                },
                {
                  coord: ["D5", 20.1],
                  symbol: "pin",
                  symbolSize: 1,
                  label: {
                    show: true,
                    formatter: "③大阳线\n反转确认!",
                    fontSize: 11,
                    color: GOLDEN_COLOR,
                    fontWeight: "bold",
                    position: "top",
                    backgroundColor: ANNOTATION_BG,
                    padding: [2, 6],
                    borderRadius: 3,
                    lineHeight: 14,
                  },
                },
              ],
            },
          },
        ],
      },
    },
  ];
}

export function getChanTheoryCharts(): LessonChart[] {
  const pivotData = {
    dates: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20"],
    prices: [10, 12, 11, 13, 11.5, 14, 12, 13.5, 12.5, 15, 13, 14, 13.5, 16, 14.5, 15.5, 14, 17, 15.5, 18],
  };

  return [
    {
      id: "chan-pivot",
      title: "缠论示例 — 笔、线段与中枢区间",
      option: {
        tooltip: { trigger: "axis" },
        grid: { left: "10%", right: "8%", top: 30, bottom: 30 },
        xAxis: { type: "category", data: pivotData.dates, axisLabel: { fontSize: 11 } },
        yAxis: { type: "value", scale: true, axisLabel: { fontSize: 11 } },
        series: [
          {
            type: "line",
            data: pivotData.prices,
            lineStyle: { color: "#333", width: 2 },
            symbol: "circle",
            symbolSize: 6,
            itemStyle: { color: "#333" },
            markPoint: {
              data: [
                // Pen annotations
                { coord: ["1", 10], symbol: "pin", symbolSize: 1, label: { show: true, formatter: "低点", fontSize: 10, color: DOWN_COLOR, position: "bottom" } },
                { coord: ["2", 12], symbol: "pin", symbolSize: 1, label: { show: true, formatter: "高点", fontSize: 10, color: UP_COLOR, position: "top" } },
                { coord: ["3", 11], symbol: "pin", symbolSize: 1, label: { show: true, formatter: "低点", fontSize: 10, color: DOWN_COLOR, position: "bottom" } },
                { coord: ["4", 13], symbol: "pin", symbolSize: 1, label: { show: true, formatter: "高点", fontSize: 10, color: UP_COLOR, position: "top" } },
                // Buy/sell point annotations
                { coord: ["5", 11.2], symbol: "arrow", symbolSize: 14, itemStyle: { color: GOLDEN_COLOR },
                  label: { show: true, formatter: "一买\n趋势反转", fontSize: 10, color: GOLDEN_COLOR, fontWeight: "bold", position: "bottom", backgroundColor: ANNOTATION_BG, padding: [2, 4], borderRadius: 3, lineHeight: 13 } },
                { coord: ["7", 11.8], symbol: "arrow", symbolSize: 14, itemStyle: { color: "#1677ff" },
                  label: { show: true, formatter: "二买\n回调不破低", fontSize: 10, color: "#1677ff", fontWeight: "bold", position: "bottom", backgroundColor: ANNOTATION_BG, padding: [2, 4], borderRadius: 3, lineHeight: 13 } },
                { coord: ["14", 16], symbol: "pin", symbolSize: 1,
                  label: { show: true, formatter: "突破中枢\n三买信号", fontSize: 10, color: GOLDEN_COLOR, fontWeight: "bold", position: "top", backgroundColor: ANNOTATION_BG, padding: [2, 4], borderRadius: 3, lineHeight: 13 } },
              ],
            },
            markArea: {
              silent: true,
              data: [[
                { xAxis: "5", yAxis: 11.5, itemStyle: { color: "rgba(22,119,255,0.08)" } },
                { xAxis: "13", yAxis: 13.5 },
              ]],
              label: {
                show: true,
                position: "inside",
                formatter: "中枢区间\n(震荡密集区)",
                fontSize: 12,
                color: "#1677ff",
                fontWeight: "bold",
                lineHeight: 16,
              },
            },
          },
          {
            type: "line",
            data: pivotData.prices.map((_, i) => (i >= 4 && i <= 12 ? 13.5 : null)),
            lineStyle: { color: UP_COLOR, width: 1, type: "dashed" },
            symbol: "none",
          },
          {
            type: "line",
            data: pivotData.prices.map((_, i) => (i >= 4 && i <= 12 ? 11.5 : null)),
            lineStyle: { color: DOWN_COLOR, width: 1, type: "dashed" },
            symbol: "none",
          },
        ],
      },
    },
  ];
}

export function getMovingAverageCharts(): LessonChart[] {
  const data = generatePriceData(30, 150, "up", 303);
  const ma5 = calcMA(data.closes, 5);
  const ma20 = calcMA(data.closes, 20);
  const ma60 = calcMA(data.closes, 60);

  // Find MA5/MA20 crossovers for golden/death cross
  const ma5Arr = ma5.map((v) => v ?? 0);
  const ma20Arr = ma20.map((v) => v ?? 0);
  const crosses = findCrossovers(ma5Arr, ma20Arr, 20);

  const crossMarkPoints = crosses.slice(0, 4).map((c) => ({
    coord: [data.dates[c.index], ma5Arr[c.index]],
    value: "",
    symbol: "arrow",
    symbolSize: 14,
    symbolRotate: c.type === "golden" ? 0 : 180,
    itemStyle: { color: c.type === "golden" ? GOLDEN_COLOR : DEATH_COLOR },
    label: {
      show: true,
      formatter: c.type === "golden" ? "⬆ MA5上穿MA20\n金叉买入" : "⬇ MA5下穿MA20\n死叉卖出",
      fontSize: 11,
      fontWeight: "bold",
      color: c.type === "golden" ? GOLDEN_COLOR : DEATH_COLOR,
      position: c.type === "golden" ? "top" : "bottom",
      backgroundColor: ANNOTATION_BG,
      padding: [3, 6],
      borderRadius: 4,
      borderColor: c.type === "golden" ? GOLDEN_COLOR : DEATH_COLOR,
      borderWidth: 1,
      lineHeight: 15,
    },
  }));

  // Find multi-head alignment area
  let multiHeadStart = -1;
  for (let i = 60; i < data.closes.length; i++) {
    const m5 = ma5[i];
    const m20 = ma20[i];
    const m60 = ma60[i];
    if (m5 !== null && m20 !== null && m60 !== null && m5 > m20 && m20 > m60) {
      if (multiHeadStart === -1) multiHeadStart = i;
    }
  }

  return [
    {
      id: "ma-main",
      title: "均线系统示例 — MA5/MA20 金叉死叉 + 多头排列",
      option: {
        tooltip: { trigger: "axis", axisPointer: { type: "cross" } },
        legend: { data: ["日K", "MA5", "MA20", "MA60"], top: 0 },
        grid: { left: "12%", right: "5%", top: 40, bottom: 30 },
        xAxis: { type: "category", data: data.dates, axisLabel: { fontSize: 11 } },
        yAxis: { type: "value", scale: true, axisLabel: { fontSize: 11 } },
        series: [
          {
            name: "日K",
            type: "candlestick",
            data: data.dates.map((_, i) => [data.opens[i], data.closes[i], data.lows[i], data.highs[i]]),
            itemStyle: { color: UP_COLOR, color0: DOWN_COLOR, borderColor: UP_COLOR, borderColor0: DOWN_COLOR },
            markArea: multiHeadStart > 0 ? {
              silent: true,
              data: [[
                { xAxis: data.dates[multiHeadStart], itemStyle: { color: "rgba(207,19,34,0.06)" } },
                { xAxis: data.dates[Math.min(multiHeadStart + 20, data.dates.length - 1)] },
              ]],
              label: {
                show: true,
                position: "insideTop",
                formatter: "多头排列区间\nMA5>MA20>MA60",
                fontSize: 11,
                color: GOLDEN_COLOR,
                fontWeight: "bold",
                backgroundColor: ANNOTATION_BG,
                padding: [3, 6],
                borderRadius: 3,
                lineHeight: 15,
              },
            } : undefined,
          },
          {
            name: "MA5",
            type: "line",
            data: ma5,
            lineStyle: { width: 1.5 },
            symbol: "none",
            itemStyle: { color: "#ff6f00" },
            markPoint: { data: crossMarkPoints },
          },
          {
            name: "MA20",
            type: "line",
            data: ma20,
            lineStyle: { width: 1.5 },
            symbol: "none",
            itemStyle: { color: "#9c27b0" },
          },
          {
            name: "MA60",
            type: "line",
            data: ma60,
            lineStyle: { width: 2 },
            symbol: "none",
            itemStyle: { color: "#4caf50" },
          },
        ],
      },
    },
  ];
}

export function getVolumeCharts(): LessonChart[] {
  const data = generatePriceData(15, 80, "up", 404);

  // Find volume spikes (top 3 largest volumes)
  const volWithIdx = data.volumes.map((v, i) => ({ vol: v, idx: i }));
  volWithIdx.sort((a, b) => b.vol - a.vol);
  const spikes = volWithIdx.slice(0, 3);

  // Detect volume-price patterns
  const priceMarkPoints: Record<string, unknown>[] = [];
  const volMarkPoints: Record<string, unknown>[] = [];

  for (const spike of spikes) {
    const i = spike.idx;
    const isUp = data.closes[i] > data.opens[i];
    priceMarkPoints.push({
      coord: [data.dates[i], isUp ? data.highs[i] : data.lows[i]],
      symbol: "pin",
      symbolSize: 1,
      label: {
        show: true,
        formatter: isUp ? "放量上涨\n趋势确认" : "放量下跌\n注意风险",
        fontSize: 10,
        color: isUp ? GOLDEN_COLOR : DEATH_COLOR,
        fontWeight: "bold",
        position: isUp ? "top" : "bottom",
        backgroundColor: ANNOTATION_BG,
        padding: [2, 4],
        borderRadius: 3,
        lineHeight: 13,
      },
    });
    volMarkPoints.push({
      coord: [data.dates[i], spike.vol],
      symbol: "arrow",
      symbolSize: 12,
      symbolRotate: 180,
      itemStyle: { color: "#e65100" },
      label: {
        show: true,
        formatter: "量能放大",
        fontSize: 10,
        color: "#e65100",
        fontWeight: "bold",
        position: "top",
        backgroundColor: ANNOTATION_BG,
        padding: [1, 4],
        borderRadius: 3,
      },
    });
  }

  // Find shrinking volume area (5 consecutive decreasing volumes)
  let shrinkStart = -1;
  for (let i = 5; i < data.volumes.length - 5; i++) {
    if (data.volumes[i] < data.volumes[i - 1] && data.volumes[i - 1] < data.volumes[i - 2]
        && data.volumes[i + 1] < data.volumes[i]) {
      shrinkStart = i - 2;
      break;
    }
  }

  return [
    {
      id: "volume-main",
      title: "量价关系示例 — 放量/缩量信号标注",
      option: {
        tooltip: { trigger: "axis", axisPointer: { type: "cross" } },
        legend: { data: ["日K", "成交量"], top: 0 },
        grid: [
          { left: "12%", right: "5%", top: 40, height: "45%" },
          { left: "12%", right: "5%", top: "70%", height: "22%" },
        ],
        xAxis: [
          { type: "category", data: data.dates, axisLabel: { fontSize: 11 }, gridIndex: 0 },
          { type: "category", data: data.dates, axisLabel: { fontSize: 11 }, gridIndex: 1 },
        ],
        yAxis: [
          { type: "value", scale: true, axisLabel: { fontSize: 11 }, gridIndex: 0 },
          { type: "value", axisLabel: { fontSize: 11 }, gridIndex: 1, splitNumber: 3 },
        ],
        series: [
          {
            name: "日K",
            type: "candlestick",
            data: data.dates.map((_, i) => [data.opens[i], data.closes[i], data.lows[i], data.highs[i]]),
            itemStyle: { color: UP_COLOR, color0: DOWN_COLOR, borderColor: UP_COLOR, borderColor0: DOWN_COLOR },
            xAxisIndex: 0,
            yAxisIndex: 0,
            markPoint: { data: priceMarkPoints },
          },
          {
            name: "成交量",
            type: "bar",
            data: data.volumes.map((v, i) => ({
              value: v,
              itemStyle: { color: data.closes[i] >= data.opens[i] ? UP_COLOR : DOWN_COLOR, opacity: 0.6 },
            })),
            xAxisIndex: 1,
            yAxisIndex: 1,
            markPoint: { data: volMarkPoints },
            markArea: shrinkStart > 0 ? {
              silent: true,
              data: [[
                { xAxis: data.dates[shrinkStart], itemStyle: { color: "rgba(22,119,255,0.08)" } },
                { xAxis: data.dates[shrinkStart + 4] },
              ]],
              label: {
                show: true,
                position: "insideBottom",
                formatter: "缩量回调\n(正常调整)",
                fontSize: 10,
                color: "#1677ff",
                fontWeight: "bold",
                backgroundColor: ANNOTATION_BG,
                padding: [2, 4],
                borderRadius: 3,
                lineHeight: 13,
              },
            } : undefined,
          },
        ],
      },
    },
  ];
}

export function getTrendCharts(): LessonChart[] {
  const upData = generatePriceData(10, 80, "up", 505);

  // Find local lows for trendline
  const localLows: { idx: number; price: number }[] = [];
  for (let i = 2; i < upData.lows.length - 2; i++) {
    if (upData.lows[i] < upData.lows[i - 1] && upData.lows[i] < upData.lows[i - 2]
        && upData.lows[i] < upData.lows[i + 1] && upData.lows[i] < upData.lows[i + 2]) {
      if (localLows.length === 0 || i - localLows[localLows.length - 1].idx > 5) {
        localLows.push({ idx: i, price: upData.lows[i] });
      }
    }
  }

  // Find local highs
  const localHighs: { idx: number; price: number }[] = [];
  for (let i = 2; i < upData.highs.length - 2; i++) {
    if (upData.highs[i] > upData.highs[i - 1] && upData.highs[i] > upData.highs[i - 2]
        && upData.highs[i] > upData.highs[i + 1] && upData.highs[i] > upData.highs[i + 2]) {
      if (localHighs.length === 0 || i - localHighs[localHighs.length - 1].idx > 5) {
        localHighs.push({ idx: i, price: upData.highs[i] });
      }
    }
  }

  // Mark higher lows and higher highs
  const trendMarkPoints: Record<string, unknown>[] = [];
  for (let i = 0; i < Math.min(localLows.length, 4); i++) {
    const l = localLows[i];
    trendMarkPoints.push({
      coord: [upData.dates[l.idx], l.price],
      symbol: "arrow",
      symbolSize: 14,
      itemStyle: { color: GOLDEN_COLOR },
      label: {
        show: true,
        formatter: i === 0 ? "低点①" : `更高的低点${["②", "③", "④"][i - 1]}\n(低点抬高)`,
        fontSize: 10,
        color: GOLDEN_COLOR,
        fontWeight: "bold",
        position: "bottom",
        backgroundColor: ANNOTATION_BG,
        padding: [2, 4],
        borderRadius: 3,
        lineHeight: 13,
      },
    });
  }
  for (let i = 0; i < Math.min(localHighs.length, 3); i++) {
    const h = localHighs[i];
    trendMarkPoints.push({
      coord: [upData.dates[h.idx], h.price],
      symbol: "pin",
      symbolSize: 1,
      label: {
        show: true,
        formatter: `高点${["①", "②", "③"][i]}${i > 0 ? "\n(高点抬高)" : ""}`,
        fontSize: 10,
        color: "#e65100",
        fontWeight: "bold",
        position: "top",
        backgroundColor: ANNOTATION_BG,
        padding: [2, 4],
        borderRadius: 3,
        lineHeight: 13,
      },
    });
  }

  // Trendline from first two local lows
  const trendLineData = localLows.length >= 2 ? [
    [
      { coord: [upData.dates[localLows[0].idx], localLows[0].price], lineStyle: { color: "#1677ff", type: "solid", width: 2 } },
      { coord: [upData.dates[localLows[localLows.length - 1].idx], localLows[localLows.length - 1].price] },
    ],
  ] : [];

  return [
    {
      id: "trend-main",
      title: "上升趋势示例 — 高点抬高、低点抬高 + 趋势线",
      option: {
        tooltip: { trigger: "axis", axisPointer: { type: "cross" } },
        grid: { left: "12%", right: "8%", top: 20, bottom: 30 },
        xAxis: { type: "category", data: upData.dates, axisLabel: { fontSize: 11 } },
        yAxis: { type: "value", scale: true, axisLabel: { fontSize: 11 } },
        series: [
          {
            type: "candlestick",
            data: upData.dates.map((_, i) => [upData.opens[i], upData.closes[i], upData.lows[i], upData.highs[i]]),
            itemStyle: { color: UP_COLOR, color0: DOWN_COLOR, borderColor: UP_COLOR, borderColor0: DOWN_COLOR },
            markPoint: { data: trendMarkPoints },
            markLine: {
              symbol: "none",
              data: trendLineData,
              label: {
                formatter: "上升趋势线\n(连接低点)",
                fontSize: 11,
                fontWeight: "bold",
                color: "#1677ff",
                backgroundColor: ANNOTATION_BG,
                padding: [2, 6],
                borderRadius: 3,
                lineHeight: 15,
              },
            },
          },
        ],
      },
    },
  ];
}

export function getKDJCharts(): LessonChart[] {
  const data = generatePriceData(20, 100, "volatile", 606);
  const kdj = calcKDJ(data.closes, data.highs, data.lows, 9);

  // Find K/D crossovers
  const crosses = findCrossovers(kdj.k, kdj.d, 9);

  // Only annotate crosses in overbought/oversold zones for clarity
  const kdjMarkPoints = crosses
    .filter((c) => {
      const kVal = kdj.k[c.index];
      return (c.type === "golden" && kVal < 35) || (c.type === "death" && kVal > 65);
    })
    .slice(0, 4)
    .map((c) => ({
      coord: [data.dates[c.index], kdj.k[c.index]],
      value: "",
      symbol: "arrow",
      symbolSize: 14,
      symbolRotate: c.type === "golden" ? 0 : 180,
      itemStyle: { color: c.type === "golden" ? GOLDEN_COLOR : DEATH_COLOR },
      label: {
        show: true,
        formatter: c.type === "golden"
          ? `⬆ 超卖区金叉\nK=${Math.round(kdj.k[c.index])}\n强买入信号`
          : `⬇ 超买区死叉\nK=${Math.round(kdj.k[c.index])}\n强卖出信号`,
        fontSize: 10,
        fontWeight: "bold",
        color: c.type === "golden" ? GOLDEN_COLOR : DEATH_COLOR,
        position: c.type === "golden" ? "bottom" : "top",
        backgroundColor: ANNOTATION_BG,
        padding: [3, 6],
        borderRadius: 4,
        borderColor: c.type === "golden" ? GOLDEN_COLOR : DEATH_COLOR,
        borderWidth: 1,
        lineHeight: 14,
      },
    }));

  return [
    {
      id: "kdj-main",
      title: "KDJ 指标示例 — 超买超卖区金叉/死叉标注",
      option: {
        tooltip: { trigger: "axis", axisPointer: { type: "cross" } },
        legend: { data: ["日K", "K线", "D线", "J线"], top: 0 },
        grid: [
          { left: "12%", right: "5%", top: 40, height: "38%" },
          { left: "12%", right: "5%", top: "58%", height: "35%" },
        ],
        xAxis: [
          { type: "category", data: data.dates, axisLabel: { fontSize: 11 }, gridIndex: 0 },
          { type: "category", data: data.dates, axisLabel: { fontSize: 11 }, gridIndex: 1 },
        ],
        yAxis: [
          { type: "value", scale: true, axisLabel: { fontSize: 11 }, gridIndex: 0 },
          { type: "value", min: -20, max: 120, axisLabel: { fontSize: 11 }, gridIndex: 1 },
        ],
        series: [
          {
            name: "日K",
            type: "candlestick",
            data: data.dates.map((_, i) => [data.opens[i], data.closes[i], data.lows[i], data.highs[i]]),
            itemStyle: { color: UP_COLOR, color0: DOWN_COLOR, borderColor: UP_COLOR, borderColor0: DOWN_COLOR },
            xAxisIndex: 0,
            yAxisIndex: 0,
          },
          {
            name: "K线",
            type: "line",
            data: kdj.k,
            lineStyle: { color: "#1677ff", width: 1.5 },
            symbol: "none",
            xAxisIndex: 1,
            yAxisIndex: 1,
            markPoint: { data: kdjMarkPoints },
            markLine: {
              silent: true,
              symbol: "none",
              lineStyle: { width: 1 },
              data: [
                { yAxis: 80, lineStyle: { color: UP_COLOR, type: "dashed" }, label: { formatter: "超买区 80", fontSize: 10, position: "insideEndTop" } },
                { yAxis: 20, lineStyle: { color: DOWN_COLOR, type: "dashed" }, label: { formatter: "超卖区 20", fontSize: 10, position: "insideEndTop" } },
              ],
            },
            markArea: {
              silent: true,
              data: [
                [{ yAxis: 80, itemStyle: { color: "rgba(239,83,80,0.06)" } }, { yAxis: 120 }],
                [{ yAxis: -20, itemStyle: { color: "rgba(38,166,154,0.06)" } }, { yAxis: 20 }],
              ],
            },
          },
          {
            name: "D线",
            type: "line",
            data: kdj.d,
            lineStyle: { color: "#ff9800", width: 1.5 },
            symbol: "none",
            xAxisIndex: 1,
            yAxisIndex: 1,
          },
          {
            name: "J线",
            type: "line",
            data: kdj.j,
            lineStyle: { color: "#9c27b0", width: 1 },
            symbol: "none",
            xAxisIndex: 1,
            yAxisIndex: 1,
          },
        ],
      },
    },
  ];
}

export function getConsolidationCharts(): LessonChart[] {
  const boxPrices = [15, 15.8, 14.5, 15.5, 14.8, 15.6, 14.3, 15.7, 14.6, 15.4, 14.7, 15.9, 14.4, 15.3, 14.9, 16.5, 17.0, 17.8];
  const boxDates = boxPrices.map((_, i) => `D${i + 1}`);

  const triPrices = [20, 22, 19, 21.5, 19.5, 21, 19.8, 20.8, 20, 20.5, 20.2, 20.4, 20.3, 22, 23, 24];
  const triDates = triPrices.map((_, i) => `D${i + 1}`);

  return [
    {
      id: "consolidation-box",
      title: "箱体整理示例 — 箱内震荡 → 突破信号标注",
      option: {
        tooltip: { trigger: "axis" },
        grid: { left: "10%", right: "8%", top: 30, bottom: 30 },
        xAxis: { type: "category", data: boxDates, axisLabel: { fontSize: 11 } },
        yAxis: { type: "value", scale: true, min: 13.5, axisLabel: { fontSize: 11 } },
        series: [
          {
            type: "line",
            data: boxPrices,
            lineStyle: { color: "#333", width: 2 },
            symbol: "circle",
            symbolSize: 5,
            itemStyle: { color: "#333" },
            markLine: {
              symbol: "none",
              lineStyle: { width: 1.5 },
              data: [
                { yAxis: 15.9, lineStyle: { color: UP_COLOR, type: "dashed" }, label: { formatter: "箱顶阻力 15.9", fontSize: 11 } },
                { yAxis: 14.3, lineStyle: { color: DOWN_COLOR, type: "dashed" }, label: { formatter: "箱底支撑 14.3", fontSize: 11 } },
              ],
            },
            markArea: {
              silent: true,
              data: [[
                { xAxis: "D1", yAxis: 14.3, itemStyle: { color: "rgba(22,119,255,0.06)" } },
                { xAxis: "D15", yAxis: 15.9 },
              ]],
              label: {
                show: true,
                position: "inside",
                formatter: "箱体震荡区间",
                fontSize: 12,
                color: "#1677ff",
                fontWeight: "bold",
              },
            },
            markPoint: {
              data: [
                {
                  coord: ["D7", 14.3],
                  symbol: "arrow",
                  symbolSize: 14,
                  itemStyle: { color: GOLDEN_COLOR },
                  label: {
                    show: true,
                    formatter: "触底买入",
                    fontSize: 10,
                    color: GOLDEN_COLOR,
                    fontWeight: "bold",
                    position: "bottom",
                    backgroundColor: ANNOTATION_BG,
                    padding: [2, 4],
                    borderRadius: 3,
                  },
                },
                {
                  coord: ["D12", 15.9],
                  symbol: "arrow",
                  symbolSize: 14,
                  symbolRotate: 180,
                  itemStyle: { color: DEATH_COLOR },
                  label: {
                    show: true,
                    formatter: "触顶卖出",
                    fontSize: 10,
                    color: DEATH_COLOR,
                    fontWeight: "bold",
                    position: "top",
                    backgroundColor: ANNOTATION_BG,
                    padding: [2, 4],
                    borderRadius: 3,
                  },
                },
                {
                  coord: ["D16", 16.5],
                  symbol: "pin",
                  symbolSize: 50,
                  itemStyle: { color: GOLDEN_COLOR },
                  label: {
                    show: true,
                    formatter: "突破!",
                    fontSize: 11,
                    color: "#fff",
                    fontWeight: "bold",
                  },
                },
                {
                  coord: ["D16", 17.2],
                  symbol: "pin",
                  symbolSize: 1,
                  label: {
                    show: true,
                    formatter: "放量突破箱顶\n跟进做多!",
                    fontSize: 11,
                    color: GOLDEN_COLOR,
                    fontWeight: "bold",
                    position: "top",
                    backgroundColor: ANNOTATION_BG,
                    padding: [3, 6],
                    borderRadius: 4,
                    borderColor: GOLDEN_COLOR,
                    borderWidth: 1,
                    lineHeight: 15,
                  },
                },
              ],
            },
          },
        ],
      },
    },
    {
      id: "consolidation-triangle",
      title: "三角形整理示例 — 收敛后向上突破标注",
      option: {
        tooltip: { trigger: "axis" },
        grid: { left: "10%", right: "8%", top: 30, bottom: 30 },
        xAxis: { type: "category", data: triDates, axisLabel: { fontSize: 11 } },
        yAxis: { type: "value", scale: true, min: 18, axisLabel: { fontSize: 11 } },
        series: [
          {
            type: "line",
            data: triPrices,
            lineStyle: { color: "#333", width: 2 },
            symbol: "circle",
            symbolSize: 5,
            itemStyle: { color: "#333" },
            markPoint: {
              data: [
                {
                  coord: ["D2", 22],
                  symbol: "pin",
                  symbolSize: 1,
                  label: { show: true, formatter: "高点降低 ↘", fontSize: 10, color: DEATH_COLOR, fontWeight: "bold", position: "top", backgroundColor: ANNOTATION_BG, padding: [2, 4], borderRadius: 3 },
                },
                {
                  coord: ["D6", 21],
                  symbol: "pin",
                  symbolSize: 1,
                  label: { show: true, formatter: "↘", fontSize: 12, color: DEATH_COLOR, fontWeight: "bold", position: "top" },
                },
                {
                  coord: ["D3", 19],
                  symbol: "pin",
                  symbolSize: 1,
                  label: { show: true, formatter: "低点抬高 ↗", fontSize: 10, color: GOLDEN_COLOR, fontWeight: "bold", position: "bottom", backgroundColor: ANNOTATION_BG, padding: [2, 4], borderRadius: 3 },
                },
                {
                  coord: ["D7", 19.8],
                  symbol: "pin",
                  symbolSize: 1,
                  label: { show: true, formatter: "↗", fontSize: 12, color: GOLDEN_COLOR, fontWeight: "bold", position: "bottom" },
                },
                {
                  coord: ["D12", 20.4],
                  symbol: "pin",
                  symbolSize: 1,
                  label: {
                    show: true,
                    formatter: "收敛尖端\n即将变盘",
                    fontSize: 10,
                    color: "#e65100",
                    fontWeight: "bold",
                    position: "bottom",
                    backgroundColor: ANNOTATION_BG,
                    padding: [2, 6],
                    borderRadius: 3,
                    lineHeight: 13,
                  },
                },
                {
                  coord: ["D14", 22],
                  symbol: "pin",
                  symbolSize: 50,
                  itemStyle: { color: GOLDEN_COLOR },
                  label: { show: true, formatter: "突破!", fontSize: 11, color: "#fff", fontWeight: "bold" },
                },
                {
                  coord: ["D15", 23.5],
                  symbol: "pin",
                  symbolSize: 1,
                  label: {
                    show: true,
                    formatter: "向上突破三角形\n加速上涨!",
                    fontSize: 11,
                    color: GOLDEN_COLOR,
                    fontWeight: "bold",
                    position: "top",
                    backgroundColor: ANNOTATION_BG,
                    padding: [3, 6],
                    borderRadius: 4,
                    borderColor: GOLDEN_COLOR,
                    borderWidth: 1,
                    lineHeight: 15,
                  },
                },
              ],
            },
            markLine: {
              symbol: "none",
              data: [
                // Upper trendline (descending)
                [
                  { coord: ["D2", 22], lineStyle: { color: DEATH_COLOR, type: "dashed", width: 1.5 } },
                  { coord: ["D12", 20.5] },
                ],
                // Lower trendline (ascending)
                [
                  { coord: ["D3", 19], lineStyle: { color: GOLDEN_COLOR, type: "dashed", width: 1.5 } },
                  { coord: ["D12", 20.3] },
                ],
              ],
              label: { show: false },
            },
          },
        ],
      },
    },
  ];
}

export function getRSICharts(): LessonChart[] {
  const data = generatePriceData(22, 100, "volatile", 707);
  const rsi = calcRSI(data.closes, 14);

  // Find overbought/oversold entries
  const rsiMarkPoints: Record<string, unknown>[] = [];
  let lastAnnotated = -10;
  for (let i = 15; i < rsi.length; i++) {
    if (i - lastAnnotated < 8) continue;

    if (rsi[i] > 70 && rsi[i - 1] <= 70) {
      rsiMarkPoints.push({
        coord: [data.dates[i], rsi[i]],
        symbol: "arrow",
        symbolSize: 14,
        symbolRotate: 180,
        itemStyle: { color: DEATH_COLOR },
        label: {
          show: true,
          formatter: `进入超买区\nRSI=${Math.round(rsi[i])}\n注意回调风险`,
          fontSize: 10,
          fontWeight: "bold",
          color: DEATH_COLOR,
          position: "top",
          backgroundColor: ANNOTATION_BG,
          padding: [3, 6],
          borderRadius: 4,
          borderColor: DEATH_COLOR,
          borderWidth: 1,
          lineHeight: 13,
        },
      });
      lastAnnotated = i;
    } else if (rsi[i] < 30 && rsi[i - 1] >= 30) {
      rsiMarkPoints.push({
        coord: [data.dates[i], rsi[i]],
        symbol: "arrow",
        symbolSize: 14,
        itemStyle: { color: GOLDEN_COLOR },
        label: {
          show: true,
          formatter: `进入超卖区\nRSI=${Math.round(rsi[i])}\n关注反弹机会`,
          fontSize: 10,
          fontWeight: "bold",
          color: GOLDEN_COLOR,
          position: "bottom",
          backgroundColor: ANNOTATION_BG,
          padding: [3, 6],
          borderRadius: 4,
          borderColor: GOLDEN_COLOR,
          borderWidth: 1,
          lineHeight: 13,
        },
      });
      lastAnnotated = i;
    }
  }

  // If few signals, also mark RSI crossing 50
  if (rsiMarkPoints.length < 2) {
    for (let i = 15; i < rsi.length; i++) {
      if (rsi[i - 1] < 50 && rsi[i] >= 50 && rsiMarkPoints.length < 3) {
        rsiMarkPoints.push({
          coord: [data.dates[i], rsi[i]],
          symbol: "circle",
          symbolSize: 8,
          itemStyle: { color: "#1677ff" },
          label: {
            show: true,
            formatter: "站上50中轴\n多方占优",
            fontSize: 10,
            color: "#1677ff",
            fontWeight: "bold",
            position: "top",
            backgroundColor: ANNOTATION_BG,
            padding: [2, 4],
            borderRadius: 3,
            lineHeight: 13,
          },
        });
      }
    }
  }

  return [
    {
      id: "rsi-main",
      title: "RSI 指标示例 — 超买/超卖信号 + 中轴线标注",
      option: {
        tooltip: { trigger: "axis", axisPointer: { type: "cross" } },
        legend: { data: ["日K", "RSI(14)"], top: 0 },
        grid: [
          { left: "12%", right: "5%", top: 40, height: "38%" },
          { left: "12%", right: "5%", top: "58%", height: "35%" },
        ],
        xAxis: [
          { type: "category", data: data.dates, axisLabel: { fontSize: 11 }, gridIndex: 0 },
          { type: "category", data: data.dates, axisLabel: { fontSize: 11 }, gridIndex: 1 },
        ],
        yAxis: [
          { type: "value", scale: true, axisLabel: { fontSize: 11 }, gridIndex: 0 },
          { type: "value", min: 0, max: 100, axisLabel: { fontSize: 11 }, gridIndex: 1 },
        ],
        series: [
          {
            name: "日K",
            type: "candlestick",
            data: data.dates.map((_, i) => [data.opens[i], data.closes[i], data.lows[i], data.highs[i]]),
            itemStyle: { color: UP_COLOR, color0: DOWN_COLOR, borderColor: UP_COLOR, borderColor0: DOWN_COLOR },
            xAxisIndex: 0,
            yAxisIndex: 0,
          },
          {
            name: "RSI(14)",
            type: "line",
            data: rsi,
            lineStyle: { color: "#9c27b0", width: 1.5 },
            symbol: "none",
            xAxisIndex: 1,
            yAxisIndex: 1,
            markPoint: { data: rsiMarkPoints },
            markLine: {
              silent: true,
              symbol: "none",
              lineStyle: { width: 1 },
              data: [
                { yAxis: 70, lineStyle: { color: UP_COLOR, type: "dashed" }, label: { formatter: "超买 70", fontSize: 10, position: "insideEndTop" } },
                { yAxis: 50, lineStyle: { color: "#999", type: "dotted" }, label: { formatter: "中轴 50", fontSize: 10, position: "insideEndTop" } },
                { yAxis: 30, lineStyle: { color: DOWN_COLOR, type: "dashed" }, label: { formatter: "超卖 30", fontSize: 10, position: "insideEndTop" } },
              ],
            },
            markArea: {
              silent: true,
              data: [
                [{ yAxis: 70, itemStyle: { color: "rgba(239,83,80,0.06)" } }, { yAxis: 100 }],
                [{ yAxis: 0, itemStyle: { color: "rgba(38,166,154,0.06)" } }, { yAxis: 30 }],
              ],
            },
          },
        ],
      },
    },
  ];
}

// Map lesson IDs to their chart generators
const CHART_GENERATORS: Record<string, () => LessonChart[]> = {
  "bollinger-bands": getBollingerCharts,
  "macd-strategy": getMACDCharts,
  "kline-patterns": getKLinePatternCharts,
  "chan-theory": getChanTheoryCharts,
  "moving-averages": getMovingAverageCharts,
  "volume-analysis": getVolumeCharts,
  "trend-analysis": getTrendCharts,
  "kdj-indicator": getKDJCharts,
  "consolidation-patterns": getConsolidationCharts,
  "rsi-deep-dive": getRSICharts,
};

export function getChartsForLesson(lessonId: string): LessonChart[] {
  const generator = CHART_GENERATORS[lessonId];
  return generator ? generator() : [];
}
