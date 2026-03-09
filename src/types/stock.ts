/** 股票实时行情 */
export interface StockQuote {
  code: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  open: number;
  high: number;
  low: number;
  close: number;
  preClose: number;
  volume: number;
  amount: number;
  turnoverRate: number;
  pe: number;
  pb: number;
  totalMarketCap: number;
  circulationMarketCap: number;
  market: number;
}

/** K线数据点 */
export interface StockKLinePoint {
  date: string;
  open: number;
  close: number;
  high: number;
  low: number;
  volume: number;
  amount: number;
  changePercent: number;
}

/** 股票搜索结果 */
export interface StockSearchResult {
  code: string;
  name: string;
  market: number;
  type: string;
  price?: number;
  change?: number;
  changePercent?: number;
  amount?: number;
}

/** 大盘指数 */
export interface MarketIndex {
  code: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  amount: number;
}

/** 股票排行项 (来自 clist 接口) */
export interface StockRankingItem {
  code: string;
  name: string;
  market: number;
  price: number;
  changePercent: number;
  volume: number;
  amount: number;
  turnoverRate: number;
  industry: string;
  pe: number;
  pb: number;
  totalMarketCap: number;
}

/** K线周期 */
export type KLinePeriod = "daily" | "weekly" | "monthly";
