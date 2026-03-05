import useSWR from "swr";
import type { StockQuote, StockSearchResult, StockKLinePoint, MarketIndex } from "@/types/stock";
import type { KLinePeriod } from "@/types/stock";

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

const fetcher = async <T>(url: string): Promise<T> => {
  const res = await fetch(url);
  const json: ApiResponse<T> = await res.json();
  if (!json.success || !json.data) {
    throw new Error(json.error ?? "Failed to fetch");
  }
  return json.data;
};

/** 股票实时行情 */
export function useStockQuote(market: number, code: string) {
  return useSWR<StockQuote>(
    code ? `/api/stocks?action=quote&market=${market}&code=${code}` : null,
    fetcher,
    { refreshInterval: 30000 },
  );
}

/** 股票搜索 */
export function useStockSearch(keyword: string) {
  return useSWR<StockSearchResult[]>(
    keyword ? `/api/stocks?action=search&keyword=${encodeURIComponent(keyword)}` : null,
    fetcher,
    { dedupingInterval: 1000 },
  );
}

/** K线数据 */
export function useStockKLine(
  market: number,
  code: string,
  period: KLinePeriod = "daily",
  count: number = 120,
) {
  return useSWR<StockKLinePoint[]>(
    code
      ? `/api/stocks?action=kline&market=${market}&code=${code}&period=${period}&count=${count}`
      : null,
    fetcher,
    { refreshInterval: 60000 },
  );
}

/** 大盘指数 */
export function useMarketIndices() {
  return useSWR<MarketIndex[]>("/api/stocks?action=indices", fetcher, {
    refreshInterval: 15000,
  });
}
