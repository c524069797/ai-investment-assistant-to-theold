import { describe, expect, it } from "vitest";

import { riskAssessmentTool } from "./risk-assessment";

type RiskInput = Parameters<NonNullable<typeof riskAssessmentTool.execute>>[0];

async function runTool(input: RiskInput) {
  return (riskAssessmentTool.execute as NonNullable<typeof riskAssessmentTool.execute>)(
    input,
    {} as never,
  );
}

describe("src/mastra/tools/risk-assessment.ts", () => {
  it("rates stock as high risk with conservative defaults", async () => {
    const result = await runTool({ investmentType: "stock" });

    expect(result).toMatchObject({
      investmentType: "股票",
      riskLevel: "高风险",
      riskScore: "8/10",
      periodAdvice: "中期投资可以适当承受波动，建议均衡配置",
    });
    expect(result.strategy.name).toBe("抄底耐力王");
    expect(result.amountAdvice).toBeUndefined();
    expect(result.generalAdvice).toContain("投资有风险，入市需谨慎");
  });

  it("returns aggressive strategy tips when requested", async () => {
    const result = await runTool({ investmentType: "mixed", strategy: "aggressive", period: "long" });

    expect(result.riskLevel).toBe("中高风险");
    expect(result.strategy.name).toBe("热点捕捉者");
    expect(result.strategy.tips.join(" ")).toContain("20% 止盈");
    expect(result.periodAdvice).toContain("长期投资");
  });

  it("advises diversification for large amounts even on low-risk products", async () => {
    const result = await runTool({ investmentType: "deposit", amount: 200000 });

    expect(result.riskLevel).toBe("极低风险");
    expect(result.riskScore).toBe("1/10");
    expect(result.amountAdvice).toContain("分散投资");
  });

  it("gives moderate advice for small amounts and short periods", async () => {
    const result = await runTool({ investmentType: "fund", amount: 50000, period: "short" });

    expect(result.investmentType).toBe("基金");
    expect(result.amountAdvice).toContain("金额适中");
    expect(result.periodAdvice).toContain("短期投资");
  });
});
