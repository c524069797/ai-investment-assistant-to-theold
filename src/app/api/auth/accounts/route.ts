export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createUser, getAllUsers } from "@/lib/db";

export async function GET() {
  try {
    const users = await getAllUsers();
    return NextResponse.json({ success: true, data: users });
  } catch (error) {
    console.error("[/api/auth/accounts] Error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Database error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name, avatar } = await request.json();

    if (!name?.trim()) {
      return NextResponse.json({ success: false, error: "请输入称呼" }, { status: 400 });
    }

    if (name.trim().length > 20) {
      return NextResponse.json({ success: false, error: "称呼不能超过20个字" }, { status: 400 });
    }

    const user = await createUser({
      name: name.trim(),
      avatar: avatar?.trim() || "🙂",
    });

    return NextResponse.json({ success: true, data: user });
  } catch (error) {
    console.error("[/api/auth/accounts] Error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Database error" },
      { status: 500 },
    );
  }
}
