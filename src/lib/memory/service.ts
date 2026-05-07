import { createHash } from "crypto";
import { prisma } from "@/lib/db";
import { buildChatMemoryContext, findRelevantThesis } from "./context";
import {
  createDefaultUserInvestmentProfile,
  createDefaultWatchlistThesis,
  extractStockCodeFromText,
  normalizeOptionalText,
  normalizeStringList,
  summarizeAssistantText,
  type AnalysisSnapshotData,
  type UserInvestmentProfileData,
  type WatchlistThesisData,
} from "./shared";

// 这是项目里的“轻量记忆层”：
// - profile：用户投资偏好
// - thesis：用户对某只股票/基金的跟踪逻辑
// - snapshot：聊天后沉淀出来的分析摘要
// 聊天接口不会把整库数据都喂给模型，而是按 query 动态挑选最相关的上下文。

function createStableId(prefix: string, ...parts: Array<string | number>) {
  return `${prefix}-${createHash("sha1").update(parts.join("::")).digest("hex").slice(0, 20)}`;
}

function sanitizeUserInvestmentProfile(input: Partial<UserInvestmentProfileData>): UserInvestmentProfileData {
  const defaults = createDefaultUserInvestmentProfile();
  return {
    riskPreference: normalizeOptionalText(input.riskPreference) || defaults.riskPreference,
    investmentStyle: normalizeStringList(input.investmentStyle),
    holdingPeriodPreference: normalizeOptionalText(input.holdingPeriodPreference) || defaults.holdingPeriodPreference,
    preferredEvidence: normalizeStringList(input.preferredEvidence),
    dislikedPatterns: normalizeStringList(input.dislikedPatterns),
    summary: normalizeOptionalText(input.summary),
  };
}

function sanitizeWatchlistThesis(input: Partial<WatchlistThesisData>) {
  const code = normalizeOptionalText(input.code);
  const type = normalizeOptionalText(input.type) || "stock";
  const market = Number.isFinite(input.market) ? Number(input.market) : 1;

  return {
    code,
    market,
    type,
    name: normalizeOptionalText(input.name),
    watchReason: normalizeOptionalText(input.watchReason),
    bullPoints: normalizeStringList(input.bullPoints),
    bearPoints: normalizeStringList(input.bearPoints),
    watchSignals: normalizeStringList(input.watchSignals),
    invalidationConditions: normalizeStringList(input.invalidationConditions),
    lastJudgement: normalizeOptionalText(input.lastJudgement),
  };
}

function sanitizeAnalysisSnapshot(input: AnalysisSnapshotData) {
  return {
    code: normalizeOptionalText(input.code),
    market: typeof input.market === "number" ? input.market : null,
    type: normalizeOptionalText(input.type) || "stock",
    title: normalizeOptionalText(input.title),
    summary: normalizeOptionalText(input.summary),
    bullPoints: normalizeStringList(input.bullPoints),
    bearPoints: normalizeStringList(input.bearPoints),
    keyChange: normalizeOptionalText(input.keyChange),
    confidence: typeof input.confidence === "number" ? input.confidence : null,
    sourceType: normalizeOptionalText(input.sourceType) || "manual",
  };
}

export async function getUserInvestmentProfile(userId: string) {
  const profile = await prisma.userInvestmentProfile.findUnique({
    where: { userId },
  });

  if (!profile) {
    return createDefaultUserInvestmentProfile();
  }

  return {
    riskPreference: profile.riskPreference,
    investmentStyle: profile.investmentStyle,
    holdingPeriodPreference: profile.holdingPeriodPreference ?? "mid-term",
    preferredEvidence: profile.preferredEvidence,
    dislikedPatterns: profile.dislikedPatterns,
    summary: profile.summary ?? "",
    updatedAt: profile.updatedAt,
  };
}

