import { investmentAgent } from "@/mastra/agents/investment-agent";
import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";
import { addChatMessage, ensureChatSession, updateChatSessionTitle } from "@/lib/db";

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
  if (raw.includes("model") || raw.includes("channel") || raw.includes("503") || raw.includes("upstream")) {
    return "抱歉，AI 服务当前暂时不可用，可能是模型通道繁忙或上游接口异常。您可以稍后重试，或先使用股票/自选股页面查看实时分析。";
  }
  if (raw.includes("session")) {
    return "抱歉，本次对话会话状态异常，我已经为您保留当前问题。请再发送一次，系统会重新建立对话。";
  }
  return `抱歉，AI 助手这次没有成功响应。错误信息：${raw}`;
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

    if (userContent) {
      await addChatMessage(sessionId, "user", userContent);
      if (chatSession.title === "新对话") {
        await updateChatSessionTitle(sessionId, userContent.slice(0, 20));
      }
    }

    const result = await investmentAgent.stream(coreMessages, {
      maxSteps: 8,
    });

    const encoder = new TextEncoder();
    const reader = result.textStream.getReader();
    let assistantContent = "";

    const byteStream = new ReadableStream({
      async pull(controller) {
        try {
          const { done, value } = await reader.read();
          if (done) {
            if (assistantContent.trim()) {
              await addChatMessage(sessionId, "assistant", assistantContent);
            }
            controller.close();
            return;
          }
          assistantContent += value;
          controller.enqueue(encoder.encode(value));
        } catch (error) {
          const fallback = buildFriendlyChatError(error);
          assistantContent = fallback;
          await addChatMessage(sessionId, "assistant", fallback);
          controller.enqueue(encoder.encode(fallback));
          controller.close();
        }
      },
      cancel() {
        reader.cancel();
      },
    });

    return new Response(byteStream, {
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
