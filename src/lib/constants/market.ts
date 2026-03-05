/** 大盘指数列表: [market, code, name] */
export const MARKET_INDICES: [number, string, string][] = [
  [1, "000001", "上证指数"],
  [0, "399001", "深证成指"],
  [0, "399006", "创业板指"],
  [1, "000300", "沪深300"],
  [1, "000905", "中证500"],
];

/** 基金类型 */
export const FUND_TYPES: Record<string, string> = {
  gp: "股票型",
  hh: "混合型",
  zq: "债券型",
  zs: "指数型",
  qdii: "QDII",
  fof: "FOF",
  hb: "货币型",
};

/** 东方财富 K线周期映射 */
export const KLINE_PERIOD_MAP: Record<string, string> = {
  daily: "101",
  weekly: "102",
  monthly: "103",
};

/** 投资策略模式 */
export type StrategyMode = "conservative" | "aggressive";

export const STRATEGY_MODES: Record<StrategyMode, { name: string; description: string }> = {
  conservative: {
    name: "抄底耐力王",
    description: "均值回归策略 — 寻找超卖、触及支撑位的低估值机会，分批买入，稳健止盈",
  },
  aggressive: {
    name: "热点捕捉者",
    description: "动能投资策略 — 追踪市场热点，筛选5-30元活跃标的，快速响应，果断操作",
  },
};
