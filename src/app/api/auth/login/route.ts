import { NextRequest, NextResponse } from "next/server";
import { getUserByUsername } from "@/lib/db";
import { hashPassword, createSessionToken, SESSION_COOKIE } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ success: false, error: "请输入账号和密码" }, { status: 400 });
    }

    const user = await getUserByUsername(username);
    if (!user) {
      return NextResponse.json({ success: false, error: "账号不存在" }, { status: 401 });
    }

    if (user.passwordHash !== hashPassword(password)) {
      return NextResponse.json({ success: false, error: "密码错误" }, { status: 401 });
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
    return NextResponse.json(
      { success: false, error: "登录失败，请稍后重试" },
      { status: 500 },
    );
  }
}
