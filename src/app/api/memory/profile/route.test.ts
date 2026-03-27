import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSessionUserId: vi.fn(),
  getUserInvestmentProfile: vi.fn(),
  upsertUserInvestmentProfile: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
  getSessionUserId: mocks.getSessionUserId,
}));

vi.mock("@/lib/memory/service", () => ({
  getUserInvestmentProfile: mocks.getUserInvestmentProfile,
  upsertUserInvestmentProfile: mocks.upsertUserInvestmentProfile,
}));

import { GET, PUT } from "./route";

function createRequest(url: string, init?: RequestInit) {
  return new NextRequest(new Request(url, init));
}

describe("src/app/api/memory/profile/route.ts", () => {
  it("GET 未登录时返回 401", async () => {
    mocks.getSessionUserId.mockReturnValueOnce(null);
    const response = await GET(createRequest("http://localhost/api/memory/profile"));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ success: false, error: "未登录" });
  });

  it("GET 返回投资画像", async () => {
    mocks.getSessionUserId.mockReturnValueOnce("dad");
    mocks.getUserInvestmentProfile.mockResolvedValueOnce({
      riskPreference: "balanced",
      investmentStyle: ["growth"],
      holdingPeriodPreference: "mid-term",
      preferredEvidence: ["earnings"],
      dislikedPatterns: [],
      summary: "更关注财报兑现",
    });

    const response = await GET(createRequest("http://localhost/api/memory/profile"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.getUserInvestmentProfile).toHaveBeenCalledWith("dad");
    expect(body.success).toBe(true);
  });

  it("PUT 保存投资画像", async () => {
    mocks.getSessionUserId.mockReturnValueOnce("dad");
    mocks.upsertUserInvestmentProfile.mockResolvedValueOnce({ id: "profile-dad" });

    const response = await PUT(createRequest("http://localhost/api/memory/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ riskPreference: "aggressive" }),
    }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.upsertUserInvestmentProfile).toHaveBeenCalledWith("dad", { riskPreference: "aggressive" });
    expect(body).toEqual({ success: true, data: { id: "profile-dad" } });
  });
});
