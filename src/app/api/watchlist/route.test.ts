import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getWatchlist: vi.fn(),
  addToWatchlist: vi.fn(),
  removeFromWatchlist: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  getWatchlist: mocks.getWatchlist,
  addToWatchlist: mocks.addToWatchlist,
  removeFromWatchlist: mocks.removeFromWatchlist,
}));

import { DELETE, GET, POST } from "./route";

function createRequest(url: string, init?: RequestInit) {
  return new NextRequest(new Request(url, init));
}

describe("src/app/api/watchlist/route.ts", () => {
  it("GET returns 400 when userId is missing", async () => {
    const response = await GET(createRequest("http://localhost/api/watchlist"));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Missing userId" });
  });

  it("GET returns watchlist data when userId is provided", async () => {
    mocks.getWatchlist.mockResolvedValueOnce([
      { code: "600519", name: "贵州茅台", market: 1, type: "stock" },
    ]);

    const response = await GET(createRequest("http://localhost/api/watchlist?userId=dad"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.getWatchlist).toHaveBeenCalledWith("dad");
    expect(body).toEqual({
      success: true,
      data: [{ code: "600519", name: "贵州茅台", market: 1, type: "stock" }],
    });
  });

  it("POST returns 400 when required fields are missing", async () => {
    const response = await POST(
      createRequest("http://localhost/api/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: "dad", code: "600519" }),
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Missing required fields" });
  });

  it("POST saves watchlist item when payload is valid", async () => {
    mocks.addToWatchlist.mockResolvedValueOnce({
      id: "dad-stock-600519",
      userId: "dad",
      code: "600519",
      name: "贵州茅台",
      market: 1,
      type: "stock",
    });

    const response = await POST(
      createRequest("http://localhost/api/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: "dad",
          code: "600519",
          name: "贵州茅台",
          market: 1,
          type: "stock",
        }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.addToWatchlist).toHaveBeenCalledWith("dad", {
      code: "600519",
      type: "stock",
    });
    expect(body.success).toBe(true);
  });

  it("DELETE returns 400 when required params are missing", async () => {
    const response = await DELETE(createRequest("http://localhost/api/watchlist?userId=dad&code=600519"));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Missing required params" });
  });

  it("DELETE removes watchlist item when params are valid", async () => {
    mocks.removeFromWatchlist.mockResolvedValueOnce(true);

    const response = await DELETE(
      createRequest("http://localhost/api/watchlist?userId=dad&code=600519&type=stock", {
        method: "DELETE",
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.removeFromWatchlist).toHaveBeenCalledWith("dad", "600519", "stock");
    expect(body).toEqual({ success: true, removed: true });
  });
});
