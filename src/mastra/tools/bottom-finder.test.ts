import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  fetchStockKLine: vi.fn(),
}));

vi.mock("@/lib/api/eastmoney", () => ({
  fetchStockKLine: mocks.fetchStockKLine,
}));

import { bottomFinderTool } from "./bottom-finder";

function kline(closes: number[]) {
  return closes.map((close, index) => ({
    date: `day-${index}`,
    open: close,
    close,
    high: close,
    low: close,
    volume: 10000,
    amount: close * 10000,
  }));
}

async function runTool(market: number, code: string) {
  return (bottomFinderTool.execute as NonNullable<typeof bottomFinderTool.execute>)(
    { market, code },
    {} as never,
  );
}

describe("src/mastra/tools/bottom-finder.ts", () => {
  it("returns error when kline data is insufficient", async () => {
    mocks.fetchStockKLine.mockResolvedValueOnce(kline(Array(10).fill(100)));

    const result = await runTool(1, "600519");

    expect(mocks.fetchStockKLine).toHaveBeenCalledWith(1, "600519", "daily", 300);
    expect(result).toEqual({ error: "数据不足，无法进行技术分析" });
  });

  it("stacks oversold signals after a crash and recommends strong attention", async () => {
    // 299 天横盘在 100，最后一天暴跌到 70：
    // RSI=0(+2)、跌破布林下轨(+2)、低于250日线(+1)、年内最低0%分位(+2) → 7/8
    const closes = [...Array(299).fill(100), 70];
    mocks.fetchStockKLine.mockResolvedValueOnce(kline(closes));

    const result = await runTool(0, "000001");

    expect(result).toMatchObject({
      code: "000001",
      currentPrice: "70.00",
      signalStrength: "7/8",
    });
    const analysis = result as { indicators: Record<string, string>; signals: string[]; recommendation: string };
    expect(analysis.indicators.rsi).toBe("0.0");
    expect(analysis.indicators.yearlyPercentile).toBe("0%");
    expect(analysis.indicators.ma250).toBe("99.88");
    expect(analysis.signals).toHaveLength(4);
    expect(analysis.recommendation).toContain("强烈关注");
  });

  it("reports no buy signal in a steady uptrend", async () => {
    // 单边上涨：RSI=100、价格贴近年内高点，各信号均不触发
    const closes = Array.from({ length: 300 }, (_, i) => 70 + i * 0.1);
    mocks.fetchStockKLine.mockResolvedValueOnce(kline(closes));

    const result = await runTool(1, "600036");

    const analysis = result as {
      indicators: Record<string, string>;
      signals: string[];
      signalStrength: string;
      recommendation: string;
    };
    expect(analysis.indicators.rsi).toBe("100.0");
    expect(analysis.indicators.yearlyPercentile).toBe("100%");
    expect(analysis.signals).toEqual([]);
    expect(analysis.signalStrength).toBe("0/8");
    expect(analysis.recommendation).toContain("暂无明显买入信号");
  });
});
