export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import { getChatMemoryContext } from "@/lib/memory/service";

export async function GET(request: NextRequest) {
  try {
    const userId = getSessionUserId(request);
    if (!userId) {
      return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });
    }

    const query = request.nextUrl.searchParams.get("query")?.trim() ?? "";
    const code = request.nextUrl.searchParams.get("code")?.trim() ?? "";
    const market = Number(request.nextUrl.searchParams.get("market") ?? "1");
    const data = await getChatMemoryContext(userId, { query, code, market });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "加载记忆上下文失败" },
      { status: 500 },
    );
  }
}
