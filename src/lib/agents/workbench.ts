import { fetchStockQuote } from "@/lib/api/eastmoney";
import { getBigVArticles, getChatSessions, getWatchlist } from "@/lib/db";
import { buildDailyMarketBriefing } from "@/lib/agents/daily-briefing-service";
import { getCachedOrRun } from "@/lib/agents/runtime";
import type { AgentCatalogItem, AgentDefinition, AgentExecutionContext, AgentRunResult } from "@/lib/agents/types";

interface WatchlistSignal {
  code: string;
  name: string;
  changePercent: number;
  price: number;
  type: string;
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function formatPercent(value: number) {
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function classifyPortfolioRisk(signals: WatchlistSignal[]): AgentRunResult["riskLevel"] {
  if (!signals.length) return "medium";
  const avg = signals.reduce((sum, item) => sum + item.changePercent, 0) / signals.length;
  const weakCount = signals.filter((item) => item.changePercent <= -2).length;
  const strongCount = signals.filter((item) => item.changePercent >= 2).length;

  if (weakCount >= 2 || avg <= -1.2) return "high";
  if (strongCount >= 2 && avg >= 0.8) return "low";
  return "medium";
}

function toCatalogItem(agent: AgentDefinition): AgentCatalogItem {
  const { run: _run, ...catalog } = agent;
  return catalog;
}

async function runDailyBriefingAgent({ userId, force }: AgentExecutionContext): Promise<AgentRunResult> {
  const briefing = await buildDailyMarketBriefing(userId, force);

  return {
    id: "global-market-briefing",
    name: "全球市场晨报 Agent",
    category: "market",
    status: briefing.status === "agent_generated" ? "completed" : "fallback",
    generatedAt: briefing.generatedAt,
    targetDate: briefing.targetDate,
    riskLevel: briefing.riskLevel,
    summary: briefing.executiveSummary,
    sections: [
      { title: "关键脉冲", items: briefing.marketPulse },
      { title: "开盘观察", items: briefing.watchItems },
      { title: "协作 Agent", items: briefing.agents.map((agent) => `${agent.name}：${agent.responsibility}`) },
    ],
    actions: [
      { label: "查看首页晨报", href: "/", variant: "primary" },
      { label: "打开 AI 助手追问", href: "/chat" },
    ],
    metadata: {
      headlineCount: briefing.headlines.length,
      quoteCount: briefing.quotes.length,
    },
    disclosure: briefing.disclosure,
  };
}

async function runWatchlistSentinelAgent({ userId, force }: AgentExecutionContext): Promise<AgentRunResult> {
  const cacheKey = `watchlist-sentinel:${userId}:${todayKey()}`;

  return getCachedOrRun(cacheKey, 5 * 60 * 1000, Boolean(force), async () => {
    const watchlist = await getWatchlist(userId);
    const stockItems = watchlist.filter((item) => item.type === "stock").slice(0, 8);

    const signals = (await Promise.all(
      stockItems.map(async (item) => {
        try {
          const market = item.market ?? (item.code.startsWith("6") ? 1 : 0);
          const quote = await fetchStockQuote(market, item.code);
          return {
            code: item.code,
            name: quote.name,
            changePercent: quote.changePercent,
            price: quote.price,
            type: item.type,
          };
        } catch {
          return null;
        }
      }),
    )).filter((item): item is WatchlistSignal => Boolean(item));

    const strongest = [...signals].sort((a, b) => b.changePercent - a.changePercent)[0];
    const weakest = [...signals].sort((a, b) => a.changePercent - b.changePercent)[0];
    const riskLevel = classifyPortfolioRisk(signals);

    return {
      id: "watchlist-risk-sentinel",
      name: "自选风险巡检 Agent",
      category: "portfolio",
      status: "completed",
      generatedAt: new Date().toISOString(),
      riskLevel,
      summary: signals.length
        ? `已巡检 ${signals.length} 个自选标的。${strongest ? `${strongest.name} 相对最强（${formatPercent(strongest.changePercent)}）` : ""}${weakest ? `，${weakest.name} 当前承压（${formatPercent(weakest.changePercent)}）` : ""}。`
        : "当前没有可巡检的股票自选，建议先建立重点观察池。",
      sections: [
        {
          title: "强弱排序",
          items: signals.length
            ? [...signals].sort((a, b) => b.changePercent - a.changePercent).slice(0, 5).map((item) => `${item.name}（${item.code}）：${formatPercent(item.changePercent)}，现价 ${item.price.toFixed(2)}`)
            : ["暂无股票自选数据。"],
        },
        {
          title: "风险动作",
          items: riskLevel === "high"
            ? ["优先复核跌幅较大的标的是否触发原定风险条件。", "不要在未确认止跌前扩大仓位，先看量能和板块联动。", "把承压标的加入今日重点观察。"]
            : ["保持观察清单，优先跟踪强势标的是否延续。", "检查自选理由是否仍成立，避免只看短线涨跌。", "开盘后关注市场广度和资金方向。"],
        },
      ],
      actions: [
        { label: "打开自选管理", href: "/watchlist", variant: "primary" },
        { label: "管理长期记忆", href: "/memory" },
      ],
      metadata: {
        watchlistCount: watchlist.length,
        inspectedCount: signals.length,
      },
      disclosure: "巡检结果基于当前公开行情和自选列表，仅用于风险观察，不构成买卖建议。",
    };
  });
}

async function runResearchConsensusAgent({ userId, force }: AgentExecutionContext): Promise<AgentRunResult> {
  const cacheKey = `research-consensus:${userId}:${todayKey()}`;

  return getCachedOrRun(cacheKey, 10 * 60 * 1000, Boolean(force), async () => {
    const articles = await getBigVArticles({ limit: 12 });
    const categoryCounts = new Map<string, number>();
    const sentimentCounts = new Map<string, number>();

    for (const article of articles) {
      categoryCounts.set(article.primaryCategory, (categoryCounts.get(article.primaryCategory) ?? 0) + 1);
      sentimentCounts.set(article.sentiment, (sentimentCounts.get(article.sentiment) ?? 0) + 1);
    }

    const topCategories = [...categoryCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([name, count]) => `${name}：${count} 条`);

    const topArticles = articles.slice(0, 5).map((article) => `${article.author.name}：${article.title}`);
    const positive = sentimentCounts.get("positive") ?? 0;
    const negative = sentimentCounts.get("negative") ?? 0;
    const riskLevel = negative > positive + 2 ? "high" : positive > negative + 2 ? "low" : "medium";

    return {
      id: "research-consensus-agent",
      name: "观点共识整理 Agent",
      category: "research",
      status: "completed",
      generatedAt: new Date().toISOString(),
      riskLevel,
      summary: articles.length
        ? `已整理最近 ${articles.length} 条观点，当前关注度集中在 ${topCategories[0] ?? "暂无明显方向"}。`
        : "暂未收录可分析的大V观点，系统会在数据同步后自动恢复。",
      sections: [
        { title: "热门方向", items: topCategories.length ? topCategories : ["暂无足够观点数据。"] },
        { title: "重点观点", items: topArticles.length ? topArticles : ["暂无重点观点。"] },
        { title: "情绪结构", items: [`偏多 ${positive} 条，偏谨慎 ${negative} 条，中性 ${sentimentCounts.get("neutral") ?? 0} 条。`] },
      ],
      actions: [
        { label: "查看大V观点", href: "/experts", variant: "primary" },
        { label: "向 AI 追问观点", href: "/chat?starter=research-consensus" },
      ],
      metadata: {
        articleCount: articles.length,
        categoryCount: categoryCounts.size,
      },
      disclosure: "观点共识仅用于信息整理，不代表系统立场，也不构成投资建议。",
    };
  });
}

async function runLearningCoachAgent({ userId, force }: AgentExecutionContext): Promise<AgentRunResult> {
  const cacheKey = `learning-coach:${userId}:${todayKey()}`;

  return getCachedOrRun(cacheKey, 30 * 60 * 1000, Boolean(force), async () => {
    const [watchlist, sessions] = await Promise.all([
      getWatchlist(userId),
      getChatSessions(userId),
    ]);

    const hasStocks = watchlist.some((item) => item.type === "stock");
    const hasFunds = watchlist.some((item) => item.type === "fund");
    const hasChatHistory = sessions.length > 0;

    const learningItems = [
      hasStocks ? "你已经建立了股票自选，建议补齐每只股票的关注原因和风险条件。" : "先从股票查询页选 2-3 个熟悉标的加入自选，建立观察样本。",
      hasFunds ? "基金自选已存在，可以学习基金费用、持仓和净值估算的差异。" : "如果关注稳健配置，可以用基金页学习指数基金和主动基金差异。",
      hasChatHistory ? "已有对话历史，建议把高价值结论保存到记忆中心。" : "可以先问 AI 一个具体问题，让系统建立你的学习上下文。",
    ];

    return {
      id: "learning-coach-agent",
      name: "投资学习教练 Agent",
      category: "education",
      status: "completed",
      generatedAt: new Date().toISOString(),
      riskLevel: "low",
      summary: `根据你的使用进度，系统生成了 ${learningItems.length} 条学习建议，优先补齐“自选理由、风险条件、复盘记录”。`,
      sections: [
        { title: "今日学习路径", items: learningItems },
        {
          title: "建议顺序",
          items: ["先看投资学堂的基础概念。", "再结合自选标的做一轮 AI 问答。", "最后把结论沉淀到记忆中心。"],
        },
      ],
      actions: [
        { label: "打开投资学堂", href: "/education", variant: "primary" },
        { label: "进入记忆中心", href: "/memory" },
      ],
      metadata: {
        watchlistCount: watchlist.length,
        chatSessionCount: sessions.length,
      },
      disclosure: "学习建议用于提升系统使用效率，不构成具体投资建议。",
    };
  });
}

async function runSupportOpsAgent({ userId, force }: AgentExecutionContext): Promise<AgentRunResult> {
  const cacheKey = `support-ops:${userId}:${todayKey()}`;

  return getCachedOrRun(cacheKey, 15 * 60 * 1000, Boolean(force), async () => {
    const [watchlist, sessions] = await Promise.all([
      getWatchlist(userId),
      getChatSessions(userId),
    ]);

    const readiness = [
      watchlist.length ? `自选池已有 ${watchlist.length} 项，可继续做风险巡检。` : "自选池为空，建议先添加股票或基金。",
      sessions.length ? `已有 ${sessions.length} 条对话记录，可继续复盘历史问题。` : "暂无对话记录，建议先建立一个分析会话。",
      "如果遇到页面问题，可以在留言板记录反馈，便于售后和技术支持定位。",
    ];

    return {
      id: "support-ops-agent",
      name: "支持运营助手 Agent",
      category: "support",
      status: "completed",
      generatedAt: new Date().toISOString(),
      riskLevel: "low",
      summary: "已检查当前账号的关键使用状态，并生成下一步操作建议。",
      sections: [
        { title: "账号状态", items: readiness },
        {
          title: "推荐操作",
          items: ["需要行情分析时进入股票/基金页。", "需要个性化结论时进入 AI 助手。", "需要长期沉淀时进入记忆中心。"],
        },
      ],
      actions: [
        { label: "打开留言板", href: "/board", variant: "primary" },
        { label: "查看 AI 助手", href: "/chat" },
      ],
      metadata: {
        watchlistCount: watchlist.length,
        chatSessionCount: sessions.length,
      },
      disclosure: "支持建议用于提升使用体验，不涉及投资判断。",
    };
  });
}

export const AGENT_DEFINITIONS: AgentDefinition[] = [
  {
    id: "global-market-briefing",
    name: "global-market-briefing",
    category: "market",
    title: "全球市场晨报 Agent",
    description: "登录后接收全球前一交易日股市和财经新闻，整理盘前风险与观察点。",
    responsibility: "跨市场数据接收、财经新闻提炼、盘前摘要协调。",
    trigger: "登录后自动触发，也可手动重新生成。",
    cadence: "每日 / 手动",
    requiresLogin: true,
    outputLabel: "盘前晨报",
    run: runDailyBriefingAgent,
  },
  {
    id: "watchlist-risk-sentinel",
    name: "watchlist-risk-sentinel",
    category: "portfolio",
    title: "自选风险巡检 Agent",
    description: "扫描自选股票的当日强弱，标出需要优先关注的风险和机会。",
    responsibility: "自选池巡检、强弱排序、风险动作建议。",
    trigger: "手动运行 / 自选池变化后运行。",
    cadence: "盘中 5 分钟缓存",
    requiresLogin: true,
    outputLabel: "自选巡检",
    run: runWatchlistSentinelAgent,
  },
  {
    id: "research-consensus-agent",
    name: "research-consensus-agent",
    category: "research",
    title: "观点共识整理 Agent",
    description: "整理已收录的大V观点，提炼热门方向、情绪结构和分歧点。",
    responsibility: "观点聚合、标签归类、情绪结构提炼。",
    trigger: "手动运行 / 内容同步后运行。",
    cadence: "10 分钟缓存",
    requiresLogin: true,
    outputLabel: "观点共识",
    run: runResearchConsensusAgent,
  },
  {
    id: "learning-coach-agent",
    name: "learning-coach-agent",
    category: "education",
    title: "投资学习教练 Agent",
    description: "根据自选、对话和记忆进度，给出下一步学习路径。",
    responsibility: "学习路径规划、功能引导、知识沉淀建议。",
    trigger: "手动运行 / 新用户引导。",
    cadence: "每日",
    requiresLogin: true,
    outputLabel: "学习建议",
    run: runLearningCoachAgent,
  },
  {
    id: "support-ops-agent",
    name: "support-ops-agent",
    category: "support",
    title: "支持运营助手 Agent",
    description: "帮助用户和支持团队快速判断当前账号下一步应该做什么。",
    responsibility: "账号状态检查、使用路径建议、反馈入口引导。",
    trigger: "手动运行 / 支持排障时运行。",
    cadence: "15 分钟缓存",
    requiresLogin: true,
    outputLabel: "支持建议",
    run: runSupportOpsAgent,
  },
];

export function getAgentCatalog() {
  return AGENT_DEFINITIONS.map(toCatalogItem);
}

export function getAgentDefinition(agentId: string) {
  return AGENT_DEFINITIONS.find((agent) => agent.id === agentId) ?? null;
}

export async function runAgent(agentId: string, context: AgentExecutionContext) {
  const agent = getAgentDefinition(agentId);
  if (!agent) {
    throw new Error(`Unknown agent: ${agentId}`);
  }

  return agent.run(context);
}

export async function runAgentBatch(agentIds: string[], context: AgentExecutionContext) {
  return Promise.all(agentIds.map((agentId) => runAgent(agentId, context)));
}
