import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  fetchMarketIndices: vi.fn(),
}));

vi.mock("@/lib/api/eastmoney", () => ({
  fetchMarketIndices: mocks.fetchMarketIndices,
}));

import { marketOverviewTool } from "./market-overview";

function index(name: string, price: number, changePercent: number, amount = 250000000000) {
  return { name, code: "000001", price, change: 0, changePercent, amount };
}

async function runTool() {
  return (marketOverviewTool.execute as NonNullable<typeof marketOverviewTool.execute>)(
    {},
    {} as never,
  );
}

describe("src/mastra/tools/market-overview.ts", () => {
  it("reports closed market when all prices are zero", async () => {
    mocks.fetchMarketIndices.mockResolvedValueOnce([
      index("上证指数", 0, 0),
      index("深证成指", 0, 0),
    ]);

    const result = await runTool();

    expect(result.status).toBe("休市中");
  });

  it("formats indices with trend icons and reports a strong market", async () => {
    mocks.fetchMarketIndices.mockResolvedValueOnce([
      index("上证指数", 3450.1234, 1.5, 350000000000),
      index("深证成指", 11200.5, 0.8),
      index("创业板指", 2300.2, -0.6),
      index("沪深300", 4100, 0),
    ]);

    const result = await runTool();

    expect(result.status).toBe("交易中");
    expect(result.indices[0]).toEqual({
      name: "上证指数",
      code: "000001",
      price: "3450.12",
      change: "+1.50%",
      trend: "📈",
      amount: "3500亿",
    });
    expect(result.indices[2]).toMatchObject({ change: "-0.60%", trend: "📉" });
    expect(result.indices[3]).toMatchObject({ change: "0.00%", trend: "➡️" });
    // 沪深均值 (1.5+0.8)/2 = 1.15 > 1
    expect(result.summary).toBe("今日市场表现强劲，整体上涨");
  });

  it("summarizes mild decline and heavy decline branches", async () => {
    mocks.fetchMarketIndices.mockResolvedValueOnce([
      index("上证指数", 3400, -0.3),
      index("深证成指", 11000, -0.5),
    ]);
    expect((await runTool()).summary).toBe("今日市场小幅下跌，波动不大");

    mocks.fetchMarketIndices.mockResolvedValueOnce([
      index("上证指数", 3300, -2.1),
      index("深证成指", 10800, -2.5),
    ]);
    expect((await runTool()).summary).toBe("今日市场下跌较多，请注意风险");
  });

  it("returns fallback summary when key indices are missing", async () => {
    mocks.fetchMarketIndices.mockResolvedValueOnce([index("创业板指", 2300, 1.2)]);

    const result = await runTool();

    expect(result.summary).toBe("暂无数据");
  });
});
