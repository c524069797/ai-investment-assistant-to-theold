import { NextRequest, NextResponse } from "next/server";
import { getUserByUsername } from "@/lib/db";
import { createSessionToken, SESSION_COOKIE } from "@/lib/auth";

// Next.js Route Handler：负责把“角色选择”转换成 session cookie。
// 当前项目走的是轻量登录流：选角色 -> 服务端签发 cookie -> proxy.ts 放行后续页面。
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

    // httpOnly cookie 让前端 JS 不能直接读取 token，
    // 之后页面请求会自动携带 cookie，供 Route Handler / proxy.ts 做服务端鉴权。
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
