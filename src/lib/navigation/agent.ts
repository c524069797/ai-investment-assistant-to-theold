export interface NavigationPageTarget {
  href: string;
  title: string;
  description: string;
  keywords: string[];
}

export interface NavigationAgentResult {
  href: string;
  title: string;
  description: string;
  reason: string;
  actionType?: "navigate" | "operate";
}

export const NAVIGATION_PAGES: NavigationPageTarget[] = [
  {
    href: "/",
    title: "首页",
    description: "查看投资驾驶舱、市场情绪、热点风向和核心指数。",
    keywords: ["首页", "主页", "主界面", "驾驶舱", "仪表盘", "回首页", "回到首页"],
  },
  {
    href: "/chat",
    title: "AI助手",
    description: "和 AI 对话，分析大盘、个股、自选和老师观点。",
    keywords: ["ai", "AI", "聊天", "对话", "问ai", "问一下", "助手", "分析一下"],
  },
  {
    href: "/watchlist",
    title: "自选",
    description: "查看当前用户的自选股、自选基金和 AI 综合分析。",
    keywords: ["自选", "自选股", "自选基金", "我的自选", "关注列表", "盯盘"],
  },
  {
    href: "/stocks",
    title: "股票",
    description: "搜索股票、查看热门题材和进入个股详情页。",
    keywords: ["股票", "个股", "行情", "查股票", "搜股票", "板块", "题材"],
  },
  {
    href: "/funds",
    title: "基金",
    description: "搜索基金、查看估值和进入基金详情页。",
    keywords: ["基金", "查基金", "搜基金", "买基金", "估值"],
  },
  {
    href: "/strategy",
    title: "策略",
    description: "查看抄底耐力王、热点捕捉者和策略扫描结果。",
    keywords: ["策略", "今日策略", "妈妈模式", "爸爸模式", "热点策略", "抄底"],
  },
  {
    href: "/experts",
    title: "大V观点",
    description: "按老师查看最近观点合集和 AI 解读入口。",
    keywords: ["大v", "老师", "观点", "专家", "洪灏", "但斌", "林园"],
  },
  {
    href: "/education",
    title: "投资学堂",
    description: "从入门到实战的课程列表。",
    keywords: ["学堂", "课程", "教学", "学习", "投资学堂", "新手入门"],
  },
  {
    href: "/login",
    title: "登录",
    description: "选择角色登录系统。",
    keywords: ["登录", "登陆", "切换账号", "账号", "角色"],
  },
  {
    href: "/register",
    title: "注册",
    description: "创建一个新的用户角色。",
    keywords: ["注册", "新建账号", "创建角色", "添加用户"],
  },
]

const HOT_STOCK_TOPICS = ["人工智能", "机器人", "算力", "半导体", "光伏", "券商", "新能源", "数字经济", "医药"];
const KNOWN_EXPERT_NAMES = ["洪灏", "但斌", "林园", "小蓝"];
const TAIL_TRIGGERS = ["搜索", "搜", "查", "查看", "看", "切到", "打开", "进入"];

function resolveStockMarket(code: string) {
  return code.startsWith("6") ? 1 : 0;
}

function scoreNavigationPage(page: NavigationPageTarget, text: string) {
  let score = 0;

  for (const keyword of page.keywords) {
    if (text.includes(keyword.toLowerCase())) {
      score += keyword.length > 2 ? 3 : 2;
    }
  }

  if (text.includes(page.title.toLowerCase())) {
    score += 3;
  }

  return score;
}

function normalizeText(text: string) {
  return text.toLowerCase().replace(/\s+/g, "");
}

function cleanupSegment(segment: string) {
  return segment
    .trim()
    .replace(/^[：:，,、\s]+/, "")
    .replace(/[。！!？?；;].*$/, "")
    .replace(/^(一下|一眼|一下子)/, "")
    .trim();
}

function extractTailSegment(raw: string) {
  let best = "";

  for (const trigger of TAIL_TRIGGERS) {
    const index = raw.lastIndexOf(trigger);
    if (index === -1) {
      continue;
    }

    const segment = cleanupSegment(raw.slice(index + trigger.length));
    if (segment.length > best.length) {
      best = segment;
    }
  }

  return best;
}

function inferCodeNavigation(raw: string): NavigationAgentResult | null {
  const codeMatch = raw.match(/\b\d{6}\b/);
  if (!codeMatch) {
    return null;
  }

  const code = codeMatch[0];
  const text = raw.toLowerCase();
  const mentionsFund = ["基金", "fund"].some((item) => text.includes(item));
  const mentionsStock = ["股票", "个股", "stock", "a股"].some((item) => text.includes(item));

  if (mentionsFund || code.startsWith("1") || code.startsWith("5")) {
    return {
      href: `/funds/${code}`,
      title: `基金 ${code}`,
      description: "直接打开基金详情页。",
      reason: `检测到 6 位基金代码 ${code}`,
      actionType: "operate",
    };
  }

  if (mentionsStock || code.startsWith("0") || code.startsWith("3") || code.startsWith("6")) {
    return {
      href: `/stocks/${code}?market=${resolveStockMarket(code)}`,
      title: `股票 ${code}`,
      description: "直接打开股票详情页。",
      reason: `检测到 6 位股票代码 ${code}`,
      actionType: "operate",
    };
  }

  return null;
}

