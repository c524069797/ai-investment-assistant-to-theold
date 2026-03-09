/** A股涨跌颜色 - 红涨绿跌 */
export const STOCK_COLORS = {
  /** 上涨 - 红色 */
  up: "#cf1322",
  /** 下跌 - 绿色 */
  down: "#389e0d",
  /** 持平 - 灰色 */
  flat: "#8c8c8c",
} as const;

export function getPriceColor(change: number): string {
  if (change > 0) return STOCK_COLORS.up;
  if (change < 0) return STOCK_COLORS.down;
  return STOCK_COLORS.flat;
}

export function formatPercent(value: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

export function formatPrice(value: number): string {
  return value.toFixed(2);
}

export function formatAmount(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "--";
  if (value >= 100000000) return `${(value / 100000000).toFixed(2)}亿`;
  if (value >= 10000) return `${(value / 10000).toFixed(2)}万`;
  return value.toFixed(0);
}
