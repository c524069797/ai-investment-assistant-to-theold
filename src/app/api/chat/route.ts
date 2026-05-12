export const dynamic = "force-dynamic";

import { investmentAgent } from "@/mastra/agents/investment-agent";
import { NextRequest, NextResponse } from "next/server";
import { addChatMessage, ensureChatSession, updateChatSessionTitle } from "@/lib/db";
import { sanitizeAssistantText } from "@/lib/chat/sanitize";
import { fetchMarketIndices } from "@/lib/api/eastmoney";
import { getSessionUserId } from "@/lib/auth/session";
import { getChatMemoryContext, saveChatAnalysisSnapshot } from "@/lib/memory/service";

// 这是 App Router 的 Route Handler。
// 它承担的是“AI 编排层”角色：接收前端 useChat 消息 -> 注入上下文 -> 调 Mastra Agent -> 持久化会话。
// 因为依赖 cookie、数据库、实时行情和大模型结果，所以强制关闭静态化缓存。

interface UIMessagePart {
  type: string;
  text?: string;
}

interface IncomingMessage {
  // 前端传来的 role 在入口先放宽为 string，
  // 后续再通过 convertMessages 收窄成模型真正需要的字面量联合类型。
  role: string;
  content?: string;
  parts?: UIMessagePart[];
}

function extractContent(msg: IncomingMessage): string {
  if (msg.content) return msg.content;
  if (msg.parts) {
    return msg.parts
      .filter((p) => p.type === "text" && p.text)
      .map((p) => p.text)
      .join("");
  }
  return "";
}

function convertMessages(messages: IncomingMessage[]) {
  // 前端 useChat 使用的是 UIMessage 结构，模型调用更适合 role + content 结构，
  // 这里负责做一次“UI 协议 -> LLM 协议”的转换。
  return messages.map((msg) => {
    const content = extractContent(msg);

    // `as const` 的关键作用：
    // 不让 role 被推断成宽泛的 string，而是固定成 "user" | "system" | "assistant" 字面量，
    // 这样后续传给模型 SDK 时，类型才能严格匹配消息协议。
    if (msg.role === "user") return { role: "user" as const, content };
    if (msg.role === "system") return { role: "system" as const, content };
    return { role: "assistant" as const, content };
  });
}

function buildFriendlyChatError(error: unknown) {
  // `unknown` 比 `any` 更安全：必须先做类型收窄，才能访问 message 等属性。
  const raw = error instanceof Error ? error.message : String(error);
  if (raw.includes("未登录")) {
    return "抱歉，当前登录状态已失效，请重新登录后再继续对话。";
  }
  if (raw.includes("timeout") || raw.includes("超时")) {
    return "抱歉，AI 助手本次响应超时了，可能是模型通道繁忙或上游接口卡住。您可以稍后再试，或先查看股票、自选股和大V分析页面。";
  }
  if (raw.includes("Invalid JSON response")) {
    return "抱歉，AI 服务当前返回了异常数据，说明上游模型通道不稳定。您可以稍后重试，或先使用股票、自选股和大V分析页面。";
  }
  if (raw.includes("Invalid token") || raw.includes("invalid token") || raw.includes("401") || raw.includes("unauthorized")) {
    return "抱歉，AI 模型通道认证失败。系统已切换到兼容模型通道配置，请刷新页面后再试；如果仍失败，请重启本地开发服务以加载最新环境变量。";
  }
  if (raw.includes("model") || raw.includes("channel") || raw.includes("503") || raw.includes("upstream")) {
    return "抱歉，AI 服务当前暂时不可用，可能是模型通道繁忙或上游接口异常。您可以稍后重试，或先使用股票/自选股页面查看实时分析。";
  }
  if (raw.includes("session")) {
    return "抱歉，本次对话会话状态异常，我已经为您保留当前问题。请再发送一次，系统会重新建立对话。";
  }
  return `抱歉，AI 助手这次没有成功响应。错误信息：${raw}`;
}

