import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  searchBigVKnowledge: vi.fn(),
}));

vi.mock("@/lib/bigv/vector-search", () => ({
  searchBigVKnowledge: mocks.searchBigVKnowledge,
}));

import { bigVAnalysisTool } from "./bigv-analysis";

async function runTool(query: string) {
  return (bigVAnalysisTool.execute as NonNullable<typeof bigVAnalysisTool.execute>)(
    { query },
    {} as never,
  );
}

describe("src/mastra/tools/bigv-analysis.ts", () => {
  it("returns found:false when knowledge base has no match", async () => {
    mocks.searchBigVKnowledge.mockResolvedValueOnce([]);

    const result = await runTool("冷门老师");

    expect(mocks.searchBigVKnowledge).toHaveBeenCalledWith("冷门老师", { limit: 6 });
    expect(result).toEqual({
      found: false,
      message: "最近三个月内没有找到与“冷门老师”相关的大V观点",
    });
  });

  it("maps knowledge hits into analysis items", async () => {
    mocks.searchBigVKnowledge.mockResolvedValueOnce([
      {
        id: "p1",
        score: 0.87,
        articleId: "a1",
        chunkIndex: 0,
        author: "但斌",
        title: "白酒板块观点",
        summary: "看好白酒长期价值",
        text: "正文",
        category: "白酒",
        tags: ["白酒", "消费"],
        sentiment: "bullish",
        sourceUrl: "https://example.com/a1",
        publishedAt: "2026-07-27T02:00:00.000Z",
        publishedAtMs: 1785204000000,
      },
    ]);

    const result = await runTool("但斌");

    expect(result.found).toBe(true);
    expect(result.query).toBe("但斌");
    expect(result.items).toEqual([
      {
        author: "但斌",
        title: "白酒板块观点",
        summary: "看好白酒长期价值",
        category: "白酒",
        tags: ["白酒", "消费"],
        sentiment: "bullish",
        publishedAt: "2026-07-27T02:00:00.000Z",
        sourceUrl: "https://example.com/a1",
        score: 0.87,
      },
    ]);
  });
});
