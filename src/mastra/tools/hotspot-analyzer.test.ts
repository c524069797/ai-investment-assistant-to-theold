import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  searchStocks: vi.fn(),
  fetchStockQuote: vi.fn(),
}));

vi.mock("@/lib/api/eastmoney", () => ({
  searchStocks: mocks.searchStocks,
  fetchStockQuote: mocks.fetchStockQuote,
}));

import { hotspotAnalyzerTool } from "./hotspot-analyzer";

type HotspotInput = Parameters<NonNullable<typeof hotspotAnalyzerTool.execute>>[0];

async function runTool(input: HotspotInput = {}) {
  return (hotspotAnalyzerTool.execute as NonNullable<typeof hotspotAnalyzerTool.execute>)(
    input,
    {} as never,
  );
}

function quote(price: number, turnoverRate: number) {
  return {
    price,
    changePercent: 2.5,
    volume: 100000,
    turnoverRate,
  };
}

describe("src/mastra/tools/hotspot-analyzer.ts", () => {
  it("returns hint message when keyword matches no hotspot", async () => {
    const result = await runTool({ keyword: "元宇宙" });

    expect(result.hotspots).toEqual([]);
    expect(result.matchedStocks).toEqual([]);
    expect(result.message).toContain("未找到与\"元宇宙\"相关的热点");
    expect(result.message).toContain("人工智能");
    expect(mocks.searchStocks).not.toHaveBeenCalled();
  });

  it("filters stocks by price range, tolerates quote failures, sorts by turnover", async () => {
    mocks.searchStocks.mockResolvedValueOnce([
      { code: "300001", name: "AI一号", market: 0 },
      { code: "300002", name: "AI二号", market: 0 },
      { code: "300003", name: "AI三号", market: 0 },
      { code: "600001", name: "AI四号", market: 1 },
    ]);
    mocks.fetchStockQuote
      .mockResolvedValueOnce(quote(12, 5)) // 区间内，换手率低
      .mockResolvedValueOnce(quote(50, 20)) // 超出 5-30 区间，被过滤
      .mockRejectedValueOnce(new Error("quote failed")) // 行情失败，容错跳过
      .mockResolvedValueOnce(quote(8, 9)); // 区间内，换手率高

    const result = await runTool({ keyword: "人工智能" });

    expect(mocks.searchStocks).toHaveBeenCalledWith("人工智能");
    expect(result.totalMatched).toBe(2);
    // 按换手率降序：9% 的排在 5% 前面
    expect(result.matchedStocks.map((s: { code: string }) => s.code)).toEqual(["600001", "300001"]);
    expect(result.matchedStocks[0]).toMatchObject({
      price: "8.00元",
      changePercent: "+2.50%",
      turnoverRate: "9.00%",
    });
    expect(result.currentHotspots[0]).toMatchObject({ keyword: "人工智能", heat: "95/100", status: "🔥 火爆" });
    expect(result.hotspotStatus).toBe("热点仍然活跃");
  });

  it("defaults to hottest topics and 5-30 price range when no keyword given", async () => {
    mocks.searchStocks.mockResolvedValueOnce([]);

    const result = await runTool({});

    // 默认只取 heat >= 70 的热点，且用第一个热点作为搜索词
    expect(result.searchKeyword).toBe("人工智能");
    expect(result.priceFilter).toBe("5-30元");
    const heats = result.currentHotspots.map((h: { heat: string }) => Number(h.heat.split("/")[0]));
    expect(Math.min(...heats)).toBeGreaterThanOrEqual(70);
    expect(result.matchedStocks).toEqual([]);
  });

  it("respects custom price range", async () => {
    mocks.searchStocks.mockResolvedValueOnce([{ code: "300010", name: "机器人一号", market: 0 }]);
    mocks.fetchStockQuote.mockResolvedValueOnce(quote(45, 3));

    const result = await runTool({ keyword: "机器人", priceMin: 40, priceMax: 60 });

    expect(result.priceFilter).toBe("40-60元");
    expect(result.totalMatched).toBe(1);
    expect(result.matchedStocks[0]).toMatchObject({ code: "300010", price: "45.00元" });
  });
});
