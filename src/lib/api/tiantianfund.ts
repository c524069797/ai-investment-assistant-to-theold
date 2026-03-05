import type { FundBasicInfo, FundEstimate, FundHistoryNav, FundSearchResult } from "@/types/fund";

let fundListCache: { data: FundBasicInfo[]; timestamp: number } | null = null;
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

/** 获取全量基金列表 (带缓存) */
export async function fetchFundList(): Promise<FundBasicInfo[]> {
  if (fundListCache && Date.now() - fundListCache.timestamp < CACHE_TTL) {
    return fundListCache.data;
  }

  const url = "https://fund.eastmoney.com/js/fundcode_search.js";
  const res = await fetch(url, { next: { revalidate: 86400 } });
  const text = await res.text();

  // Parse: var r = [["000001","HXCZHH","华夏成长混合","混合型-偏股","HUAXIACHENGZHANGHUNHE"],...]
  const match = text.match(/\[(\[[\s\S]*\])\]/);
  if (!match) {
    return [];
  }

  const data: FundBasicInfo[] = JSON.parse(`[${match[1]}]`).map(
    (item: string[]) => ({
      code: item[0],
      pinyin: item[1],
      name: item[2],
      type: item[3],
    }),
  );

  fundListCache = { data, timestamp: Date.now() };
  return data;
}

/** 搜索基金 (本地搜索) */
export async function searchFunds(keyword: string): Promise<FundSearchResult[]> {
  const allFunds = await fetchFundList();
  const kw = keyword.toLowerCase();

  return allFunds
    .filter(
      (f) =>
        f.code.includes(kw) ||
        f.name.toLowerCase().includes(kw) ||
        f.pinyin.toLowerCase().includes(kw),
    )
    .slice(0, 30)
    .map((f) => ({
      code: f.code,
      name: f.name,
      type: f.type,
    }));
}

/** 获取基金实时估值 */
export async function fetchFundEstimate(code: string): Promise<FundEstimate> {
  const url = `https://fundgz.1234567.com.cn/js/${code}.js?rt=${Date.now()}`;
  const res = await fetch(url, { next: { revalidate: 30 } });
  const text = await res.text();

  // Parse JSONP: jsonpgz({...})
  const match = text.match(/jsonpgz\((.+)\)/);
  if (!match) {
    throw new Error(`Fund not found: ${code}`);
  }

  const d = JSON.parse(match[1]);

  return {
    code: d.fundcode,
    name: d.name,
    nav: parseFloat(d.dwjz),
    estimateNav: parseFloat(d.gsz),
    estimateChange: parseFloat(d.gsz) - parseFloat(d.dwjz),
    estimateChangePercent: parseFloat(d.gszzl),
    updateTime: d.gztime,
    fundType: d.fundtype ?? "",
  };
}

/** 获取基金历史净值 */
export async function fetchFundHistoryNav(
  code: string,
  page: number = 1,
  per: number = 30,
): Promise<FundHistoryNav[]> {
  const url = `https://api.fund.eastmoney.com/f10/lsjz?fundCode=${code}&pageIndex=${page}&pageSize=${per}&startDate=&endDate=&callback=`;
  const res = await fetch(url, {
    headers: { Referer: "https://fundf10.eastmoney.com/" },
    next: { revalidate: 300 },
  });
  const text = await res.text();

  let json;
  try {
    // Sometimes wrapped in callback, sometimes raw JSON
    const cleaned = text.replace(/^[^(]*\(/, "").replace(/\);?$/, "");
    json = JSON.parse(cleaned || text);
  } catch {
    json = JSON.parse(text);
  }

  if (!json.Data?.LSJZList) {
    return [];
  }

  return json.Data.LSJZList.map((item: Record<string, string>) => ({
    date: item.FSRQ,
    nav: parseFloat(item.DWJZ) || 0,
    accNav: parseFloat(item.LJJZ) || 0,
    changePercent: parseFloat(item.JZZZL) || 0,
  }));
}
