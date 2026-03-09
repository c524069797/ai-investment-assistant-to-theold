/** 基金基本信息 */
export interface FundBasicInfo {
  code: string;
  name: string;
  type: string;
  pinyin: string;
}

/** 基金实时估值 */
export interface FundEstimate {
  code: string;
  name: string;
  nav: number;
  estimateNav: number;
  estimateChange: number;
  estimateChangePercent: number;
  updateTime: string;
  fundType: string;
}

/** 基金历史净值 */
export interface FundHistoryNav {
  date: string;
  nav: number;
  accNav: number;
  changePercent: number;
}

/** 基金搜索结果 */
export interface FundSearchResult {
  code: string;
  name: string;
  type: string;
  changePercent?: number;
}

/** 基金持仓股 */
export interface FundHolding {
  stockCode: string;
  stockName: string;
  holdPercent: number;
  holdAmount: number;
  holdMarketValue: number;
}

/** 基金费率信息 */
export interface FundFeeInfo {
  manageFee: string;
  trustFee: string;
  saleFee: string;
  purchaseFee: string;
  redeemFee: string;
  totalOperationFee: string;
}

/** 基金详细信息 */
export interface FundDetail {
  code: string;
  name: string;
  type: string;
  manager: string;
  company: string;
  establishDate: string;
  scale: string;
  holdings: FundHolding[];
  holdingPeriod: string;
  fees: FundFeeInfo;
  benchmark: string;
  performanceYTD: string;
  performance1Y: string;
  performance3Y: string;
}
