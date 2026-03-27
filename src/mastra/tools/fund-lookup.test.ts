import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  searchFunds: vi.fn(),
  fetchFundEstimate: vi.fn(),
  fetchFundHistoryNav: vi.fn(),
}));

vi.mock("@/lib/api/tiantianfund", () => ({
  searchFunds: mocks.searchFunds,
  fetchFundEstimate: mocks.fetchFundEstimate,
  fetchFundHistoryNav: mocks.fetchFundHistoryNav,
}));

import { fundLookupTool } from "./fund-lookup";

async function runTool(query: string) {
  return (fundLookupTool.execute as NonNullable<typeof fundLookupTool.execute>)({ query }, {} as never);
}

describe("src/mastra/tools/fund-lookup.ts", () => {
  it("returns fund estimate and recent history when code is valid", async () => {
    mocks.fetchFundEstimate.mockResolvedValueOnce({
      name: "招商中证白酒指数",
      nav: 0.95,
      estimateNav: 0.97,
      estimateChangePercent: 2.12,
      updateTime: "2026-03-22 14:30",
    });
    mocks.fetchFundHistoryNav.mockResolvedValueOnce([
      { date: "2026-03-22", nav: 0.95, changePercent: 1.2 },
      { date: "2026-03-21", nav: 0.94, changePercent: -0.5 },
    ]);

    const result = await runTool("161725");

    expect(mocks.fetchFundEstimate).toHaveBeenCalledWith("161725");
    expect(mocks.fetchFundHistoryNav).toHaveBeenCalledWith("161725", 1, 5);
    expect(result).toMatchObject({
      found: true,
      code: "161725",
      name: "招商中证白酒指数",
      estimateChange: "+2.12%",
      recentHistory: [
        { date: "2026-03-22", nav: 0.95, change: "+1.20%" },
        { date: "2026-03-21", nav: 0.94, change: "-0.50%" },
      ],
    });
  });

  it("returns not found result when search by name has no match", async () => {
    mocks.searchFunds.mockResolvedValueOnce([]);

    const result = await runTool("不存在基金");

    expect(mocks.searchFunds).toHaveBeenCalledWith("不存在基金");
    expect(result).toEqual({ found: false, message: '未找到与"不存在基金"相关的基金' });
  });

  it("returns degraded not found result when both estimate and history are empty", async () => {
    mocks.searchFunds.mockResolvedValueOnce([{ code: "161725", name: "招商中证白酒指数" }]);
    mocks.fetchFundEstimate.mockRejectedValueOnce(new Error("estimate failed"));
    mocks.fetchFundHistoryNav.mockResolvedValueOnce([]);

    const result = await runTool("白酒基金");

    expect(result).toEqual({ found: false, message: "未找到基金 161725 的数据" });
  });

  it("returns generic error result when history request throws", async () => {
    mocks.fetchFundEstimate.mockResolvedValueOnce({
      name: "招商中证白酒指数",
      nav: 0.95,
      estimateNav: 0.97,
      estimateChangePercent: 2.12,
      updateTime: "2026-03-22 14:30",
    });
    mocks.fetchFundHistoryNav.mockRejectedValueOnce(new Error("history failed"));

    const result = await runTool("161725");

    expect(result).toEqual({ found: false, message: "查询基金 161725 时出现错误" });
  });
});
