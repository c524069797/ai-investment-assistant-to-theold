import useSWR from "swr";
import type { StockQuote, StockSearchResult, StockKLinePoint, MarketIndex } from "@/types/stock";
import type { KLinePeriod } from "@/types/stock";

// 行情相关的客户端数据层使用 SWR：
// - key 决定缓存粒度
// - fetcher 统一处理 success/data 协议
// - refreshInterval 让页面具备轻量实时刷新能力

interface ApiResponse<T> {
  // `ApiResponse<T>` 是泛型接口：同一个接口壳子，data 可以是股票、K线、指数等任意类型。
  success: boolean;
  data?: T;
  error?: string;
}

const fetcher = async <T>(url: string): Promise<T> => {
  // `fetcher<T>` 也是泛型函数。
  // 谁调用它，谁来决定 T 是什么，这样一个 fetcher 就能服务所有 SWR hook。
  // SWR 只关心 Promise；统一 fetcher 后，hooks 可以专注于 key 与刷新策略。
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
    // `useSWR<StockQuote>` 显式告诉 TS：这个 hook 成功后拿到的是 StockQuote。
    // SWR 里 key 为 null 代表“本次不发请求”，这是很常见的条件请求模式。
    code ? `/api/stocks?action=quote&market=${market}&code=${code}` : null,
    fetcher,
    { refreshInterval: 30000, dedupingInterval: 10000, keepPreviousData: true },
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
    { refreshInterval: 60000, dedupingInterval: 30000, keepPreviousData: true },
  );
}

/** 大盘指数 */
export function useMarketIndices() {
  return useSWR<MarketIndex[]>("/api/stocks?action=indices", fetcher, {
    refreshInterval: 30000,
    dedupingInterval: 10000,
    keepPreviousData: true,
  });
}

/** 题材热门股 (按成交额排序) */
export function useTopicStocks(keyword: string) {
  return useSWR<StockSearchResult[]>(
    keyword ? `/api/stocks?action=topic&keyword=${encodeURIComponent(keyword)}&count=10` : null,
    fetcher,
    { dedupingInterval: 3000 },
  );
}
