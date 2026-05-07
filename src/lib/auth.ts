import { createHash, createHmac } from "crypto";

const SECRET = process.env.AUTH_SECRET || "ai-investment-assistant-secret-2025";

// 这里没有引入 NextAuth，而是实现了一个轻量级自定义会话方案：
// 1. 用户 ID + 过期时间序列化为 payload
// 2. 用 HMAC-SHA256 生成签名
// 3. 最终写入 httpOnly cookie，供 proxy / route handler 校验

/** SHA-256 hash password */
export function hashPassword(password: string): string {
  return createHash("sha256").update(password).digest("hex");
}

/** Create a signed session token */
export function createSessionToken(userId: string): string {
  const payload = Buffer.from(
    JSON.stringify({ userId, exp: Date.now() + 30 * 24 * 60 * 60 * 1000 }), // 30 days
  ).toString("base64url");
  const sig = createHmac("sha256", SECRET).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

/** Verify and decode a session token */
export function verifySessionToken(token: string): { userId: string } | null {
  try {
    const [payload, sig] = token.split(".");
    if (!payload || !sig) return null;

    // 只要 payload 被篡改，重新计算出的签名就会不一致。
    const expectedSig = createHmac("sha256", SECRET).update(payload).digest("base64url");
    if (sig !== expectedSig) return null;

    const data = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (data.exp < Date.now()) return null;
    return { userId: data.userId };
  } catch {
    return null;
  }
}

export const SESSION_COOKIE = "session";
