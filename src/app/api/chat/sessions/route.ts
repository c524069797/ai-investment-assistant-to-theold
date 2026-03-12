import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";
import { createChatSession, deleteChatSession, getChatSessionById, getChatSessions, updateChatSessionTitle } from "@/lib/db";

function getUserId(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = verifySessionToken(token);
  return session?.userId ?? null;
}

export async function GET(request: NextRequest) {
  try {
    const userId = getUserId(request);
    if (!userId) {
      return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });
    }

    const sessions = await getChatSessions(userId);
    return NextResponse.json({
      success: true,
      data: sessions.map((session) => ({
        id: session.id,
        title: session.title,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        preview: session.messages[0]?.content ?? "",
      })),
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "加载会话失败" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = getUserId(request);
    if (!userId) {
      return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const title = typeof body.title === "string" && body.title.trim() ? body.title.trim() : "新对话";
    const session = await createChatSession(userId, title);
    return NextResponse.json({ success: true, data: session });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "创建会话失败" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const userId = getUserId(request);
    if (!userId) {
      return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });
    }

    const body = await request.json();
    const sessionId = typeof body.sessionId === "string" ? body.sessionId : "";
    const title = typeof body.title === "string" ? body.title.trim() : "";
    if (!sessionId || !title) {
      return NextResponse.json({ success: false, error: "缺少 sessionId 或 title" }, { status: 400 });
    }

    const session = await getChatSessionById(userId, sessionId);
    if (!session) {
      return NextResponse.json({ success: false, error: "会话不存在" }, { status: 404 });
    }

    const updated = await updateChatSessionTitle(sessionId, title);
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "重命名会话失败" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const userId = getUserId(request);
    if (!userId) {
      return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });
    }

    const sessionId = request.nextUrl.searchParams.get("sessionId") ?? "";
    if (!sessionId) {
      return NextResponse.json({ success: false, error: "缺少 sessionId" }, { status: 400 });
    }

    const deleted = await deleteChatSession(userId, sessionId);
    if (!deleted) {
      return NextResponse.json({ success: false, error: "会话不存在" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: true });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "删除会话失败" },
      { status: 500 },
    );
  }
}
