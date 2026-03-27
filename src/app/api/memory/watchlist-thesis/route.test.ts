import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSessionUserId: vi.fn(),
  getWatchlistThesis: vi.fn(),
  listWatchlistTheses: vi.fn(),
  upsertWatchlistThesis: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
  getSessionUserId: mocks.getSessionUserId,
}));

vi.mock("@/lib/memory/service", () => ({
  getWatchlistThesis: mocks.getWatchlistThesis,
  listWatchlistTheses: mocks.listWatchlistTheses,
  upsertWatchlistThesis: mocks.upsertWatchlistThesis,
}));

import { GET, PUT } from "./route";

function createRequest(url: string, init?: RequestInit) {
  return new NextRequest(new Request(url, init));
}

describe("src/app/api/memory/watchlist-thesis/route.ts", () => {
  it("GET 带 code 时返回单条逻辑", async () => {
    mocks.getSessionUserId.mockReturnValueOnce("dad");
    mocks.getWatchlistThesis.mockResolvedValueOnce({ code: "600519", watchReason: "白酒龙头" });

    const response = await GET(createRequest("http://localhost/api/memory/watchlist-thesis?code=600519&market=1&name=%E8%B4%B5%E5%B7%9E%E8%8C%85%E5%8F%B0"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.getWatchlistThesis).toHaveBeenCalledWith("dad", "600519", "stock", 1, "贵州茅台");
    expect(body.success).toBe(true);
  });

  it("GET 不带 code 时返回列表", async () => {
    mocks.getSessionUserId.mockReturnValueOnce("dad");
    mocks.listWatchlistTheses.mockResolvedValueOnce([{ code: "600519" }]);

    const response = await GET(createRequest("http://localhost/api/memory/watchlist-thesis"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.listWatchlistTheses).toHaveBeenCalledWith("dad");
    expect(body).toEqual({ success: true, data: [{ code: "600519" }] });
  });

  it("PUT 缺少 code 时返回 400", async () => {
    mocks.getSessionUserId.mockReturnValueOnce("dad");

    const response = await PUT(createRequest("http://localhost/api/memory/watchlist-thesis", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ watchReason: "test" }),
    }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ success: false, error: "缺少 code" });
  });

  it("PUT 保存逻辑卡片", async () => {
    mocks.getSessionUserId.mockReturnValueOnce("dad");
    mocks.upsertWatchlistThesis.mockResolvedValueOnce({ id: "thesis-dad-stock-600519" });

    const payload = { code: "600519", watchReason: "白酒龙头" };
    const response = await PUT(createRequest("http://localhost/api/memory/watchlist-thesis", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.upsertWatchlistThesis).toHaveBeenCalledWith("dad", payload);
    expect(body.success).toBe(true);
  });
});
