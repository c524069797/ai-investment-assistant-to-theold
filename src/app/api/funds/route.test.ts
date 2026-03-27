import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  fetchFundEstimate: vi.fn(),
  searchFunds: vi.fn(),
  fetchFundHistoryNav: vi.fn(),
  fetchFundList: vi.fn(),
  fetchFundDetail: vi.fn(),
}));

vi.mock("@/lib/api/tiantianfund", () => ({
  fetchFundEstimate: mocks.fetchFundEstimate,
  searchFunds: mocks.searchFunds,
  fetchFundHistoryNav: mocks.fetchFundHistoryNav,
  fetchFundList: mocks.fetchFundList,
  fetchFundDetail: mocks.fetchFundDetail,
}));

import { GET } from "./route";

function createRequest(url: string) {
  return new NextRequest(new Request(url));
}

describe("src/app/api/funds/route.ts", () => {
  it("returns 400 when estimate action is missing code", async () => {
    const response = await GET(createRequest("http://localhost/api/funds?action=estimate"));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Missing code" });
  });

  it("returns search result when search action is valid", async () => {
    mocks.searchFunds.mockResolvedValueOnce([{ code: "161725", name: "招商中证白酒指数" }]);

    const response = await GET(
      createRequest("http://localhost/api/funds?action=search&keyword=%E7%99%BD%E9%85%92"),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.searchFunds).toHaveBeenCalledWith("白酒");
    expect(body).toEqual({
      success: true,
      data: [{ code: "161725", name: "招商中证白酒指数" }],
    });
  });

  it("returns only first 100 items when list action succeeds", async () => {
    mocks.fetchFundList.mockResolvedValueOnce(Array.from({ length: 120 }, (_, index) => ({ code: `${index}` })));

    const response = await GET(createRequest("http://localhost/api/funds?action=list"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.total).toBe(120);
    expect(body.data).toHaveLength(100);
  });

  it("returns 400 when action is invalid", async () => {
    const response = await GET(createRequest("http://localhost/api/funds?action=unknown"));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Invalid action" });
  });

  it("returns 500 json when upstream throws error", async () => {
    mocks.fetchFundDetail.mockRejectedValueOnce(new Error("fund upstream failed"));

    const response = await GET(createRequest("http://localhost/api/funds?action=detail&code=161725"));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toEqual({ success: false, error: "fund upstream failed" });
  });
});
