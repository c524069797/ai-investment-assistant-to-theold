import { NextResponse } from "next/server";
import { getAllUsers, createUser } from "@/lib/db";

export async function GET() {
  const users = getAllUsers();
  return NextResponse.json({ success: true, data: users });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, avatar } = body;
    if (!name) {
      return NextResponse.json({ error: "Missing name" }, { status: 400 });
    }
    const user = createUser(name, avatar ?? "👤");
    return NextResponse.json({ success: true, data: user });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
