import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { searchStocks, fetchStockQuote } from "@/lib/api/eastmoney";

export const stockLookupTool = createTool({
  id: "stock-lookup",
  description: "查询 A 股股票的实时行情数据。可以通过股票代码（如600519）或名称（如贵州茅台）查询。",
  inputSchema: z.object({
    query: z.string().describe("股票代码或名称，例如 '600519' 或 '贵州茅台'"),
  }),
  execute: async ({ query }) => {

    // Try direct code lookup first
    const isCode = /^\d{6}$/.test(query);

    if (isCode) {
      // Determine market: 6xx = Shanghai(1), 0xx/3xx = Shenzhen(0)
      const market = query.startsWith("6") ? 1 : 0;
      try {
        const quote = await fetchStockQuote(market, query);
        return formatQuote(quote);
      } catch {
        // Fall through to search
      }
    }

    // Search by name/keyword
    const results = await searchStocks(query);
    if (results.length === 0) {
      return { found: false, message: `未找到与"${query}"相关的股票` };
    }

    // Get quote for the first result
    const first = results[0];
    try {
      const quote = await fetchStockQuote(first.market, first.code);
      return formatQuote(quote);
    } catch {
      return {
        found: true,
        code: first.code,
        name: first.name,
        message: "找到股票但暂时无法获取实时行情",
      };
    }
  },
});

function formatQuote(q: {
  code: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  open: number;
  high: number;
  low: number;
  preClose: number;
  volume: number;
  amount: number;
  turnoverRate: number;
  pe: number;
  pb: number;
  totalMarketCap: number;
}) {
  return {
    found: true,
    code: q.code,
    name: q.name,
    currentPrice: q.price,
    change: q.change,
    changePercent: `${q.changePercent > 0 ? "+" : ""}${q.changePercent.toFixed(2)}%`,
    open: q.open,
    high: q.high,
    low: q.low,
    previousClose: q.preClose,
    volume: `${(q.volume / 10000).toFixed(0)}万手`,
    amount: `${(q.amount / 100000000).toFixed(2)}亿`,
    turnoverRate: `${q.turnoverRate.toFixed(2)}%`,
    pe: q.pe.toFixed(2),
    pb: q.pb.toFixed(2),
    marketCap: `${(q.totalMarketCap / 100000000).toFixed(0)}亿`,
    status: q.changePercent > 0 ? "📈 上涨" : q.changePercent < 0 ? "📉 下跌" : "➡️ 持平",
  };
}
