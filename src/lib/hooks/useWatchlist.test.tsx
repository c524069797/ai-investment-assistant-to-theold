import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  useUser: vi.fn(),
}));

vi.mock("./useUser", () => ({
  useUser: mocks.useUser,
}));

import { useWatchlist } from "./useWatchlist";

describe("src/lib/hooks/useWatchlist.ts", () => {
  beforeEach(() => {
    mocks.useUser.mockReturnValue({
      currentUser: { id: "dad", username: "baba", name: "爸爸", avatar: "👨" },
      isLoading: false,
      logout: vi.fn(),
    });
  });

  it("loads watchlist items for current user", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      json: async () => ({
        success: true,
        data: [{ code: "600519", name: "贵州茅台", market: 1, type: "stock" }],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useWatchlist());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.items).toEqual([
        { code: "600519", name: "贵州茅台", market: 1, type: "stock" },
      ]);
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/watchlist?userId=dad");
  });

  it("adds item through api and keeps helper method available", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        json: async () => ({ success: true, data: [] }),
      })
      .mockResolvedValue({
        json: async () => ({ success: true, data: [] }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useWatchlist());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.addItem({ code: "600519", name: "贵州茅台", market: 1, type: "stock" });
    });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: "dad",
          code: "600519",
          type: "stock",
        }),
      });
    });

    expect(result.current.isInWatchlist("000001", "stock")).toBe(false);
  });
});
