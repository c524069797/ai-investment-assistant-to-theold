import type { BrowserContext, Route } from "@playwright/test";

interface WatchlistItem {
  code: string;
  name: string;
  market: number;
  type: "stock" | "fund";
}

interface ChatSessionSummary {
  id: string;
  title: string;
  preview: string;
  updatedAt: string;
}

interface ChatMessageRecord {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
}

interface MockAppOptions {
  startLoggedIn?: boolean;
  initialWatchlist?: WatchlistItem[];
  chatReply?: string;
  initialSessions?: ChatSessionSummary[];
  initialMessages?: Record<string, ChatMessageRecord[]>;
}

const mockUser = {
  id: "dad",
  username: "baba",
  name: "爸爸",
  avatar: "👨",
};

const stockQuote = {
  code: "600519",
  name: "贵州茅台",
  price: 1520,
  change: 12,
  changePercent: 0.8,
  open: 1500,
  high: 1528,
  low: 1498,
  close: 1520,
  preClose: 1508,
  volume: 120000,
  amount: 3100000000,
  turnoverRate: 1.23,
  pe: 25.68,
  pb: 8.12,
  totalMarketCap: 1910000000000,
  circulationMarketCap: 1680000000000,
  market: 1,
};

const stockSearchResults = [{
  code: "600519",
  name: "贵州茅台",
  market: 1,
  type: "stock",
  price: 1520,
  change: 12,
  changePercent: 0.8,
  amount: 3100000000,
}];

const stockKLine = [
  { date: "2026-03-18", open: 1490, close: 1502, high: 1508, low: 1486, volume: 100000, amount: 2800000000, changePercent: 0.7 },
  { date: "2026-03-19", open: 1502, close: 1510, high: 1518, low: 1499, volume: 108000, amount: 2900000000, changePercent: 0.53 },
  { date: "2026-03-20", open: 1510, close: 1505, high: 1516, low: 1497, volume: 98000, amount: 2750000000, changePercent: -0.33 },
  { date: "2026-03-21", open: 1505, close: 1508, high: 1512, low: 1500, volume: 102000, amount: 2820000000, changePercent: 0.2 },
  { date: "2026-03-22", open: 1508, close: 1520, high: 1528, low: 1506, volume: 120000, amount: 3100000000, changePercent: 0.8 },
];

const marketIndices = [
  { code: "000001", name: "上证指数", price: 3308.15, change: 18.21, changePercent: 0.55, volume: 0, amount: 0 },
  { code: "399001", name: "深证成指", price: 10680.23, change: -22.18, changePercent: -0.21, volume: 0, amount: 0 },
  { code: "399006", name: "创业板指", price: 2175.8, change: 8.68, changePercent: 0.4, volume: 0, amount: 0 },
];

const fundSearchResults = [{
  code: "161725",
  name: "招商中证白酒指数",
  type: "指数型",
  changePercent: 1.23,
}];

const fundEstimate = {
  code: "161725",
  name: "招商中证白酒指数",
  nav: 0.95,
  estimateNav: 0.97,
  estimateChange: 0.02,
  estimateChangePercent: 2.12,
  updateTime: "2026-03-22 14:30",
  fundType: "指数型",
};

const fundHistory = [
  { date: "2026-03-22", nav: 0.95, accNav: 1.21, changePercent: 1.2 },
  { date: "2026-03-21", nav: 0.94, accNav: 1.2, changePercent: -0.5 },
  { date: "2026-03-20", nav: 0.945, accNav: 1.205, changePercent: 0.3 },
  { date: "2026-03-19", nav: 0.942, accNav: 1.202, changePercent: 0.1 },
  { date: "2026-03-18", nav: 0.941, accNav: 1.201, changePercent: -0.2 },
];

const fundDetail = {
  code: "161725",
  name: "招商中证白酒指数",
  type: "指数型",
  manager: "张三",
  company: "招商基金",
  establishDate: "2015-05-27",
  scale: "86.5亿",
  holdings: [
    { stockCode: "600519", stockName: "贵州茅台", holdPercent: 12.5, holdAmount: 1234, holdMarketValue: 56789 },
    { stockCode: "000858", stockName: "五粮液", holdPercent: 10.2, holdAmount: 888, holdMarketValue: 34567 },
  ],
  holdingPeriod: "2025Q4",
  fees: {
    manageFee: "1.20%",
    trustFee: "0.20%",
    saleFee: "0.40%",
    purchaseFee: "0.15%",
    redeemFee: "0.50%",
    totalOperationFee: "1.80%",
  },
  benchmark: "中证白酒指数",
  performanceYTD: "+8.20%",
  performance1Y: "+12.35%",
  performance3Y: "+18.90%",
};

function json(route: Route, body: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: "application/json; charset=utf-8",
    body: JSON.stringify(body),
  });
}

