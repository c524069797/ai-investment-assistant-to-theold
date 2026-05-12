export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getAgentCatalog } from "@/lib/agents/workbench";

export async function GET() {
  return NextResponse.json({ success: true, data: getAgentCatalog() });
}
