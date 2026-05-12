export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import {
  buildFallbackDailyBriefing,
  collectGlobalMarketIntelligence,
  type DailyMarketBriefing,
} from "@/lib/agents/global-market-briefing";
import {
  dailyBriefingCoordinatorAgent,
  financeNewsAnalystAgent,
  globalMarketScoutAgent,
} from "@/mastra/agents/market-briefing-agents";

const cache = new Map<string, { expiresAt: number; data: DailyMarketBriefing }>();

function withTimeout<T>(promise: Promise<T>, ms: number, message: string) {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

function hasModelConfig() {
  return Boolean(process.env.OPENAI_API_KEY);
}

async function runBriefingAgents(context: string) {
  if (!hasModelConfig()) {
    return "";
  }

  const scout = await withTimeout(
    globalMarketScoutAgent.generate([{ role: "user", content: context }], { maxSteps: 2 }),
    12000,
    "global market scout timeout",
  );

  const analyst = await withTimeout(
    financeNewsAnalystAgent.generate([{ role: "user", content: `${context}\n\n市场侦察结果：${scout.text}` }], { maxSteps: 2 }),
    12000,
    "finance news analyst timeout",
  );

  const coordinator = await withTimeout(
    dailyBriefingCoordinatorAgent.generate([
      {
        role: "user",
        content: `请生成登录后展示的全球隔夜市场晨报。\n\n原始数据：${context}\n\n市场侦察 Agent：${scout.text}\n\n财经新闻分析 Agent：${analyst.text}`,
      },
    ], { maxSteps: 2 }),
    12000,
    "daily briefing coordinator timeout",
  );

  return coordinator.text?.trim() ?? "";
}

async function buildBriefing(userId: string, force = false) {
  const intelligence = await collectGlobalMarketIntelligence();
  const cacheKey = `${userId}:${intelligence.targetDate}`;

  if (!force) {
    const cached = cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }
  }

  const context = JSON.stringify({
    targetDate: intelligence.targetDate,
    generatedAt: intelligence.generatedAt,
    quotes: intelligence.quotes,
    headlines: intelligence.headlines,
  });

  let agentText = "";
  try {
    agentText = await runBriefingAgents(context);
  } catch (error) {
    console.error("[/api/agents/daily-briefing] agent orchestration failed", error);
  }

  const briefing = buildFallbackDailyBriefing(intelligence, agentText);
  cache.set(cacheKey, { data: briefing, expiresAt: Date.now() + 10 * 60 * 1000 });
  return briefing;
}

async function handle(request: NextRequest, force = false) {
  const userId = getSessionUserId(request);
  if (!userId) {
    return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });
  }

  const data = await buildBriefing(userId, force);
  return NextResponse.json({ success: true, data });
}

export async function GET(request: NextRequest) {
  return handle(request);
}

export async function POST(request: NextRequest) {
  return handle(request, true);
}
