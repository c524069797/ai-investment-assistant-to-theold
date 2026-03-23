export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, SESSION_COOKIE } from "@/lib/auth";
import { getUserById } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get(SESSION_COOKIE)?.value;
    if (!token) {
      return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });
    }

    const session = verifySessionToken(token);
    if (!session) {
      return NextResponse.json({ success: false, error: "登录已过期" }, { status: 401 });
    }

    const user = await getUserById(session.userId);
    if (!user) {
      return NextResponse.json({ success: false, error: "用户不存在" }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      data: { id: user.id, username: user.username, name: user.name, avatar: user.avatar },
    });
  } catch (error) {
    console.error("[/api/auth/me] Error:", error);
    return NextResponse.json(
      { success: false, error: "验证失败" },
      { status: 500 },
    );
  }
}
