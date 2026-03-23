import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { getBigVArticles } from "@/lib/db";

export const bigVAnalysisTool = createTool({
  id: "bigv-analysis",
  description: "查询最近三个月收录的大V文章、老师观点、标签和摘要，适合回答‘某某老师今天怎么看’这类问题。",
  inputSchema: z.object({
    query: z.string().describe("老师名、文章关键词、板块关键词，例如‘但斌’、‘白酒’、‘科技’"),
  }),
  execute: async ({ query }) => {
    const articles = await getBigVArticles({ keyword: query, limit: 6 });

    if (!articles.length) {
      return {
        found: false,
        message: `最近三个月内没有找到与“${query}”相关的大V观点`,
      };
    }

    return {
      found: true,
      query,
      items: articles.map((item) => ({
        author: item.author.name,
        authorCategory: item.author.category,
        title: item.title,
        summary: item.summary,
        category: item.primaryCategory,
        tags: item.tags,
        sentiment: item.sentiment,
        publishedAt: item.publishedAt,
      })),
    };
  },
});
