import type { NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";

// Route Handler 里读取 cookie 的常用封装。
// 这样 API 层不用关心签名格式，只关心“当前请求是谁”。
export function getSessionUserId(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) {
    return null;
  }

  const session = verifySessionToken(token);
  return session?.userId ?? null;
}
