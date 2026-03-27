import { describe, expect, it } from "vitest";
import { buildChatMemoryContext, findRelevantThesis } from "./context";

describe("src/lib/memory/context.ts", () => {
  it("findRelevantThesis 优先匹配显式股票代码", () => {
    const thesis = findRelevantThesis(
      [
        { code: "600519", name: "贵州茅台" },
        { code: "000001", name: "平安银行" },
      ],
      "帮我看看平安银行",
      "600519",
    );

    expect(thesis).toEqual({ code: "600519", name: "贵州茅台" });
  });

  it("findRelevantThesis 可以按名称匹配", () => {
    const thesis = findRelevantThesis(
      [
        { code: "600519", name: "贵州茅台" },
        { code: "000001", name: "平安银行" },
      ],
      "帮我分析一下平安银行今天还能不能继续看",
    );

    expect(thesis).toEqual({ code: "000001", name: "平安银行" });
  });

  it("buildChatMemoryContext 会组合用户画像、逻辑卡片和快照", () => {
    const context = buildChatMemoryContext({
      query: "贵州茅台怎么看",
      profile: {
        riskPreference: "balanced",
        investmentStyle: ["growth", "value"],
        holdingPeriodPreference: "mid-term",
        preferredEvidence: ["earnings", "policy"],
        dislikedPatterns: ["pure-theme-hype"],
        summary: "更关注财报兑现，不喜欢追高。",
      },
      thesis: {
        code: "600519",
        name: "贵州茅台",
        watchReason: "关注高端白酒需求和估值切换",
        bullPoints: ["品牌壁垒强", "现金流稳健"],
        bearPoints: ["估值仍偏高"],
        watchSignals: ["季度业绩", "批价"],
        invalidationConditions: ["需求连续两个季度明显走弱"],
        lastJudgement: "逻辑仍成立，但短期更看估值消化",
      },
      recentSnapshots: [
        {
          title: "贵州茅台聊天分析快照",
          summary: "估值压力仍在，但中期现金流和品牌力仍是支撑。",
          createdAt: "2026-04-07T12:00:00.000Z",
        },
      ],
    });

    expect(context).toContain("用户画像");
    expect(context).toContain("关注原因：关注高端白酒需求和估值切换");
    expect(context).toContain("最近分析快照");
    expect(context).toContain("贵州茅台聊天分析快照");
  });
});
