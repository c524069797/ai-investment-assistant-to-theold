import { NextRequest, NextResponse } from "next/server";
import { getWatchlist, addToWatchlist, removeFromWatchlist } from "@/lib/db";

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  }
  const items = getWatchlist(userId);
  return NextResponse.json({ success: true, data: items });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, code, name, market, type } = body;
    if (!userId || !code || !name || !type) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    const record = addToWatchlist(userId, { code, name, market: market ?? 0, type });
    return NextResponse.json({ success: true, data: record });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get("userId");
  const code = request.nextUrl.searchParams.get("code");
  const type = request.nextUrl.searchParams.get("type") as "stock" | "fund";

  if (!userId || !code || !type) {
    return NextResponse.json({ error: "Missing required params" }, { status: 400 });
  }

  const removed = removeFromWatchlist(userId, code, type);
  return NextResponse.json({ success: true, removed });
}
