export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getBigVArticles, getBigVFilters, importBigVArticles } from "@/lib/db";

function isAuthorized(request: NextRequest) {
  const token = process.env.BIGV_IMPORT_TOKEN;
  if (!token) {
    return process.env.NODE_ENV !== "production";
  }

  return request.headers.get("x-import-token") === token;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const author = searchParams.get("author")?.trim() ?? "";
    const category = searchParams.get("category")?.trim() ?? "";
    const tag = searchParams.get("tag")?.trim() ?? "";
    const keyword = searchParams.get("keyword")?.trim() ?? "";
    const limit = parseInt(searchParams.get("limit") ?? "30", 10);

    const [articles, filters] = await Promise.all([
      getBigVArticles({
        author: author || undefined,
        category: category || undefined,
        tag: tag || undefined,
        keyword: keyword || undefined,
        limit,
      }),
      getBigVFilters(),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        filters,
        articles,
      },
    });
  } catch (error) {
    console.error("[/api/bigv] GET Error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "获取大V分析失败" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json({ success: false, error: "未授权的导入请求" }, { status: 401 });
    }

    const body = await request.json();
    const articles = Array.isArray(body.articles) ? body.articles : [];

    if (!articles.length) {
      return NextResponse.json({ success: false, error: "articles 不能为空" }, { status: 400 });
    }

    const imported = await importBigVArticles(articles);
    return NextResponse.json({ success: true, data: imported });
  } catch (error) {
    console.error("[/api/bigv] POST Error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "导入大V文章失败" },
      { status: 500 },
    );
  }
}
