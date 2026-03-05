import { NextRequest, NextResponse } from "next/server";
import {
  fetchStockQuote,
  searchStocks,
  fetchStockKLine,
  fetchMarketIndices,
} from "@/lib/api/eastmoney";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const action = searchParams.get("action");

  try {
    switch (action) {
      case "quote": {
        const market = parseInt(searchParams.get("market") ?? "1", 10);
        const code = searchParams.get("code") ?? "";
        if (!code) {
          return NextResponse.json({ error: "Missing code" }, { status: 400 });
        }
        const data = await fetchStockQuote(market, code);
        return NextResponse.json({ success: true, data });
      }

      case "search": {
        const keyword = searchParams.get("keyword") ?? "";
        if (!keyword) {
          return NextResponse.json({ error: "Missing keyword" }, { status: 400 });
        }
        const data = await searchStocks(keyword);
        return NextResponse.json({ success: true, data });
      }

      case "kline": {
        const market = parseInt(searchParams.get("market") ?? "1", 10);
        const code = searchParams.get("code") ?? "";
        const period = (searchParams.get("period") ?? "daily") as "daily" | "weekly" | "monthly";
        const count = parseInt(searchParams.get("count") ?? "120", 10);
        if (!code) {
          return NextResponse.json({ error: "Missing code" }, { status: 400 });
        }
        const data = await fetchStockKLine(market, code, period, count);
        return NextResponse.json({ success: true, data });
      }

      case "indices": {
        const data = await fetchMarketIndices();
        return NextResponse.json({ success: true, data });
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
