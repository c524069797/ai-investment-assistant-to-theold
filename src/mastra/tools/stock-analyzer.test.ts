import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  searchStocks: vi.fn(),
  fetchStockQuote: vi.fn(),
  fetchStockKLine: vi.fn(),
}));

vi.mock("@/lib/api/eastmoney", () => ({
  searchStocks: mocks.searchStocks,
  fetchStockQuote: mocks.fetchStockQuote,
  fetchStockKLine: mocks.fetchStockKLine,
}));

import { stockAnalyzerTool } from "./stock-analyzer";

const QUOTE = {
  code: "600519",
  name: "贵州茅台",
  price: 1520,
  change: 12,
  changePercent: 0.8,
  open: 1500,
  high: 1530,
  low: 1495,
  preClose: 1508,
  volume: 120000,
  amount: 3_100_000_000,
  turnoverRate: 1.23,
  pe: 25.68,
  pb: 8.12,
  totalMarketCap: 1_910_000_000_000,
};

/** 生成围绕 100 元正弦波动的日 K 数据，足够触发全部指标计算 */
function genKline(days = 300) {
  return Array.from({ length: days }, (_, i) => {
    const close = 100 + 5 * Math.sin(i / 10);
    return {
      date: `day-${i}`,
      open: close - 0.5,
      close,
      high: close + 1,
      low: close - 1,
      volume: 100000 + (i % 10) * 1000,
      amount: close * 100000,
      changePercent: 0.5,
      turnoverRate: 1,
    };
  });
}

async function runTool(query: string) {
  return (stockAnalyzerTool.execute as NonNullable<typeof stockAnalyzerTool.execute>)(
    { query },
    {} as never,
  );
}

describe("src/mastra/tools/stock-analyzer.ts", () => {
  it("returns error when name search has no match", async () => {
    mocks.searchStocks.mockResolvedValueOnce([]);

    const result = await runTool("不存在股票");

    expect(result).toEqual({ error: true, message: '未找到与"不存在股票"相关的股票' });
    expect(mocks.fetchStockQuote).not.toHaveBeenCalled();
  });

  it("returns error when quote fetch fails", async () => {
    mocks.fetchStockQuote.mockRejectedValueOnce(new Error("quote failed"));
    mocks.fetchStockKLine.mockResolvedValueOnce(genKline());

    const result = await runTool("600519");

    // 6 开头的代码直接推断为沪市，不走搜索
    expect(mocks.searchStocks).not.toHaveBeenCalled();
    expect(mocks.fetchStockQuote).toHaveBeenCalledWith(1, "600519");
    expect(result).toEqual({ error: true, message: "无法获取 600519(600519) 的实时行情" });
  });

  it("returns basic quote only when kline data is insufficient", async () => {
    mocks.fetchStockQuote.mockResolvedValueOnce({ ...QUOTE, code: "000002", name: "万科A" });
    mocks.fetchStockKLine.mockResolvedValueOnce(genKline(10));

    const result = await runTool("000002");

    // 非 6 开头推断为深市
    expect(mocks.fetchStockQuote).toHaveBeenCalledWith(0, "000002");
    expect(result).toMatchObject({
      error: false,
      message: "K线数据不足，无法进行完整技术分析",
    });
    const partial = result as { quote: Record<string, unknown>; indicators?: unknown };
    expect(partial.quote).toMatchObject({
      code: "000002",
      changePercent: "+0.80%",
      volume: "12万手",
      amount: "31.00亿",
      marketCap: "19100亿",
    });
    expect(partial.indicators).toBeUndefined();
  });

  it("produces full technical analysis with all indicator groups", async () => {
    mocks.searchStocks.mockResolvedValueOnce([{ code: "600519", name: "贵州茅台", market: 1 }]);
    mocks.fetchStockQuote.mockResolvedValueOnce(QUOTE);
    mocks.fetchStockKLine.mockResolvedValueOnce(genKline(300));

    const result = await runTool("贵州茅台");

    expect(mocks.searchStocks).toHaveBeenCalledWith("贵州茅台");
    expect(mocks.fetchStockKLine).toHaveBeenCalledWith(1, "600519", "daily", 300);

    const analysis = result as {
      error: boolean;
      quote: Record<string, unknown>;
      indicators: {
        rsi: { value: string; interpretation: string };
        macd: Record<string, unknown> | null;
        bollinger: { pricePosition: string } | null;
        kdj: Record<string, unknown> | null;
        movingAverages: unknown;
        volume: unknown;
        yearlyPercentile: string;
      };
      chanTheory: unknown;
      kLinePatterns: string[];
      recentKLine: Array<Record<string, string>>;
      signalSummary: unknown;
      riskWarning: string;
    };

    expect(analysis.error).toBe(false);
    expect(analysis.quote).toMatchObject({
      code: "600519",
      name: "贵州茅台",
      changePercent: "+0.80%",
      turnoverRate: "1.23%",
    });
    // 全部指标组都要产出
    expect(analysis.indicators.rsi.value).toMatch(/^\d+(\.\d)?$/);
    expect(["超卖区", "超买区", "偏空", "偏多"]).toContain(analysis.indicators.rsi.interpretation);
    expect(analysis.indicators.macd).not.toBeNull();
    expect(analysis.indicators.bollinger).not.toBeNull();
    expect(["触及上轨", "触及下轨", "中轨上方", "中轨下方"]).toContain(
      analysis.indicators.bollinger!.pricePosition,
    );
    expect(analysis.indicators.kdj).not.toBeNull();
    expect(analysis.indicators.movingAverages).toBeDefined();
    expect(analysis.indicators.volume).toBeDefined();
    expect(analysis.indicators.yearlyPercentile).toMatch(/%$/);
    expect(analysis.chanTheory).toBeDefined();
    expect(analysis.kLinePatterns.length).toBeGreaterThan(0);
    expect(analysis.recentKLine).toHaveLength(5);
    expect(analysis.recentKLine[0]).toMatchObject({ changePercent: "+0.50%" });
    expect(analysis.signalSummary).toBeDefined();
    expect(analysis.riskWarning).toContain("投资有风险");
  });
});
