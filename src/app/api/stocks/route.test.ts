import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  fetchStockQuote: vi.fn(),
  searchStocks: vi.fn(),
  searchTopicStocks: vi.fn(),
  fetchStockKLine: vi.fn(),
  fetchMarketIndices: vi.fn(),
  fetchStockRanking: vi.fn(),
}));

vi.mock("@/lib/api/eastmoney", () => ({
  fetchStockQuote: mocks.fetchStockQuote,
  searchStocks: mocks.searchStocks,
  searchTopicStocks: mocks.searchTopicStocks,
  fetchStockKLine: mocks.fetchStockKLine,
  fetchMarketIndices: mocks.fetchMarketIndices,
  fetchStockRanking: mocks.fetchStockRanking,
}));

import { GET } from "./route";

function createRequest(url: string) {
  return new NextRequest(new Request(url));
}

describe("src/app/api/stocks/route.ts", () => {
  it("returns 400 when quote action is missing code", async () => {
    const response = await GET(createRequest("http://localhost/api/stocks?action=quote&market=1"));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Missing code" });
  });

  it("returns search result when search action is valid", async () => {
    mocks.searchStocks.mockResolvedValueOnce([{ code: "600519", name: "贵州茅台", market: 1 }]);

    const response = await GET(
      createRequest("http://localhost/api/stocks?action=search&keyword=%E8%8C%85%E5%8F%B0"),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.searchStocks).toHaveBeenCalledWith("茅台");
    expect(body).toEqual({
      success: true,
      data: [{ code: "600519", name: "贵州茅台", market: 1 }],
    });
  });

  it("returns market indices when indices action is requested", async () => {
    mocks.fetchMarketIndices.mockResolvedValueOnce([{ code: "000001", name: "上证指数", price: 3300 }]);

    const response = await GET(createRequest("http://localhost/api/stocks?action=indices"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.fetchMarketIndices).toHaveBeenCalledTimes(1);
    expect(body.success).toBe(true);
  });

  it("returns 400 when action is invalid", async () => {
    const response = await GET(createRequest("http://localhost/api/stocks?action=unknown"));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Invalid action" });
  });

  it("returns 500 json when upstream throws error", async () => {
    mocks.fetchStockQuote.mockRejectedValueOnce(new Error("upstream failed"));

    const response = await GET(createRequest("http://localhost/api/stocks?action=quote&market=1&code=600519"));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toEqual({ success: false, error: "upstream failed" });
  });
});
