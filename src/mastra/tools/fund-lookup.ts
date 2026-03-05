import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { searchFunds, fetchFundEstimate, fetchFundHistoryNav } from "@/lib/api/tiantianfund";

export const fundLookupTool = createTool({
  id: "fund-lookup",
  description: "查询基金的净值、估值和历史表现。可以通过基金代码或名称查询。",
  inputSchema: z.object({
    query: z.string().describe("基金代码或名称关键词"),
  }),
  execute: async ({ query }) => {
    const isCode = /^\d{6}$/.test(query);

    let fundCode = query;

    if (!isCode) {
      const results = await searchFunds(query);
      if (results.length === 0) {
        return { found: false, message: `未找到与"${query}"相关的基金` };
      }
      fundCode = results[0].code;
    }

    try {
      const [estimate, history] = await Promise.all([
        fetchFundEstimate(fundCode).catch(() => null),
        fetchFundHistoryNav(fundCode, 1, 5),
      ]);

      if (!estimate && history.length === 0) {
        return { found: false, message: `未找到基金 ${fundCode} 的数据` };
      }

      return {
        found: true,
        code: fundCode,
        name: estimate?.name ?? fundCode,
        ...(estimate
          ? {
              currentNav: estimate.nav,
              estimateNav: estimate.estimateNav,
              estimateChange: `${estimate.estimateChangePercent > 0 ? "+" : ""}${estimate.estimateChangePercent.toFixed(2)}%`,
              updateTime: estimate.updateTime,
            }
          : {}),
        recentHistory: history.map((h) => ({
          date: h.date,
          nav: h.nav,
          change: `${h.changePercent > 0 ? "+" : ""}${h.changePercent.toFixed(2)}%`,
        })),
      };
    } catch {
      return { found: false, message: `查询基金 ${fundCode} 时出现错误` };
    }
  },
});
