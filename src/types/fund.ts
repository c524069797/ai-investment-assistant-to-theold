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
}
