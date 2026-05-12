export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, SESSION_COOKIE } from "@/lib/auth";
import { getUserById } from "@/lib/db";

function guestResponse(clearSession = false) {
  const response = NextResponse.json({ success: true, data: null, mode: "guest" });

  if (clearSession) {
    response.cookies.set(SESSION_COOKIE, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0,
      path: "/",
    });
  }

  return response;
}

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get(SESSION_COOKIE)?.value;
    if (!token) {
      return guestResponse();
    }

    const session = verifySessionToken(token);
    if (!session) {
      return guestResponse(true);
    }

    const user = await getUserById(session.userId);
    if (!user) {
      return guestResponse(true);
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
