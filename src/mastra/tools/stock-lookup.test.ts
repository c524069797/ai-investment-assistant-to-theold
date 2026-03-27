import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  searchStocks: vi.fn(),
  fetchStockQuote: vi.fn(),
}));

vi.mock("@/lib/api/eastmoney", () => ({
  searchStocks: mocks.searchStocks,
  fetchStockQuote: mocks.fetchStockQuote,
}));

import { stockLookupTool } from "./stock-lookup";

async function runTool(query: string) {
  return (stockLookupTool.execute as NonNullable<typeof stockLookupTool.execute>)({ query }, {} as never);
}

describe("src/mastra/tools/stock-lookup.ts", () => {
  it("returns formatted quote when query is 6-digit stock code", async () => {
    mocks.fetchStockQuote.mockResolvedValueOnce({
      code: "600519",
      name: "贵州茅台",
      price: 1520,
      change: 12,
      changePercent: 0.8,
      open: 1500,
      high: 1528,
      low: 1498,
      preClose: 1508,
      volume: 120000,
      amount: 3100000000,
      turnoverRate: 1.23,
      pe: 25.68,
      pb: 8.12,
      totalMarketCap: 1910000000000,
    });

    const result = await runTool("600519");

    expect(mocks.fetchStockQuote).toHaveBeenCalledWith(1, "600519");
    expect(result).toMatchObject({
      found: true,
      code: "600519",
      name: "贵州茅台",
      currentPrice: 1520,
      changePercent: "+0.80%",
      status: "📈 上涨",
    });
  });

  it("returns not found result when search by name has no match", async () => {
    mocks.searchStocks.mockResolvedValueOnce([]);

    const result = await runTool("不存在股票");

    expect(mocks.searchStocks).toHaveBeenCalledWith("不存在股票");
    expect(result).toEqual({ found: false, message: '未找到与"不存在股票"相关的股票' });
  });

  it("falls back to search when direct code lookup fails", async () => {
    mocks.fetchStockQuote
      .mockRejectedValueOnce(new Error("quote failed"))
      .mockResolvedValueOnce({
        code: "600519",
        name: "贵州茅台",
        price: 1520,
        change: -5,
        changePercent: -0.33,
        open: 1525,
        high: 1530,
        low: 1510,
        preClose: 1525,
        volume: 90000,
        amount: 2100000000,
        turnoverRate: 0.98,
        pe: 25.68,
        pb: 8.12,
        totalMarketCap: 1910000000000,
      });
    mocks.searchStocks.mockResolvedValueOnce([{ code: "600519", name: "贵州茅台", market: 1 }]);

    const result = await runTool("600519");

    expect(mocks.searchStocks).toHaveBeenCalledWith("600519");
    expect(mocks.fetchStockQuote).toHaveBeenNthCalledWith(2, 1, "600519");
    expect(result).toMatchObject({
      found: true,
      code: "600519",
      status: "📉 下跌",
    });
  });

  it("returns degraded result when search hit exists but quote fetch fails", async () => {
    mocks.searchStocks.mockResolvedValueOnce([{ code: "000001", name: "平安银行", market: 0 }]);
    mocks.fetchStockQuote.mockRejectedValueOnce(new Error("quote failed"));

    const result = await runTool("平安银行");

    expect(result).toEqual({
      found: true,
      code: "000001",
      name: "平安银行",
      message: "找到股票但暂时无法获取实时行情",
    });
  });
});
