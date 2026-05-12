export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import { buildDailyMarketBriefing } from "@/lib/agents/daily-briefing-service";

async function handle(request: NextRequest, force = false) {
  const userId = getSessionUserId(request);
  if (!userId) {
    return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });
  }

  const data = await buildDailyMarketBriefing(userId, force);
  return NextResponse.json({ success: true, data });
}

export async function GET(request: NextRequest) {
  return handle(request);
}

export async function POST(request: NextRequest) {
  return handle(request, true);
}
