import { NextResponse } from "next/server";

// Fixed users - no filesystem dependency for Vercel serverless
const USERS = [
  { id: "dad", name: "爸爸", avatar: "👨", createdAt: "2025-01-01T00:00:00.000Z" },
  { id: "mom", name: "妈妈", avatar: "👩", createdAt: "2025-01-01T00:00:00.000Z" },
];

export async function GET() {
  return NextResponse.json({ success: true, data: USERS });
}
