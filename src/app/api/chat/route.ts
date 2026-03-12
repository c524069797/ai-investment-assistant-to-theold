import { investmentAgent } from "@/mastra/agents/investment-agent";
import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";
import { addChatMessage, getChatSessionById, updateChatSessionTitle } from "@/lib/db";

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

    const chatSession = await getChatSessionById(session.userId, sessionId);
    if (!chatSession) {
      return NextResponse.json({ error: "会话不存在" }, { status: 404 });
    }

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
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
