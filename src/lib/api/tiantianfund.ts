import type { FundBasicInfo, FundEstimate, FundHistoryNav, FundSearchResult, FundDetail, FundHolding, FundFeeInfo } from "@/types/fund";

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

/** 搜索基金 (本地搜索，并附带最新涨跌) */
export async function searchFunds(keyword: string): Promise<FundSearchResult[]> {
  const allFunds = await fetchFundList();
  const kw = keyword.toLowerCase();

  const matched = allFunds
    .filter(
      (f) =>
        f.code.includes(kw) ||
        f.name.toLowerCase().includes(kw) ||
        f.pinyin.toLowerCase().includes(kw),
    )
    .slice(0, 20);

  // Batch fetch latest nav change for each matched fund
  const results: FundSearchResult[] = await Promise.all(
    matched.map(async (f) => {
      let changePercent: number | undefined;
      try {
        const hist = await fetchFundHistoryNav(f.code, 1, 1);
        if (hist.length > 0) {
          changePercent = hist[0].changePercent;
        }
      } catch {
        // ignore - show without change data
      }
      return {
        code: f.code,
        name: f.name,
        type: f.type,
        changePercent,
      };
    }),
  );

  return results;
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

/** 获取基金详细信息（持仓、费率、基本面等） */
export async function fetchFundDetail(code: string): Promise<FundDetail> {
  // Fetch fund basic info from EastMoney pingzhongdata
  const detailUrl = `https://fund.eastmoney.com/pingzhongdata/${code}.js?v=${Date.now()}`;
  const res = await fetch(detailUrl, {
    headers: { Referer: "https://fund.eastmoney.com/" },
    next: { revalidate: 3600 },
  });
  const text = await res.text();

  // Parse JS variables
  const getString = (varName: string): string => {
    const regex = new RegExp(`var\\s+${varName}\\s*=\\s*"([^"]*)"`, "m");
    const match = text.match(regex);
    return match?.[1] ?? "";
  };

  const getJSON = (varName: string): unknown => {
    const regex = new RegExp(`var\\s+${varName}\\s*=\\s*(\\[.*?\\]);`, "ms");
    const match = text.match(regex);
    if (!match) return [];
    try {
      return JSON.parse(match[1]);
    } catch {
      return [];
    }
  };

  const fundName = getString("fS_name");
  const fundCode = getString("fS_code");

  // Fetch quarterly holdings from FundArchivesDatas API (HTML parsing)
  const { holdings, holdingPeriod } = await fetchFundHoldings(code);

  // Parse performance data
  const performanceData = getJSON("Data_netWorthTrend") as Array<{ x: number; y: number; equityReturn: number }>;
  let performanceYTD = "";
  let performance1Y = "";
  let performance3Y = "";

  if (performanceData.length > 0) {
    const now = Date.now();
    const yearStart = new Date(new Date().getFullYear(), 0, 1).getTime();
    const oneYearAgo = now - 365 * 24 * 3600 * 1000;
    const threeYearsAgo = now - 3 * 365 * 24 * 3600 * 1000;

    const latest = performanceData[performanceData.length - 1];
    const ytdStart = performanceData.find((d) => d.x >= yearStart);
    const oneYStart = performanceData.find((d) => d.x >= oneYearAgo);
    const threeYStart = performanceData.find((d) => d.x >= threeYearsAgo);

    if (latest && ytdStart) {
      performanceYTD = ((latest.y / ytdStart.y - 1) * 100).toFixed(2) + "%";
    }
    if (latest && oneYStart) {
      performance1Y = ((latest.y / oneYStart.y - 1) * 100).toFixed(2) + "%";
    }
    if (latest && threeYStart) {
      performance3Y = ((latest.y / threeYStart.y - 1) * 100).toFixed(2) + "%";
    }
  }

  // Fetch fund fee info
  const fees = await fetchFundFees(code);

  // Fetch additional info (manager, company, scale)
  const infoUrl = `https://fundsuggest.eastmoney.com/FundSearch/api/FundSearchPageData.ashx?m=1&key=${code}&callback=`;
  const infoRes = await fetch(infoUrl, { next: { revalidate: 86400 } });
  const infoText = await infoRes.text();
  let manager = "";
  let company = "";
  let scale = "";
  let fundType = "";
  let benchmark = "";
  let establishDate = "";

  try {
    const cleaned = infoText.replace(/^[^(]*\(/, "").replace(/\);?$/, "");
    const infoJson = JSON.parse(cleaned || infoText);
    if (infoJson?.Datas?.[0]) {
      const d = infoJson.Datas[0];
      manager = d.FundManager ?? "";
      company = d.FundCompany ?? "";
      scale = d.FundScale ?? "";
      fundType = d.FundBaseInfoType ?? "";
      benchmark = d.FundBenchmark ?? "";
      establishDate = d.FundEstablishDate ?? "";
    }
  } catch {
    // ignore parse error
  }

  return {
    code: fundCode || code,
    name: fundName || code,
    type: fundType,
    manager,
    company,
    establishDate,
    scale,
    holdings,
    holdingPeriod,
    fees,
    benchmark,
    performanceYTD,
    performance1Y,
    performance3Y,
  };
}

/** 从东方财富 FundArchivesDatas API 获取最新季度持仓（解析 HTML） */
async function fetchFundHoldings(code: string): Promise<{ holdings: FundHolding[]; holdingPeriod: string }> {
  const url = `https://fundf10.eastmoney.com/FundArchivesDatas.aspx?type=jjcc&code=${code}&topline=10&year=&month=&rt=${Date.now()}`;

  try {
    const res = await fetch(url, {
      headers: { Referer: "https://fundf10.eastmoney.com/" },
      next: { revalidate: 3600 },
    });
    const text = await res.text();

    // Extract the content from: var apidata={ content:"..." }
    const contentMatch = text.match(/content:"([\s\S]*?)"\s*,\s*arryear/);
    if (!contentMatch) {
      return { holdings: [], holdingPeriod: "" };
    }

    const html = contentMatch[1];

    // Extract holding period from the first box (latest quarter)
    // Pattern: "2025年4季度股票投资明细"
    const periodMatch = html.match(/(\d{4}年\d季度)股票投资明细/);
    const holdingPeriod = periodMatch?.[1] ?? "";

    // Extract the first table (latest quarter) - find rows between first <tbody> and </tbody>
    const firstTableMatch = html.match(/<tbody>([\s\S]*?)<\/tbody>/);
    if (!firstTableMatch) {
      return { holdings: [], holdingPeriod };
    }

    const tableHtml = firstTableMatch[1];
    const holdings: FundHolding[] = [];

    // Parse each row: <tr><td>序号</td><td class='toc'>股票代码</td><td class='toc'>股票名称</td>...
    const rowRegex = /<tr>([\s\S]*?)<\/tr>/g;
    let rowMatch;

    while ((rowMatch = rowRegex.exec(tableHtml)) !== null) {
      const row = rowMatch[1];
      const cells: string[] = [];

      // Extract text content from each <td>
      const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/g;
      let cellMatch;
      while ((cellMatch = cellRegex.exec(row)) !== null) {
        // Strip HTML tags to get text content
        const cellText = cellMatch[1].replace(/<[^>]*>/g, "").trim();
        cells.push(cellText);
      }

      // cells layout for Q4 (with price columns):
      // [序号, 股票代码, 股票名称, 最新价, 涨跌幅, 相关资讯, 占净值比例, 持股数(万股), 持仓市值(万元)]
      // cells layout for other quarters (without price columns):
      // [序号, 股票代码, 股票名称, 相关资讯, 占净值比例, 持股数(万股), 持仓市值(万元)]

      if (cells.length >= 7) {
        // Determine if this is the Q4 format (has price columns) or other format
        // Q4 has 9 cells, other quarters have 7
        const hasPrice = cells.length >= 9;

        const stockCode = cells[1];
        const stockName = cells[2];
        const percentIdx = hasPrice ? 6 : 4;
        const amountIdx = hasPrice ? 7 : 5;
        const valueIdx = hasPrice ? 8 : 6;

        const holdPercent = parseFloat(cells[percentIdx]?.replace("%", "")) || 0;
        const holdAmount = parseFloat(cells[amountIdx]?.replace(/,/g, "")) || 0;
        const holdMarketValue = parseFloat(cells[valueIdx]?.replace(/,/g, "")) || 0;

        if (stockCode && stockName) {
          holdings.push({
            stockCode,
            stockName,
            holdPercent,
            holdAmount,
            holdMarketValue,
          });
        }
      }
    }

    return { holdings, holdingPeriod };
  } catch {
    return { holdings: [], holdingPeriod: "" };
  }
}

/** 获取基金费率信息（从 HTML 页面解析） */
async function fetchFundFees(code: string): Promise<FundFeeInfo> {
  const defaultFees: FundFeeInfo = {
    manageFee: "—",
    trustFee: "—",
    saleFee: "—",
    purchaseFee: "—",
    redeemFee: "—",
    totalOperationFee: "—",
  };

  try {
    const url = `https://fundf10.eastmoney.com/jjfl_${code}.html`;
    const res = await fetch(url, {
      headers: { Referer: "https://fundf10.eastmoney.com/" },
      next: { revalidate: 86400 },
    });
    const html = await res.text();

    // Extract fee-related table rows
    // Table 5 pattern: 管理费率 | 1.20%（每年） | 托管费率 | 0.20%（每年） | 销售服务费率 | ---
    const stripTags = (s: string) => s.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();

    let manageFee = "—";
    let trustFee = "—";
    let saleFee = "—";
    let purchaseFee = "—";
    let redeemFee = "—";

    // Find the row with 管理费率/托管费率/销售服务费率
    const feeRowMatch = html.match(/<tr[^>]*>[\s\S]*?管理费率[\s\S]*?<\/tr>/);
    if (feeRowMatch) {
      const cells = [...feeRowMatch[0].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map(m => stripTags(m[1]));
      // cells: [管理费率, 1.20%（每年）, 托管费率, 0.20%（每年）, 销售服务费率, ---]
      for (let i = 0; i < cells.length - 1; i++) {
        if (cells[i].includes("管理费率")) manageFee = cells[i + 1].replace(/（.*）/, "");
        if (cells[i].includes("托管费率")) trustFee = cells[i + 1].replace(/（.*）/, "");
        if (cells[i].includes("销售服务费率")) saleFee = cells[i + 1] === "---" ? "—" : cells[i + 1].replace(/（.*）/, "");
      }
    }

    // Find purchase fee (申购费) from the purchase fee table
    // The purchase fee table contains "银行卡购买" or "活期宝购买" to distinguish from operation fee table
    const tables = html.match(/<table[^>]*>[\s\S]*?<\/table>/g) ?? [];
    for (const table of tables) {
      const tableText = stripTags(table);
      if (tableText.includes("原费率") && (tableText.includes("银行卡购买") || tableText.includes("活期宝购买"))) {
        const rows = [...table.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)];
        for (const row of rows) {
          const rowText = stripTags(row[1]);
          if (rowText.includes("小于100万元") || rowText.includes("小于 100万元")) {
            const cells = [...row[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map(m => stripTags(m[1]));
            // Last cell: "1.50% | 0.15% | 0.15%" (原费率 | 银行卡优惠 | 活期宝优惠)
            const lastCell = cells[cells.length - 1];
            const rates = lastCell.split("|").map(s => s.trim());
            purchaseFee = rates[0] || "—";
            break;
          }
        }
        break;
      }
    }

    // Find redeem fee (赎回费) - use the normal holding period row (7-29 days), not the punitive ≤6 day rate
    for (const table of tables) {
      if (stripTags(table).includes("赎回费率")) {
        const rows = [...table.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)];
        for (const row of rows) {
          const cells = [...row[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map(m => stripTags(m[1]));
          // Look for the 7-29 day or 7-30 day row as the representative redeem fee
          const isNormalPeriod = cells.some(c => /大于等于7天/.test(c) || /大于6天/.test(c));
          if (isNormalPeriod) {
            const feeCell = cells.find(c => c.includes("%"));
            if (feeCell) {
              redeemFee = feeCell;
              break;
            }
          }
        }
        // If no 7-day row found, fall back to first data row with a percentage
        if (redeemFee === "—") {
          for (const row of rows) {
            const cells = [...row[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map(m => stripTags(m[1]));
            const feeCell = cells.find(c => /^\d+\.\d+%$/.test(c));
            if (feeCell) {
              redeemFee = feeCell;
              break;
            }
          }
        }
        break;
      }
    }

    // Calculate total operation fee
    const mFee = parseFloat(manageFee) || 0;
    const tFee = parseFloat(trustFee) || 0;
    const totalOp = mFee + tFee;

    return {
      manageFee: manageFee === "—" ? "—" : manageFee,
      trustFee: trustFee === "—" ? "—" : trustFee,
      saleFee,
      purchaseFee,
      redeemFee,
      totalOperationFee: totalOp > 0 ? totalOp.toFixed(2) + "%/年" : "—",
    };
  } catch {
    // ignore
  }

  return defaultFees;
}
