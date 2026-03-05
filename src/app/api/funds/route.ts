import { NextRequest, NextResponse } from "next/server";
import {
  fetchFundEstimate,
  searchFunds,
  fetchFundHistoryNav,
  fetchFundList,
} from "@/lib/api/tiantianfund";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const action = searchParams.get("action");

  try {
    switch (action) {
      case "estimate": {
        const code = searchParams.get("code") ?? "";
        if (!code) {
          return NextResponse.json({ error: "Missing code" }, { status: 400 });
        }
        const data = await fetchFundEstimate(code);
        return NextResponse.json({ success: true, data });
      }

      case "search": {
        const keyword = searchParams.get("keyword") ?? "";
        if (!keyword) {
          return NextResponse.json({ error: "Missing keyword" }, { status: 400 });
        }
        const data = await searchFunds(keyword);
        return NextResponse.json({ success: true, data });
      }

      case "history": {
        const code = searchParams.get("code") ?? "";
        const page = parseInt(searchParams.get("page") ?? "1", 10);
        const per = parseInt(searchParams.get("per") ?? "30", 10);
        if (!code) {
          return NextResponse.json({ error: "Missing code" }, { status: 400 });
        }
        const data = await fetchFundHistoryNav(code, page, per);
        return NextResponse.json({ success: true, data });
      }

      case "list": {
        const data = await fetchFundList();
        return NextResponse.json({
          success: true,
          data: data.slice(0, 100),
          total: data.length,
        });
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
