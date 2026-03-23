export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getWatchlist, addToWatchlist, removeFromWatchlist } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get("userId");
    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }
    const items = await getWatchlist(userId);
    return NextResponse.json({ success: true, data: items });
  } catch (error) {
    console.error("[/api/watchlist GET] Error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Database error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, code, type } = body;
    if (!userId || !code || !type) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    const record = await addToWatchlist(userId, { code, type });
    return NextResponse.json({ success: true, data: record });
  } catch (error) {
    console.error("[/api/watchlist POST] Error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Database error" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get("userId");
    const code = request.nextUrl.searchParams.get("code");
    const type = request.nextUrl.searchParams.get("type") as "stock" | "fund";

    if (!userId || !code || !type) {
      return NextResponse.json({ error: "Missing required params" }, { status: 400 });
    }

    const removed = await removeFromWatchlist(userId, code, type);
    return NextResponse.json({ success: true, removed });
  } catch (error) {
    console.error("[/api/watchlist DELETE] Error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Database error" },
      { status: 500 },
    );
  }
}
