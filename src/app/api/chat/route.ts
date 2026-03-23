export const dynamic = "force-dynamic";

import { investmentAgent } from "@/mastra/agents/investment-agent";
import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";
import { addChatMessage, ensureChatSession, updateChatSessionTitle } from "@/lib/db";
import { sanitizeAssistantText } from "@/lib/chat/sanitize";
import { fetchMarketIndices } from "@/lib/api/eastmoney";

interface UIMessagePart {
  type: string;
  text?: string;
}

interface IncomingMessage {
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
  return messages.map((msg) => {
    const content = extractContent(msg);
    if (msg.role === "user") return { role: "user" as const, content };
    if (msg.role === "system") return { role: "system" as const, content };
    return { role: "assistant" as const, content };
  });
}

function buildFriendlyChatError(error: unknown) {
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
  if (raw.includes("model") || raw.includes("channel") || raw.includes("503") || raw.includes("upstream")) {
    return "抱歉，AI 服务当前暂时不可用，可能是模型通道繁忙或上游接口异常。您可以稍后重试，或先使用股票/自选股页面查看实时分析。";
  }
  if (raw.includes("session")) {
    return "抱歉，本次对话会话状态异常，我已经为您保留当前问题。请再发送一次，系统会重新建立对话。";
  }
  return `抱歉，AI 助手这次没有成功响应。错误信息：${raw}`;
}

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

function normalizeBaseUrl(url?: string) {
  if (!url) {
    return "https://ai.muapi.cn/v1";
  }
  return url.replace(/\/$/, "");
}

function shouldInjectMarketOverview(text: string) {
  const normalized = text.replace(/\s+/g, "");
  return ["大盘", "A股", "指数", "上证", "深成指", "创业板", "沪深300", "中证500", "盘面", "市场强弱", "市场怎么样", "今日行情"].some((keyword) => normalized.includes(keyword));
}

async function buildMarketOverviewContext() {
  const indices = await fetchMarketIndices();
  const validIndices = indices.filter((item) => item.price > 0);

  if (!validIndices.length) {
    return "";
  }

  const primaryIndices = ["上证指数", "深证成指", "创业板指", "沪深300", "中证500"]
    .map((name) => validIndices.find((item) => item.name === name))
    .filter((item): item is NonNullable<typeof item> => !!item);

  const lines = primaryIndices.map((item) => (
    `- ${item.name}：${item.price.toFixed(2)} 点，${item.changePercent > 0 ? "+" : ""}${item.changePercent.toFixed(2)}%，成交额 ${(item.amount / 100000000).toFixed(0)} 亿`
  ));

  return `以下是系统刚获取到的今日 A 股主要指数实时数据，请优先基于这些数据直接回答，不要再让用户重复提供大盘数据：\n${lines.join("\n")}`;
}

const FALLBACK_CHAT_SYSTEM_PROMPT = "你是一位专业、耐心、通俗易懂的中文投资助手，名字叫小智。请用简洁中文回答，避免复杂术语；如果已经拿到系统提供的实时市场数据，就直接用这些数据分析，不要再让用户补充；最后补一句‘投资有风险，入市需谨慎。’";

async function requestOpenAICompatibleFallback(messages: ReturnType<typeof convertMessages>) {
  const apiKey = process.env.OPENAI_API_KEY;
  const baseUrl = normalizeBaseUrl(process.env.OPENAI_BASE_URL);
  const model = process.env.OPENAI_MODEL || "gpt-5.2";

  if (!apiKey) {
    throw new Error("fallback missing api key");
  }

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

  if (!response.ok || !content) {
    throw new Error(json?.error?.message || json?.message || "fallback empty response");
  }

  return typeof content === "string" ? content : String(content);
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get(SESSION_COOKIE)?.value;
    const session = token ? verifySessionToken(token) : null;
    if (!session) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const body = await request.json();
    const { messages, sessionId } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "messages is required" }, { status: 400 });
    }
    if (!sessionId || typeof sessionId !== "string") {
      return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
    }

    const chatSession = await ensureChatSession(session.userId, sessionId);

    const coreMessages = convertMessages(messages);
    const latestUserMessage = [...messages].reverse().find((msg) => msg.role === "user");
    const userContent = latestUserMessage ? extractContent(latestUserMessage) : "";
    let effectiveMessages = coreMessages;

    if (userContent) {
      await addChatMessage(sessionId, "user", userContent);
      if (chatSession.title === "新对话") {
        await updateChatSessionTitle(sessionId, userContent.slice(0, 20));
      }
    }

    if (userContent && shouldInjectMarketOverview(userContent)) {
      try {
        const marketContext = await buildMarketOverviewContext();
        if (marketContext) {
          effectiveMessages = [{ role: "system", content: marketContext }, ...coreMessages];
        }
      } catch (error) {
        console.error("[/api/chat] buildMarketOverviewContext failed", error);
      }
    }

    let assistantContent = "";

    try {
      const result = await withTimeout(
        investmentAgent.generate(effectiveMessages, {
          maxSteps: 8,
        }),
        20000,
        "AI generate timeout",
      );
      assistantContent = sanitizeAssistantText(result.text || "").trim();
    } catch (error) {
      console.error("[/api/chat] agent generate failed, fallback to direct openai-compatible request", error);
    }

    if (!assistantContent) {
      try {
        assistantContent = sanitizeAssistantText(
          await withTimeout(requestOpenAICompatibleFallback(effectiveMessages), 20000, "AI fallback timeout"),
        ).trim();
      } catch (error) {
        console.error("[/api/chat] direct fallback failed", error);
        assistantContent = buildFriendlyChatError(error);
      }
    }

    if (!assistantContent) {
      assistantContent = "抱歉，这次没有拿到有效回复，请您稍后再试。";
    }

    await addChatMessage(sessionId, "assistant", assistantContent);

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
