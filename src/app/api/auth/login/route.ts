import { NextRequest, NextResponse } from "next/server";
import { getUserByUsername } from "@/lib/db";
import { createSessionToken, SESSION_COOKIE } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const { username } = await request.json();

    if (!username) {
      return NextResponse.json({ success: false, error: "请选择角色" }, { status: 400 });
    }

    if (username === "guest") {
      return NextResponse.json({ success: false, error: "游客模式已关闭，请选择角色或先注册" }, { status: 400 });
    }

    const user = await getUserByUsername(username);
    if (!user) {
      return NextResponse.json({ success: false, error: "角色不存在" }, { status: 401 });
    }

    const token = createSessionToken(user.id);

    const response = NextResponse.json({
      success: true,
      data: { id: user.id, username: user.username, name: user.name, avatar: user.avatar },
    });

    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("[/api/auth/login] Error:", error);
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { success: false, error: msg },
      { status: 500 },
    );
  }
}
