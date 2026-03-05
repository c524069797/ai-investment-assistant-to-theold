import { createTool } from "@mastra/core/tools";
import { z } from "zod";

export const riskAssessmentTool = createTool({
  id: "risk-assessment",
  description: "根据投资类型、金额和投资期限，给出风险等级评估和建议。",
  inputSchema: z.object({
    investmentType: z
      .enum(["stock", "fund", "bond", "deposit", "mixed"])
      .describe("投资类型: stock=股票, fund=基金, bond=债券, deposit=存款, mixed=混合"),
    amount: z.number().optional().describe("投资金额（元）"),
    period: z
      .enum(["short", "medium", "long"])
      .optional()
      .describe("投资期限: short=1年以内, medium=1-3年, long=3年以上"),
    strategy: z
      .enum(["conservative", "aggressive"])
      .optional()
      .describe("策略偏好: conservative=抄底耐力王(稳健), aggressive=热点捕捉者(进取)"),
  }),
  execute: async ({ investmentType, amount, period: rawPeriod, strategy: rawStrategy }) => {
    const period = rawPeriod ?? "medium";
    const strategy = rawStrategy ?? "conservative";

    const riskLevels: Record<string, { level: string; score: number; description: string }> = {
      stock: { level: "高风险", score: 8, description: "股票价格波动大，可能出现较大亏损" },
      fund: { level: "中等风险", score: 5, description: "基金通过分散投资降低了单只股票的风险" },
      bond: { level: "低风险", score: 2, description: "债券收益相对稳定，但收益也较低" },
      deposit: { level: "极低风险", score: 1, description: "银行存款有存款保险保障，非常安全" },
      mixed: { level: "中高风险", score: 6, description: "混合配置可以平衡风险和收益" },
    };

    const risk = riskLevels[investmentType];
    const periodAdvice: Record<string, string> = {
      short: "短期投资波动影响大，建议选择低风险产品",
      medium: "中期投资可以适当承受波动，建议均衡配置",
      long: "长期投资可以忽略短期波动，历史上长期持有收益更好",
    };

    const strategyAdvice = strategy === "conservative"
      ? {
          name: "抄底耐力王",
          tips: [
            "关注低估值蓝筹股，等待超卖信号（RSI < 30）",
            "分批买入，不要一次性投入全部资金",
            "设定 10% 止盈目标，纪律执行",
            "下跌 5% 可考虑补仓，但需评估基本面",
          ],
        }
      : {
          name: "热点捕捉者",
          tips: [
            "关注市场热点题材，追踪资金流向",
            "筛选 5-30 元价格区间的活跃标的",
            "设定 20% 止盈目标，果断执行",
            "热点消散时及时止损，不盲目补仓",
          ],
        };

    return {
      investmentType: investmentType === "stock" ? "股票" : investmentType === "fund" ? "基金" : investmentType === "bond" ? "债券" : investmentType === "deposit" ? "存款" : "混合",
      riskLevel: risk.level,
      riskScore: `${risk.score}/10`,
      riskDescription: risk.description,
      periodAdvice: periodAdvice[period],
      strategy: strategyAdvice,
      amountAdvice: amount
        ? amount > 100000
          ? "建议分散投资，不要把所有资金集中在一个品种上"
          : "投资金额适中，建议根据自身风险承受能力选择产品"
        : undefined,
      generalAdvice: [
        "投资有风险，入市需谨慎",
        "不要用养老金、急用钱来投资高风险产品",
        "建议保留至少6个月的生活费作为应急资金",
        "不懂的产品不要投，先学习再决定",
      ],
    };
  },
});
