export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import { runAgent, runAgentBatch } from "@/lib/agents/workbench";

function parseAgentIds(input: unknown) {
  if (Array.isArray(input)) {
    return input.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
  }

  if (typeof input === "string" && input.trim()) {
    return [input.trim()];
  }

  return [];
}

export async function POST(request: NextRequest) {
  try {
    const userId = getSessionUserId(request);
    if (!userId) {
      return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });
    }

    const body = await request.json();
    const agentIds = parseAgentIds(body.agentIds ?? body.agentId);

    if (!agentIds.length) {
      return NextResponse.json({ success: false, error: "缺少 agentId" }, { status: 400 });
    }

    const force = Boolean(body.force);
    const data = agentIds.length === 1
      ? await runAgent(agentIds[0], { userId, force })
      : await runAgentBatch(agentIds, { userId, force });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("[/api/agents/run] Error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Agent 执行失败" },
      { status: 500 },
    );
  }
}
