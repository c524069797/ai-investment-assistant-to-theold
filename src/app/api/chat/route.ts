import { mastra } from "@/mastra";
import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const { messages, threadId } = await request.json();

  const agent = mastra.getAgent("investmentAgent");

  const result = await agent.stream(messages, {
    ...(threadId
      ? {
          memory: {
            thread: threadId,
            resource: threadId ?? "default-user",
          },
        }
      : {}),
  });

  return new Response(result.textStream as unknown as ReadableStream, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
