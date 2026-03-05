import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { searchStocks, fetchStockQuote } from "@/lib/api/eastmoney";

/** 热点关键词列表 (模拟 - 实际可对接财联社/微博API) */
const SIMULATED_HOTSPOTS = [
  { keyword: "人工智能", sector: "AI/科技", heat: 95 },
  { keyword: "新能源", sector: "新能源", heat: 88 },
  { keyword: "半导体", sector: "芯片", heat: 85 },
  { keyword: "医药", sector: "医药健康", heat: 72 },
  { keyword: "消费", sector: "大消费", heat: 68 },
  { keyword: "军工", sector: "国防军工", heat: 65 },
  { keyword: "数字经济", sector: "数字经济", heat: 78 },
  { keyword: "机器人", sector: "智能制造", heat: 82 },
];

export const hotspotAnalyzerTool = createTool({
  id: "hotspot-analyzer",
  description:
    "热点捕捉者策略分析工具。分析当前市场热点，筛选5-30元价格区间的相关标的，用于妈妈的动能投资策略。",
  inputSchema: z.object({
    keyword: z
      .string()
      .optional()
      .describe("可选的热点关键词，不传则返回当前所有热点"),
    priceMin: z.number().optional().describe("最低价格，默认5元"),
    priceMax: z.number().optional().describe("最高价格，默认30元"),
  }),
  execute: async ({ keyword, priceMin: rawMin, priceMax: rawMax }) => {
    const priceMin = rawMin ?? 5;
    const priceMax = rawMax ?? 30;

    // Get current hotspots
    const hotspots = keyword
      ? SIMULATED_HOTSPOTS.filter((h) =>
          h.keyword.includes(keyword) || h.sector.includes(keyword),
        )
      : SIMULATED_HOTSPOTS.filter((h) => h.heat >= 70);

    if (hotspots.length === 0 && keyword) {
      return {
        hotspots: [],
        matchedStocks: [],
        message: `未找到与"${keyword}"相关的热点，当前热门话题：${SIMULATED_HOTSPOTS.slice(0, 5).map((h) => h.keyword).join("、")}`,
      };
    }

    // Search stocks for the hottest topic
    const targetKeyword = keyword ?? hotspots[0]?.keyword ?? "人工智能";
    const searchResults = await searchStocks(targetKeyword);

    // Filter by price range - fetch quotes for top results
    const priceChecked = await Promise.all(
      searchResults.slice(0, 15).map(async (stock) => {
        try {
          const quote = await fetchStockQuote(stock.market, stock.code);
          return { ...stock, price: quote.price, changePercent: quote.changePercent, volume: quote.volume, turnoverRate: quote.turnoverRate };
        } catch {
          return null;
        }
      }),
    );

    const filtered = priceChecked
      .filter((s): s is NonNullable<typeof s> => s !== null && s.price >= priceMin && s.price <= priceMax)
      .sort((a, b) => b.turnoverRate - a.turnoverRate)
      .slice(0, 8);

    // Check if hotspot is still "alive" (heat > 60)
    const isHotspotAlive = hotspots.some((h) => h.heat >= 60);

    return {
      currentHotspots: hotspots.map((h) => ({
        keyword: h.keyword,
        sector: h.sector,
        heat: `${h.heat}/100`,
        status: h.heat >= 80 ? "🔥 火爆" : h.heat >= 60 ? "📈 活跃" : "📊 一般",
      })),
      searchKeyword: targetKeyword,
      priceFilter: `${priceMin}-${priceMax}元`,
      matchedStocks: filtered.map((s) => ({
        code: s.code,
        name: s.name,
        price: `${s.price.toFixed(2)}元`,
        changePercent: `${s.changePercent > 0 ? "+" : ""}${s.changePercent.toFixed(2)}%`,
        turnoverRate: `${s.turnoverRate.toFixed(2)}%`,
        inPriceRange: true,
      })),
      totalMatched: filtered.length,
      hotspotStatus: isHotspotAlive ? "热点仍然活跃" : "⚠️ 热点有消散迹象，谨慎追高",
      strategyRules: {
        buyCondition: `热点关键词匹配 + 股价在 ${priceMin}-${priceMax} 元区间 + 换手率较高`,
        takeProfit: "盈利达到 20% 时果断卖出",
        stopLoss: "若热点消散，立即止损而非补仓",
        addPosition: "仅在热点持续升温时考虑补仓",
      },
      riskWarning: "⚠️ 热点轮动快，追涨需谨慎。建议小仓位参与，严格止盈止损。",
    };
  },
});