function withTimeout<T>(promise: Promise<T>, ms: number, message: string) {
  // 大模型和外部数据源都可能卡住；统一加超时可以避免前端一直 pending。
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

function normalizeBaseUrl(url?: string) {
  if (!url) {
    return "https://api.siliconflow.cn/v1";
  }
  return url.replace(/\/$/, "");
}

function shouldInjectMarketOverview(text: string) {
  const normalized = text.replace(/\s+/g, "");
  return ["大盘", "A股", "指数", "上证", "深成指", "创业板", "沪深300", "中证500", "盘面", "市场强弱", "市场怎么样", "今日行情"].some((keyword) => normalized.includes(keyword));
}

async function buildMarketOverviewContext() {
  // 这是一个很典型的 RAG-lite 做法：
  // 不走向量库，直接把“当前实时大盘数据”作为 system context 注入给模型。
  const indices = await fetchMarketIndices();
  const validIndices = indices.filter((item) => item.price > 0);

  if (!validIndices.length) {
    return "";
  }

  const primaryIndices = ["上证指数", "深证成指", "创业板指", "沪深300", "中证500"]
    .map((name) => validIndices.find((item) => item.name === name))
    // 这是另一个 TS 精髓点：filter 里写类型谓词，
    // 让 `item` 从 `MarketIndex | undefined` 收窄成确定存在的 `MarketIndex`。
    .filter((item): item is NonNullable<typeof item> => !!item);

  const lines = primaryIndices.map((item) => (
    `- ${item.name}：${item.price.toFixed(2)} 点，${item.changePercent > 0 ? "+" : ""}${item.changePercent.toFixed(2)}%，成交额 ${(item.amount / 100000000).toFixed(0)} 亿`
  ));

  return `以下是系统刚获取到的今日 A 股主要指数实时数据，请优先基于这些数据直接回答，不要再让用户重复提供大盘数据：\n${lines.join("\n")}`;
}

const FALLBACK_CHAT_SYSTEM_PROMPT = "你是一位专业、耐心、通俗易懂的中文投资助手，名字叫小智。请用简洁中文回答，避免复杂术语；如果已经拿到系统提供的实时市场数据，就直接用这些数据分析，不要再让用户补充；最后补一句‘投资有风险，入市需谨慎。’";

async function requestOpenAICompatibleChat(messages: ReturnType<typeof convertMessages>) {
  // `ReturnType<typeof convertMessages>` 是很实用的 TS 技巧：
  // 不重复手写消息类型，而是直接复用 convertMessages 的返回值类型，避免类型漂移。
  // 默认先直接请求 OpenAI Compatible 接口，保证基础问答稳定。
  // Mastra Agent 作为增强层，不能影响用户最基本的对话可用性。
  const apiKey = process.env.OPENAI_API_KEY;
  const baseUrl = normalizeBaseUrl(process.env.OPENAI_BASE_URL);
  const models = Array.from(new Set([
    process.env.OPENAI_MODEL,
    process.env.OPENAI_FALLBACK_MODEL,
    "Qwen/Qwen2.5-7B-Instruct",
    "Qwen/Qwen3-8B",
  ].filter(Boolean))) as string[];

  if (!apiKey) {
    throw new Error("fallback missing api key");
  }

  const errors: string[] = [];
  for (const model of models) {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: FALLBACK_CHAT_SYSTEM_PROMPT },
          ...messages,
        ],
        temperature: 0.6,
        stream: false,
      }),
    });

    const json = await response.json();
    const content = json?.choices?.[0]?.message?.content;
    if (response.ok && content) {
      return typeof content === "string" ? content : String(content);
    }
    errors.push(`${model}: ${json?.error?.message || json?.message || response.statusText || "empty response"}`);
  }

  throw new Error(errors.join(" | "));
}

