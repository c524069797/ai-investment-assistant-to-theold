import { investmentAgent } from "@/mastra/agents/investment-agent";
import { NextRequest, NextResponse } from "next/server";

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
    const body = await request.json();
    const { messages } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "messages is required" }, { status: 400 });
    }

    const coreMessages = convertMessages(messages);

    const result = await investmentAgent.stream(coreMessages, {
      maxSteps: 8,
    });

    // Pipe the textStream through an encoder to produce bytes for the Response
    const encoder = new TextEncoder();
    const reader = result.textStream.getReader();

    const byteStream = new ReadableStream({
      async pull(controller) {
        const { done, value } = await reader.read();
        if (done) {
          controller.close();
          return;
        }
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
