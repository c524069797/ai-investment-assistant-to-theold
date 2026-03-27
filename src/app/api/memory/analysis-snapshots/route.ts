export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import { createAnalysisSnapshot, listAnalysisSnapshots } from "@/lib/memory/service";

export async function GET(request: NextRequest) {
  try {
    const userId = getSessionUserId(request);
    if (!userId) {
      return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });
    }

    const code = request.nextUrl.searchParams.get("code")?.trim() ?? "";
    const type = request.nextUrl.searchParams.get("type")?.trim() ?? "stock";
    const limit = Number(request.nextUrl.searchParams.get("limit") ?? "10");
    const snapshots = await listAnalysisSnapshots(userId, {
      ...(code ? { code } : {}),
      ...(type ? { type } : {}),
      limit,
    });

    return NextResponse.json({ success: true, data: snapshots });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "加载分析快照失败" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = getSessionUserId(request);
    if (!userId) {
      return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });
    }

    const body = await request.json();
    const snapshot = await createAnalysisSnapshot(userId, body);
    return NextResponse.json({ success: true, data: snapshot });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "保存分析快照失败" },
      { status: 500 },
    );
  }
}