export async function POST(request: NextRequest) {
  try {
    // 第一步：从 httpOnly session cookie 中识别当前用户。
    const userId = getSessionUserId(request);
    if (!userId) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    // 第二步：解析前端 useChat 发送来的消息体。
    const body = await request.json();
    const { messages, sessionId } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "messages is required" }, { status: 400 });
    }
    if (!sessionId || typeof sessionId !== "string") {
      return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
    }

    // 第三步：确保会话存在，聊天记录会落到数据库中。
    const chatSession = await ensureChatSession(userId, sessionId);

    const coreMessages = convertMessages(messages);
    const latestUserMessage = [...messages].reverse().find((msg) => msg.role === "user");
    const userContent = latestUserMessage ? extractContent(latestUserMessage) : "";
    let effectiveMessages = coreMessages;
    let matchedThesis: { code: string; market?: number | null; type?: string; name?: string | null } | null = null;

    if (userContent) {
      await addChatMessage(sessionId, "user", userContent);
      if (chatSession.title === "新对话") {
        await updateChatSessionTitle(sessionId, userContent.slice(0, 20));
      }
    }

    const systemContexts: string[] = [];

    if (userContent) {
      try {
        // 第四步：从“投资偏好 + 自选 thesis + 历史分析快照”中拼接个性化上下文。
        const memoryContext = await getChatMemoryContext(userId, { query: userContent });
        if (memoryContext.context.trim()) {
          systemContexts.push(memoryContext.context);
        }
        matchedThesis = memoryContext.matchedThesis
          ? {
              code: memoryContext.matchedThesis.code,
              market: memoryContext.matchedThesis.market,
              type: memoryContext.matchedThesis.type,
              name: memoryContext.matchedThesis.name,
            }
          : null;
      } catch (error) {
        console.error("[/api/chat] getChatMemoryContext failed", error);
      }
    }

    if (userContent && shouldInjectMarketOverview(userContent)) {
      try {
        // 第五步：如果用户问到大盘，就自动补充实时指数数据，减少“先给我数据”的来回对话。
        const marketContext = await buildMarketOverviewContext();
        if (marketContext) {
          systemContexts.push(marketContext);
        }
      } catch (error) {
        console.error("[/api/chat] buildMarketOverviewContext failed", error);
      }
    }

    if (systemContexts.length) {
      // 最终消息序列 = 系统上下文 + 原始对话消息。
      effectiveMessages = [
        ...systemContexts.map((content) => ({ role: "system" as const, content })),
        ...coreMessages,
      ];
    }

    let assistantContent = "";

    try {
      // 第六步：默认直连模型，优先保证对话稳定和响应速度。
      assistantContent = sanitizeAssistantText(
        await withTimeout(requestOpenAICompatibleChat(effectiveMessages), 20000, "AI direct chat timeout"),
      ).trim();
    } catch (directError) {
      console.error("[/api/chat] direct openai-compatible request failed, try agent fallback", directError);

      try {
        // 第七步：直连失败时再尝试 Mastra Agent 增强层。
        const result = await withTimeout(
          investmentAgent.generate(effectiveMessages, {
            maxSteps: 4,
          }),
          20000,
          "AI agent fallback timeout",
        );
        assistantContent = sanitizeAssistantText(result.text || "").trim();
      } catch (agentError) {
        console.error("[/api/chat] agent fallback failed", agentError);
        assistantContent = buildFriendlyChatError(directError);
      }
    }

    if (!assistantContent) {
      assistantContent = "抱歉，这次没有拿到有效回复，请您稍后再试。";
    }

    // 第八步：持久化 AI 回复，保证历史会话可回看。
    await addChatMessage(sessionId, "assistant", assistantContent);

    if (userContent && assistantContent) {
      try {
        // 第九步：把有效分析沉淀成 snapshot，供后续记忆上下文复用。
        await saveChatAnalysisSnapshot({
          userId,
          userContent,
          assistantContent,
          matchedThesis,
        });
      } catch (error) {
        console.error("[/api/chat] saveChatAnalysisSnapshot failed", error);
      }
    }

    return new Response(assistantContent, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("[/api/chat] Error:", error);
    const fallback = buildFriendlyChatError(error);
    return new Response(fallback, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
      },
    });
  }
}
