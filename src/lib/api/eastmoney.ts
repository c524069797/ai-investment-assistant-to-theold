import type { StockQuote, StockSearchResult, StockKLinePoint, MarketIndex } from "@/types/stock";
import { KLINE_PERIOD_MAP, MARKET_INDICES } from "@/lib/constants/market";
import type { KLinePeriod } from "@/types/stock";

const PUSH2_BASE = "https://push2.eastmoney.com/api/qt";
const PUSH2HIS_BASE = "https://push2his.eastmoney.com/api/qt";
const SEARCH_BASE = "https://searchapi.eastmoney.com/api/suggest/get";

function buildSecId(market: number, code: string): string {
  return `${market}.${code}`;
}

/** 获取股票实时行情 */
export async function fetchStockQuote(market: number, code: string): Promise<StockQuote> {
  const secId = buildSecId(market, code);
  const fields = "f43,f44,f45,f46,f47,f48,f57,f58,f60,f116,f117,f162,f167,f168,f169,f170,f171";
  const url = `${PUSH2_BASE}/stock/get?secid=${secId}&fields=${fields}&ut=fa5fd1943c7b386f172d6893dbfba10b`;

  const res = await fetch(url, { next: { revalidate: 10 } });
  const json = await res.json();
  const d = json.data;

  if (!d) {
    throw new Error(`Stock not found: ${code}`);
  }

  return {
    code: String(d.f57),
    name: String(d.f58),
    price: d.f43 / 100,
    change: d.f169 / 100,
    changePercent: d.f170 / 100,
    open: d.f44 / 100,
    high: d.f45 / 100,
    low: d.f46 / 100,
    close: d.f43 / 100,
    preClose: d.f60 / 100,
    volume: d.f47,
    amount: d.f48,
    turnoverRate: d.f168 / 100,
    pe: d.f162 / 100,
    pb: d.f167 / 100,
    totalMarketCap: d.f116,
    circulationMarketCap: d.f117,
    market,
  };
}

/** 搜索股票 */
export async function searchStocks(keyword: string): Promise<StockSearchResult[]> {
  const url = `${SEARCH_BASE}?input=${encodeURIComponent(keyword)}&type=14&token=D43BF722C8E33BDC906FB84D85E326E8&count=20`;

  const res = await fetch(url, { next: { revalidate: 60 } });
  const json = await res.json();

  if (!json.QuotationCodeTable?.Data) {
    return [];
  }

  return json.QuotationCodeTable.Data.filter(
    (item: Record<string, string>) => item.SecurityTypeName === "A股" || item.SecurityTypeName === "指数",
  ).map((item: Record<string, string>) => ({
    code: item.Code,
    name: item.Name,
    market: item.MktNum === "1" ? 1 : 0,
    type: item.SecurityTypeName,
  }));
}

/** 获取 K 线数据 */
export async function fetchStockKLine(
  market: number,
  code: string,
  period: KLinePeriod = "daily",
  count: number = 120,
): Promise<StockKLinePoint[]> {
  const secId = buildSecId(market, code);
  const klt = KLINE_PERIOD_MAP[period];
  const fields = "f51,f52,f53,f54,f55,f56,f57,f58";
  const url = `${PUSH2HIS_BASE}/stock/kline/get?secid=${secId}&klt=${klt}&fqt=1&lmt=${count}&end=20500101&fields1=f1,f2,f3,f4,f5,f6&fields2=${fields}&ut=fa5fd1943c7b386f172d6893dbfba10b`;

  const res = await fetch(url, { next: { revalidate: 60 } });
  const json = await res.json();

  if (!json.data?.klines) {
    return [];
  }

  return json.data.klines.map((line: string) => {
    const [date, open, close, high, low, volume, amount, changePercent] = line.split(",");
    return {
      date,
      open: parseFloat(open),
      close: parseFloat(close),
      high: parseFloat(high),
      low: parseFloat(low),
      volume: parseInt(volume, 10),
      amount: parseFloat(amount),
      changePercent: parseFloat(changePercent),
    };
  });
}

/** 获取大盘指数 */
export async function fetchMarketIndices(): Promise<MarketIndex[]> {
  const results = await Promise.all(
    MARKET_INDICES.map(async ([market, code, name]) => {
      try {
        const secId = buildSecId(market, code);
        const url = `${PUSH2_BASE}/stock/get?secid=${secId}&fields=f43,f44,f45,f46,f47,f48,f57,f58,f169,f170&ut=fa5fd1943c7b386f172d6893dbfba10b`;
        const res = await fetch(url, { next: { revalidate: 15 } });
        const json = await res.json();
        const d = json.data;

        return {
          code,
          name,
          price: d.f43 / 100,
          change: d.f169 / 100,
          changePercent: d.f170 / 100,
          volume: d.f47,
          amount: d.f48,
        };
      } catch {
        return { code, name, price: 0, change: 0, changePercent: 0, volume: 0, amount: 0 };
      }
    }),
  );

  return results;
}