export async function upsertUserInvestmentProfile(userId: string, input: Partial<UserInvestmentProfileData>) {
  const data = sanitizeUserInvestmentProfile(input);
  const existing = await prisma.userInvestmentProfile.findUnique({ where: { userId } });

  if (existing) {
    return prisma.userInvestmentProfile.update({
      where: { userId },
      data,
    });
  }

  return prisma.userInvestmentProfile.create({
    data: {
      id: createStableId("profile", userId),
      userId,
      ...data,
    },
  });
}

export async function listWatchlistTheses(userId: string) {
  return prisma.watchlistThesis.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getWatchlistThesis(userId: string, code: string, type = "stock", market = 1, name = "") {
  const thesis = await prisma.watchlistThesis.findFirst({
    where: { userId, code, type },
  });

  if (!thesis) {
    return createDefaultWatchlistThesis(code, market, name, type);
  }

  return thesis;
}

export async function upsertWatchlistThesis(userId: string, input: Partial<WatchlistThesisData>) {
  const data = sanitizeWatchlistThesis(input);
  if (!data.code) {
    throw new Error("code is required");
  }

  const existing = await prisma.watchlistThesis.findFirst({
    where: { userId, code: data.code, type: data.type },
  });

  if (existing) {
    return prisma.watchlistThesis.update({
      where: { id: existing.id },
      data,
    });
  }

  return prisma.watchlistThesis.create({
    data: {
      id: createStableId("thesis", userId, data.type, data.code),
      userId,
      ...data,
    },
  });
}

export async function listAnalysisSnapshots(
  userId: string,
  options?: { code?: string; type?: string; limit?: number },
) {
  const limit = Math.min(options?.limit ?? 10, 20);
  return prisma.analysisSnapshot.findMany({
    where: {
      userId,
      ...(options?.code ? { code: options.code } : {}),
      ...(options?.type ? { type: options.type } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function createAnalysisSnapshot(userId: string, input: AnalysisSnapshotData) {
  const data = sanitizeAnalysisSnapshot(input);
  if (!data.title || !data.summary) {
    throw new Error("title and summary are required");
  }

  return prisma.analysisSnapshot.create({
    data: {
      id: createStableId("snapshot", userId, data.code || data.title, Date.now(), Math.random()),
      userId,
      ...data,
      keyChange: data.keyChange || null,
    },
  });
}

export async function saveChatAnalysisSnapshot(params: {
  userId: string;
  userContent: string;
  assistantContent: string;
  matchedThesis?: { code: string; market?: number | null; type?: string; name?: string | null } | null;
}) {
  // 这是“对话 -> 结构化记忆”的落盘入口。
  const code = params.matchedThesis?.code || extractStockCodeFromText(params.userContent);
  if (!code) {
    return null;
  }

  const summary = summarizeAssistantText(params.assistantContent, 200);
  if (!summary || summary.startsWith("抱歉")) {
    return null;
  }

  const name = params.matchedThesis?.name?.trim() || code;
  return createAnalysisSnapshot(params.userId, {
    code,
    market: params.matchedThesis?.market ?? (code.startsWith("6") ? 1 : 0),
    type: params.matchedThesis?.type ?? "stock",
    title: `${name}聊天分析快照`,
    summary,
    sourceType: "chat",
  });
}

export async function getChatMemoryContext(
  userId: string,
  input: { query: string; code?: string; market?: number },
) {
  // 并行拉取“用户偏好 + 自选 thesis”，减少聊天接口等待时间。
  const [profile, theses] = await Promise.all([
    getUserInvestmentProfile(userId),
    listWatchlistTheses(userId),
  ]);

  const explicitCode = normalizeOptionalText(input.code) || extractStockCodeFromText(input.query);
  const matchedThesis = findRelevantThesis(theses, input.query, explicitCode);
  const recentSnapshots = matchedThesis
    ? await listAnalysisSnapshots(userId, { code: matchedThesis.code, type: matchedThesis.type, limit: 3 })
    : [];

  return {
    profile,
    matchedThesis,
    recentSnapshots,
    context: buildChatMemoryContext({
      query: input.query,
      profile,
      thesis: matchedThesis,
      recentSnapshots,
      fallbackTheses: matchedThesis ? [] : theses.slice(0, 3),
    }),
  };
}
