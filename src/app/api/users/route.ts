import { NextResponse } from "next/server";
import { getAllUsers } from "@/lib/db";

export async function GET() {
  try {
    const users = await getAllUsers();
    return NextResponse.json({ success: true, data: users });
  } catch (error) {
    console.error("[/api/users] Error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Database error" },
      { status: 500 },
    );
  }
}
