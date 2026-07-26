import {
  buildFallbackDailyBriefing,
  collectGlobalMarketIntelligence,
  type DailyMarketBriefing,
} from "@/lib/agents/global-market-briefing";
import { getCachedOrRun, hasModelConfig, withTimeout } from "@/lib/agents/runtime";
import { resolveServerAiModelConfig, type ResolvedAiModelConfig } from "@/lib/ai/model-config";
import {
  createDailyBriefingCoordinatorAgent,
  createFinanceNewsAnalystAgent,
  createGlobalMarketScoutAgent,
} from "@/mastra/agents/market-briefing-agents";

async function runBriefingAgents(context: string, modelConfig?: ResolvedAiModelConfig) {
  const resolvedConfig = resolveServerAiModelConfig(modelConfig);
  if (!hasModelConfig(resolvedConfig)) {
    return "";
  }

  const globalMarketScoutAgent = createGlobalMarketScoutAgent(resolvedConfig);
  const financeNewsAnalystAgent = createFinanceNewsAnalystAgent(resolvedConfig);
  const dailyBriefingCoordinatorAgent = createDailyBriefingCoordinatorAgent(resolvedConfig);

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

export async function buildDailyMarketBriefing(
  userId: string,
  force = false,
  modelConfig?: ResolvedAiModelConfig,
): Promise<DailyMarketBriefing> {
  const intelligence = await collectGlobalMarketIntelligence();
  const cacheKey = `daily-briefing:${userId}:${intelligence.targetDate}:${modelConfig?.apiKey ? modelConfig.model : "default"}`;

  return getCachedOrRun(cacheKey, 10 * 60 * 1000, force, async () => {
    const context = JSON.stringify({
      targetDate: intelligence.targetDate,
      generatedAt: intelligence.generatedAt,
      quotes: intelligence.quotes,
      headlines: intelligence.headlines,
    });

    let agentText = "";
    try {
      agentText = await runBriefingAgents(context, modelConfig);
    } catch (error) {
      console.error("[daily-briefing-service] agent orchestration failed", error);
    }

    return buildFallbackDailyBriefing(intelligence, agentText);
  });
}
