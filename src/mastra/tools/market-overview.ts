import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { fetchMarketIndices } from "@/lib/api/eastmoney";

export const marketOverviewTool = createTool({
  id: "market-overview",
  description: "获取 A 股大盘主要指数的实时数据，包括上证指数、深证成指、创业板指、沪深300、中证500。",
  inputSchema: z.object({}),
  execute: async () => {
    const indices = await fetchMarketIndices();

    const marketStatus = indices.every((i) => i.price === 0)
      ? "休市中"
      : "交易中";

    return {
      status: marketStatus,
      indices: indices.map((idx) => ({
        name: idx.name,
        code: idx.code,
        price: idx.price.toFixed(2),
        change: `${idx.changePercent > 0 ? "+" : ""}${idx.changePercent.toFixed(2)}%`,
        trend: idx.changePercent > 0 ? "📈" : idx.changePercent < 0 ? "📉" : "➡️",
        amount: `${(idx.amount / 100000000).toFixed(0)}亿`,
      })),
      summary: generateSummary(indices),
    };
  },
});

function generateSummary(
  indices: { name: string; changePercent: number }[],
): string {
  const shanghai = indices.find((i) => i.name === "上证指数");
  const shenzhen = indices.find((i) => i.name === "深证成指");

  if (!shanghai || !shenzhen) return "暂无数据";

  const avgChange = (shanghai.changePercent + shenzhen.changePercent) / 2;

  if (avgChange > 1) return "今日市场表现强劲，整体上涨";
  if (avgChange > 0) return "今日市场小幅上涨，表现平稳";
  if (avgChange > -1) return "今日市场小幅下跌，波动不大";
  return "今日市场下跌较多，请注意风险";
}