export async function mockAppApi(context: BrowserContext, options: MockAppOptions = {}) {
  let loggedIn = options.startLoggedIn ?? true;

  if (loggedIn) {
    await context.addCookies([
      {
        name: "session",
        value: "mock-session",
        domain: "127.0.0.1",
        path: "/",
        httpOnly: false,
        sameSite: "Lax",
      },
    ]);
  }
  const watchlist = [...(options.initialWatchlist ?? [])];
  const sessions = [...(options.initialSessions ?? [{
    id: "session-1",
    title: "新对话",
    preview: "",
    updatedAt: "2026-03-22T15:00:00.000Z",
  }])];
  const messages = {
    ...(options.initialMessages ?? { "session-1": [] }),
  } as Record<string, ChatMessageRecord[]>;
  const chatReply = options.chatReply ?? "根据当前模拟数据，贵州茅台技术面偏多，但仍要注意仓位控制与风险提示。";

  await context.route("**/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const pathname = url.pathname;
    const method = request.method();

    if (pathname === "/api/auth/login" && method === "POST") {
      loggedIn = true;
      return route.fulfill({
        status: 200,
        contentType: "application/json; charset=utf-8",
        headers: {
          "Set-Cookie": "session=mock-session; Path=/; SameSite=Lax",
        },
        body: JSON.stringify({ success: true, data: mockUser }),
      });
    }

    if (pathname === "/api/auth/me" && method === "GET") {
      if (!loggedIn) return json(route, { success: false, error: "未登录" }, 401);
      return json(route, { success: true, data: mockUser });
    }

    if (pathname === "/api/stocks" && method === "GET") {
      const action = url.searchParams.get("action");
      if (action === "indices") return json(route, { success: true, data: marketIndices });
      if (action === "search") {
        const keyword = url.searchParams.get("keyword") ?? "";
        const data = keyword.includes("茅台") || keyword.includes("600519") ? stockSearchResults : [];
        return json(route, { success: true, data });
      }
      if (action === "quote") return json(route, { success: true, data: stockQuote });
      if (action === "kline") return json(route, { success: true, data: stockKLine });
      if (action === "watchlist-summary") return json(route, { success: true, data: [] });
      return json(route, { error: "Invalid action" }, 400);
    }

    if (pathname === "/api/funds" && method === "GET") {
      const action = url.searchParams.get("action");
      if (action === "search") {
        const keyword = url.searchParams.get("keyword") ?? "";
        const data = keyword.includes("白酒") || keyword.includes("161725") ? fundSearchResults : [];
        return json(route, { success: true, data });
      }
      if (action === "estimate") return json(route, { success: true, data: fundEstimate });
      if (action === "history") return json(route, { success: true, data: fundHistory });
      if (action === "detail") return json(route, { success: true, data: fundDetail });
      if (action === "list") return json(route, { success: true, data: fundSearchResults, total: fundSearchResults.length });
      return json(route, { error: "Invalid action" }, 400);
    }

    if (pathname === "/api/watchlist") {
      if (method === "GET") {
        return json(route, { success: true, data: watchlist });
      }

      if (method === "POST") {
        const body = JSON.parse(request.postData() ?? "{}");
        watchlist.unshift({
          code: body.code,
          name: body.name,
          market: body.market ?? 0,
          type: body.type,
        });
        return json(route, { success: true, data: { id: `${body.userId}-${body.type}-${body.code}` } });
      }

      if (method === "DELETE") {
        const code = url.searchParams.get("code") ?? "";
        const type = url.searchParams.get("type") ?? "stock";
        const index = watchlist.findIndex((item) => item.code === code && item.type === type);
        if (index >= 0) watchlist.splice(index, 1);
        return json(route, { success: true, removed: true });
      }
    }

    if (pathname === "/api/chat/sessions") {
      if (method === "GET") {
        return json(route, { success: true, data: sessions });
      }

      if (method === "POST") {
        const body = JSON.parse(request.postData() ?? "{}");
        const session = {
          id: `session-${sessions.length + 1}`,
          title: body.title || "新对话",
          preview: "",
          updatedAt: "2026-03-22T15:00:00.000Z",
        };
        sessions.unshift(session);
        messages[session.id] = [];
        return json(route, { success: true, data: session });
      }
    }

    if (pathname === "/api/chat/messages" && method === "GET") {
      const sessionId = url.searchParams.get("sessionId") ?? "session-1";
      return json(route, { success: true, data: messages[sessionId] ?? [] });
    }

    if (pathname === "/api/chat" && method === "POST") {
      const body = JSON.parse(request.postData() ?? "{}");
      const sessionId = body.sessionId ?? "session-1";
      const inputMessages = Array.isArray(body.messages) ? body.messages : [];
      const latest = inputMessages[inputMessages.length - 1];
      const userText = typeof latest?.text === "string"
        ? latest.text
        : typeof latest?.content === "string"
          ? latest.content
          : "帮我分析一下";

      const nextMessages = messages[sessionId] ?? [];
      nextMessages.push({ id: `user-${nextMessages.length + 1}`, role: "user", content: userText });
      nextMessages.push({ id: `assistant-${nextMessages.length + 1}`, role: "assistant", content: chatReply });
      messages[sessionId] = nextMessages;

      const session = sessions.find((item) => item.id === sessionId);
      if (session) {
        session.preview = chatReply;
        session.updatedAt = "2026-03-22T15:01:00.000Z";
      }

      return route.fulfill({
        status: 200,
        contentType: "text/plain; charset=utf-8",
        body: chatReply,
      });
    }

    return route.continue();
  });
}
