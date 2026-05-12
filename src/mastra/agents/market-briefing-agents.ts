import { Agent } from "@mastra/core/agent";
import { createOpenAI } from "@ai-sdk/openai";

function normalizeBaseUrl(url?: string) {
  if (!url) return "https://api.siliconflow.cn/v1";
  return url.replace(/\/$/, "");
}

function createModel() {
  const provider = createOpenAI({
    apiKey: process.env.OPENAI_API_KEY!,
    baseURL: normalizeBaseUrl(process.env.OPENAI_BASE_URL),
  });

  return provider.chat(process.env.OPENAI_MODEL || "Qwen/Qwen2.5-7B-Instruct");
}

export const globalMarketScoutAgent = new Agent({
  id: "global-market-scout",
  name: "global-market-scout",
  instructions: `你是全球市场侦察 Agent。你的职责是接收前一交易日全球主要股指、区域市场强弱和跨市场风险线索。

输出要求：
1. 只基于系统提供的数据，不编造不存在的指数或新闻。
2. 先判断美股、欧洲、亚太、港股和A股的相对强弱。
3. 用中文输出，控制在 120 字以内。`,
  model: createModel,
});

export const financeNewsAnalystAgent = new Agent({
  id: "finance-news-analyst",
  name: "finance-news-analyst",
  instructions: `你是财经新闻分析 Agent。你的职责是从前一日全球财经新闻中提炼对A股盘前有价值的信息。

输出要求：
1. 不复述新闻全文，只提炼影响路径。
2. 重点关注利率、美元、科技股、能源、大宗商品、地缘风险和中国资产。
3. 如果新闻源不足，要明确说明信息不足并转为风险观察模式。
4. 用中文输出，控制在 160 字以内。`,
  model: createModel,
});

export const dailyBriefingCoordinatorAgent = new Agent({
  id: "daily-briefing-coordinator",
  name: "daily-briefing-coordinator",
  instructions: `你是晨报协调 Agent。你的职责是合并全球市场侦察和财经新闻分析，输出给售后/技术支持/投研使用者都容易理解的盘前摘要。

输出要求：
1. 中文输出，语气专业、克制、可执行。
2. 包含：一句总览、两个关键影响、一个开盘观察点。
3. 明确风险，不给买卖指令。
4. 控制在 220 字以内。`,
  model: createModel,
});
