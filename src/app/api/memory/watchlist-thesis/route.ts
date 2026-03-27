export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import { getWatchlistThesis, listWatchlistTheses, upsertWatchlistThesis } from "@/lib/memory/service";

export async function GET(request: NextRequest) {
  try {
    const userId = getSessionUserId(request);
    if (!userId) {
      return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });
    }

    const code = request.nextUrl.searchParams.get("code")?.trim() ?? "";
    const type = request.nextUrl.searchParams.get("type")?.trim() ?? "stock";
    const market = Number(request.nextUrl.searchParams.get("market") ?? "1");
    const name = request.nextUrl.searchParams.get("name")?.trim() ?? "";

    if (code) {
      const thesis = await getWatchlistThesis(userId, code, type, market, name);
      return NextResponse.json({ success: true, data: thesis });
    }

    const theses = await listWatchlistTheses(userId);
    return NextResponse.json({ success: true, data: theses });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "加载自选逻辑失败" },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const userId = getSessionUserId(request);
    if (!userId) {
      return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });
    }

    const body = await request.json();
    if (!body?.code) {
      return NextResponse.json({ success: false, error: "缺少 code" }, { status: 400 });
    }

    const thesis = await upsertWatchlistThesis(userId, body);
    return NextResponse.json({ success: true, data: thesis });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "保存自选逻辑失败" },
      { status: 500 },
    );
  }
}
