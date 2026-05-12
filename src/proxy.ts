import { NextRequest, NextResponse } from "next/server";

// Next.js 16 开始推荐使用 proxy.ts 替代旧的 middleware.ts 命名。
// 页面允许游客浏览；需要用户数据的 API 仍在各自 Route Handler 中校验 session。
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 登录页、注册页、API、静态资源不做页面级跳转拦截。
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon")
  ) {
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  // matcher 决定 proxy 作用范围；这里排除了 Next 内部静态资源。
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
