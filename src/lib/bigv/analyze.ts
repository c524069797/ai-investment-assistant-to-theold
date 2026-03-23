export interface BigVArticleInput {
  authorName: string;
  title: string;
  content: string;
  images?: string[];
  sourceUrl?: string;
  publishedAt?: string | Date;
}

const CATEGORY_RULES = [
  { category: "大盘策略", keywords: ["大盘", "指数", "上证", "深证", "创业板", "情绪", "仓位", "择时"] },
  { category: "科技成长", keywords: ["人工智能", "AI", "算力", "芯片", "半导体", "机器人", "软件", "科技"] },
  { category: "新能源", keywords: ["新能源", "光伏", "储能", "锂电", "风电", "电车", "充电桩"] },
  { category: "消费医药", keywords: ["白酒", "消费", "医药", "医疗", "食品", "零售"] },
  { category: "金融周期", keywords: ["券商", "银行", "保险", "地产", "有色", "煤炭", "钢铁"] },
  { category: "基金配置", keywords: ["基金", "ETF", "定投", "配置", "组合"] },
  { category: "个股观察", keywords: ["个股", "公司", "公告", "业绩", "龙虎榜", "涨停", "回调"] },
];

const TAG_RULES = [
  "AI",
  "机器人",
  "半导体",
  "算力",
  "白酒",
  "新能源",
  "券商",
  "银行",
  "医药",
  "高股息",
  "ETF",
  "基金",
  "仓位",
  "情绪",
  "低吸",
  "趋势",
  "成长",
  "红利",
];

function normalizeText(input: string) {
  return input.replace(/\s+/g, " ").trim();
}

function scoreCategory(text: string, keywords: string[]) {
  return keywords.reduce((sum, keyword) => sum + (text.includes(keyword) ? 1 : 0), 0);
}

function buildSummary(text: string) {
  const cleaned = normalizeText(text).replace(/[\r\n]+/g, " ");
  if (!cleaned) {
    return "暂无内容摘要。";
  }

  const sentences = cleaned
    .split(/(?<=[。！？!?；;])/)
    .map((item) => item.trim())
    .filter(Boolean);

  if (!sentences.length) {
    return `${cleaned.slice(0, 70)}${cleaned.length > 70 ? "..." : ""}`;
  }

  return sentences.slice(0, 2).join("").slice(0, 88);
}

function detectSentiment(text: string) {
  const bullishKeywords = ["看多", "乐观", "机会", "上涨", "突破", "偏强", "主升", "反弹", "加仓"];
  const bearishKeywords = ["看空", "谨慎", "风险", "回调", "下跌", "减仓", "偏弱", "压力", "兑现"];
  const bullish = scoreCategory(text, bullishKeywords);
  const bearish = scoreCategory(text, bearishKeywords);

  if (bullish > bearish) {
    return "bullish" as const;
  }
  if (bearish > bullish) {
    return "bearish" as const;
  }
  return "neutral" as const;
}

export function analyzeBigVArticle(input: BigVArticleInput) {
  const title = normalizeText(input.title);
  const content = normalizeText(input.content);
  const combined = `${title} ${content}`;

  const sortedCategories = CATEGORY_RULES
    .map((item) => ({ ...item, score: scoreCategory(combined, item.keywords) }))
    .sort((a, b) => b.score - a.score);

  const primaryCategory = sortedCategories[0]?.score ? sortedCategories[0].category : "综合研判";
  const tags = TAG_RULES.filter((tag) => combined.includes(tag)).slice(0, 6);
  const sentiment = detectSentiment(combined);
  const summary = buildSummary(content || title);
  const publishedAt = input.publishedAt ? new Date(input.publishedAt) : new Date();
  const expiresAt = new Date(publishedAt);
  expiresAt.setMonth(expiresAt.getMonth() + 3);

  const freshnessDays = Math.max(0, (Date.now() - publishedAt.getTime()) / (24 * 60 * 60 * 1000));
  const freshnessScore = Math.max(0, 40 - freshnessDays * 0.5);
  const contentScore = Math.min(35, Math.round(content.length / 80));
  const tagScore = tags.length * 3;
  const sentimentBonus = sentiment === "bullish" ? 8 : sentiment === "bearish" ? 6 : 4;
  const rankScore = Number((freshnessScore + contentScore + tagScore + sentimentBonus).toFixed(2));
  const score = Math.max(1, Math.round(rankScore));

  return {
    summary,
    primaryCategory,
    tags,
    sentiment,
    score,
    rankScore,
    publishedAt,
    expiresAt,
  };
}