function resolveWatchlistOperation(raw: string): NavigationAgentResult | null {
  const text = normalizeText(raw);
  if (!text.includes("自选")) {
    return null;
  }

  if (text.includes("第一只股票") || text.includes("第一支股票")) {
    return {
      href: "/watchlist?action=open-first-stock",
      title: "自选首只股票",
      description: "进入自选页并自动打开第一只股票详情。",
      reason: "识别到“自选 + 第一只股票”操作",
      actionType: "operate",
    };
  }

  if (text.includes("第一只基金") || text.includes("第一支基金")) {
    return {
      href: "/watchlist?action=open-first-fund",
      title: "自选首只基金",
      description: "进入自选页并自动打开第一只基金详情。",
      reason: "识别到“自选 + 第一只基金”操作",
      actionType: "operate",
    };
  }

  return null;
}

function resolveStocksOperation(raw: string): NavigationAgentResult | null {
  const text = normalizeText(raw);
  if (!["股票", "个股", "板块", "题材"].some((item) => text.includes(item))) {
    return null;
  }

  const topic = HOT_STOCK_TOPICS.find((item) => raw.includes(item));
  if (topic) {
    return {
      href: `/stocks?topic=${encodeURIComponent(topic)}`,
      title: `股票题材：${topic}`,
      description: "进入股票页并自动切换到对应热门题材。",
      reason: `识别到股票题材关键词 ${topic}`,
      actionType: "operate",
    };
  }

  const keyword = extractTailSegment(raw);
  if (keyword && !["股票页", "股票", "个股", "板块", "题材"].includes(keyword)) {
    return {
      href: `/stocks?keyword=${encodeURIComponent(keyword)}`,
      title: `股票搜索：${keyword}`,
      description: "进入股票页并自动执行关键词搜索。",
      reason: `识别到股票搜索关键词 ${keyword}`,
      actionType: "operate",
    };
  }

  return null;
}

function resolveFundsOperation(raw: string): NavigationAgentResult | null {
  const text = normalizeText(raw);
  if (!text.includes("基金")) {
    return null;
  }

  const keyword = extractTailSegment(raw);
  if (keyword && !["基金页", "基金"].includes(keyword)) {
    return {
      href: `/funds?keyword=${encodeURIComponent(keyword)}`,
      title: `基金搜索：${keyword}`,
      description: "进入基金页并自动执行关键词搜索。",
      reason: `识别到基金搜索关键词 ${keyword}`,
      actionType: "operate",
    };
  }

  return null;
}

function resolveExpertsOperation(raw: string): NavigationAgentResult | null {
  const text = normalizeText(raw);
  if (!["大v", "老师", "观点", "专家"].some((item) => text.includes(item))) {
    return null;
  }

  const expertName = KNOWN_EXPERT_NAMES.find((item) => raw.includes(item));
  if (expertName) {
    return {
      href: `/experts?author=${encodeURIComponent(expertName)}`,
      title: `大V观点：${expertName}`,
      description: "进入大V页面并自动筛选指定老师。",
      reason: `识别到老师名 ${expertName}`,
      actionType: "operate",
    };
  }

  const keyword = extractTailSegment(raw);
  if (keyword && !["老师", "大v", "观点", "专家", "大V页"].includes(keyword)) {
    return {
      href: `/experts?keyword=${encodeURIComponent(keyword)}`,
      title: `大V搜索：${keyword}`,
      description: "进入大V页面并自动执行关键词筛选。",
      reason: `识别到大V搜索关键词 ${keyword}`,
      actionType: "operate",
    };
  }

  return null;
}

export function resolveNavigationIntent(input: string): NavigationAgentResult | null {
  const raw = input.trim();
  if (!raw) {
    return null;
  }

  const codeNavigation = inferCodeNavigation(raw);
  if (codeNavigation) {
    return codeNavigation;
  }

  const pageOperations = [
    resolveWatchlistOperation(raw),
    resolveStocksOperation(raw),
    resolveFundsOperation(raw),
    resolveExpertsOperation(raw),
  ].filter((item): item is NavigationAgentResult => !!item);

  if (pageOperations.length) {
    return pageOperations[0];
  }

  const normalized = normalizeText(raw);
  const scored = NAVIGATION_PAGES
    .map((page) => ({ page, score: scoreNavigationPage(page, normalized) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  const best = scored[0];
  if (!best) {
    return null;
  }

  return {
    href: best.page.href,
    title: best.page.title,
    description: best.page.description,
    reason: `匹配到页面关键词：${best.page.title}`,
    actionType: "navigate",
  };
}

export const NAVIGATION_AGENT_EXAMPLES = [
  "带我去自选股",
  "打开投资学堂",
  "我想看大V观点",
  "去股票页面并搜索人工智能",
  "打开基金 110011",
  "查看 600519",
  "进入自选页后查看第一只股票",
  "打开大V页并切到洪灏",
];
